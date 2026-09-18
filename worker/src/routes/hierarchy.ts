import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { json, readJson, clientIp } from '../lib/http';
import { requireUser, requirePermission } from '../auth';
import { getUserScope, getAccessibleHomecellIds, inClause, assertHomecellAccess } from '../lib/scope';
import { toDateString, nowIso } from '../lib/ids';
import { ApiError } from '../lib/errors';
import { writeAudit } from '../lib/audit';

/**
 * The Sunday that ends the week containing `date` — the cell's reporting
 * boundary. Kept local to the Worker so the server never trusts a client's
 * idea of "this week".
 */
function weekEndingFor(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Postgres-style ISO weekday: Sunday = 7.
  const day = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (7 - day));
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the organisational slice a signed-in user is allowed to see.
 * Row-level filtering happens in SQL so a user never receives data for a
 * branch of the hierarchy their role does not cover.
 */
const hierarchy = new Hono<AppEnv>();

hierarchy.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);

  const homecellFilter = allowed === null ? null : inClause(allowed);

  const cells = await c.env.DB
    .prepare(
      `SELECT h.id, h.name, h.code, h.address, h.meeting_day AS meetingDay, h.meeting_time AS meetingTime,
              h.timezone, h.meeting_link AS meetingLink, h.meeting_platform AS meetingPlatform,
              h.is_active AS isActive,
              h.leader_id AS leaderId, lu.name AS leaderName,
              h.assistant_id AS assistantId, au.name AS assistantName,
              h.provider_id AS providerId, pu.name AS providerName,
              z.id AS zoneId, z.name AS zoneName,
              a.id AS areaId, a.name AS areaName,
              d.id AS districtId, d.name AS districtName,
              (SELECT COUNT(*) FROM users m WHERE m.homecell_id = h.id AND m.status = 'active') AS memberCount
         FROM homecells h
         JOIN zones z     ON z.id = h.zone_id
         JOIN areas a     ON a.id = z.area_id
         JOIN districts d ON d.id = a.district_id
         LEFT JOIN users lu ON lu.id = h.leader_id
         LEFT JOIN users au ON au.id = h.assistant_id
         LEFT JOIN users pu ON pu.id = h.provider_id
        ${homecellFilter ? `WHERE h.id IN ${homecellFilter.sql}` : ''}
        ORDER BY h.name`,
    )
    .bind(...(homecellFilter?.bindings ?? []))
    .all();

  // Zones / areas / districts are derived from the cells the user can reach,
  // which is simpler and safer than a second set of scope rules.
  const zoneIds = [...new Set(cells.results.map((r) => (r as { zoneId: string }).zoneId))];
  const areaIds = [...new Set(cells.results.map((r) => (r as { areaId: string }).areaId))];
  const districtIds = [...new Set(cells.results.map((r) => (r as { districtId: string }).districtId))];

  const [zones, areas, districts] = await Promise.all([
    zoneIds.length
      ? c.env.DB
          .prepare(
            `SELECT z.id, z.name, z.code, z.area_id AS areaId, z.zonal_leader_id AS leaderId,
                    u.name AS leaderName,
                    (SELECT COUNT(*) FROM homecells h WHERE h.zone_id = z.id) AS homecellCount
               FROM zones z LEFT JOIN users u ON u.id = z.zonal_leader_id
              WHERE z.id IN (${zoneIds.map(() => '?').join(',')}) ORDER BY z.name`,
          )
          .bind(...zoneIds)
          .all()
      : Promise.resolve({ results: [] }),
    areaIds.length
      ? c.env.DB
          .prepare(
            `SELECT a.id, a.name, a.code, a.district_id AS districtId,
                    a.coordinator_id AS coordinatorId, u.name AS coordinatorName,
                    (SELECT COUNT(*) FROM zones z WHERE z.area_id = a.id) AS zoneCount
               FROM areas a LEFT JOIN users u ON u.id = a.coordinator_id
              WHERE a.id IN (${areaIds.map(() => '?').join(',')}) ORDER BY a.name`,
          )
          .bind(...areaIds)
          .all()
      : Promise.resolve({ results: [] }),
    districtIds.length
      ? c.env.DB
          .prepare(
            `SELECT d.id, d.name, d.code, d.overseer_id AS overseerId, u.name AS overseerName,
                    (SELECT COUNT(*) FROM areas a WHERE a.district_id = d.id) AS areaCount
               FROM districts d LEFT JOIN users u ON u.id = d.overseer_id
              WHERE d.id IN (${districtIds.map(() => '?').join(',')}) ORDER BY d.name`,
          )
          .bind(...districtIds)
          .all()
      : Promise.resolve({ results: [] }),
  ]);

  return json(
    {
      scope: scope.level,
      homecells: cells.results,
      zones: zones.results,
      areas: areas.results,
      districts: districts.results,
    },
    requestId,
  );
});

/** A single cell with everything a member dashboard needs. */
// ---------------------------------------------------------------------------
// GET /api/hierarchy/overview — real aggregates for an oversight dashboard
//
// Every figure is counted from the database and scoped to the cells this user
// can actually reach. Nothing is estimated, sampled, or carried forward.
// ---------------------------------------------------------------------------
hierarchy.get('/overview', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);

  const today = toDateString();
  const weekEnd = weekEndingFor(new Date());
  const lastWeekEnd = weekEndingFor(new Date(Date.now() - 7 * 86400000));
  const monthStart = `${today.slice(0, 7)}-01`;

  const empty = {
    scope: scope.level,
    homecells: { total: 0, cells: [] as unknown[], silentThisMonth: [] as unknown[] },
    members: { total: 0, active: 0, firstTimers: 0, newThisMonth: 0 },
    attendance: { thisWeek: 0, lastWeek: 0, averageThisWeek: 0 },
    care: { openFollowUps: 0, overdueFollowUps: 0, openPrayerRequests: 0, pendingTestimonies: 0 },
    reports: { submittedThisMonth: 0, approvedThisMonth: 0 },
  };

  const scopeFilter = allowed === null ? null : inClause(allowed);
  const cells = await c.env.DB
    .prepare(
      `SELECT h.id, h.name, h.code FROM homecells h
        ${scopeFilter ? `WHERE h.id IN ${scopeFilter.sql}` : ''}
        ORDER BY h.name`,
    )
    .bind(...(scopeFilter?.bindings ?? []))
    .all<{ id: string; name: string; code: string }>();

  const cellIds = cells.results.map((cell) => cell.id);
  if (cellIds.length === 0) return json(empty, requestId);

  const cellFilter = inClause(cellIds);
  const cellBind = cellFilter.bindings;
  const cellList = cellFilter.sql;

  // Each count is its own statement. Joining them into one query would make
  // the positional bindings impossible to read, and this endpoint is not hot.
  const [members, attendance, care, reports, silent] = await Promise.all([
    c.env.DB
      .prepare(
        `SELECT
           COALESCE(COUNT(*), 0) AS total,
           COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active,
           COALESCE(SUM(CASE WHEN member_status = 'first_timer' THEN 1 ELSE 0 END), 0) AS firstTimers,
           COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS newThisMonth
         FROM users WHERE homecell_id IN ${cellList}`,
      )
      .bind(monthStart, ...cellBind)
      .first<{ total: number; active: number; firstTimers: number; newThisMonth: number }>(),

    c.env.DB
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN meeting_date = ? THEN 1 ELSE 0 END), 0) AS thisWeek,
           COALESCE(SUM(CASE WHEN meeting_date = ? THEN 1 ELSE 0 END), 0) AS lastWeek
         FROM attendance_records
        WHERE homecell_id IN ${cellList} AND status IN ('present','late')`,
      )
      .bind(weekEnd, lastWeekEnd, ...cellBind)
      .first<{ thisWeek: number; lastWeek: number }>(),

    c.env.DB
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM follow_ups
             WHERE homecell_id IN ${cellList} AND status NOT IN ('integrated','cancelled')) AS openFollowUps,
           (SELECT COUNT(*) FROM follow_ups
             WHERE homecell_id IN ${cellList} AND status NOT IN ('integrated','cancelled')
               AND due_date IS NOT NULL AND due_date < ?) AS overdueFollowUps,
           (SELECT COUNT(*) FROM prayer_requests
             WHERE homecell_id IN ${cellList} AND status IN ('open','praying')) AS openPrayerRequests,
           (SELECT COUNT(*) FROM testimonies
             WHERE homecell_id IN ${cellList} AND status = 'pending') AS pendingTestimonies`,
      )
      .bind(...cellBind, ...cellBind, today, ...cellBind, ...cellBind)
      .first<{ openFollowUps: number; overdueFollowUps: number; openPrayerRequests: number; pendingTestimonies: number }>(),

    c.env.DB
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN week_ending >= ? THEN 1 ELSE 0 END), 0) AS submittedThisMonth,
           COALESCE(SUM(CASE WHEN week_ending >= ? AND status = 'approved' THEN 1 ELSE 0 END), 0) AS approvedThisMonth
         FROM weekly_reports WHERE homecell_id IN ${cellList}`,
      )
      .bind(monthStart, monthStart, ...cellBind)
      .first<{ submittedThisMonth: number; approvedThisMonth: number }>(),

    c.env.DB
      .prepare(
        `SELECT h.id, h.name FROM homecells h
          WHERE h.id IN ${cellList}
            AND NOT EXISTS (
              SELECT 1 FROM weekly_reports r WHERE r.homecell_id = h.id AND r.week_ending >= ?
            )
          ORDER BY h.name`,
      )
      .bind(...cellBind, monthStart)
      .all<{ id: string; name: string }>(),
  ]);

  const thisWeek = attendance?.thisWeek ?? 0;
  const lastWeek = attendance?.lastWeek ?? 0;

  return json(
    {
      scope: scope.level,
      homecells: {
        total: cellIds.length,
        cells: cells.results,
        silentThisMonth: silent.results,
      },
      members: {
        total: members?.total ?? 0,
        active: members?.active ?? 0,
        firstTimers: members?.firstTimers ?? 0,
        newThisMonth: members?.newThisMonth ?? 0,
      },
      attendance: {
        thisWeek,
        lastWeek,
        averageThisWeek: Math.round((thisWeek / cellIds.length) * 10) / 10,
      },
      care: {
        openFollowUps: care?.openFollowUps ?? 0,
        overdueFollowUps: care?.overdueFollowUps ?? 0,
        openPrayerRequests: care?.openPrayerRequests ?? 0,
        pendingTestimonies: care?.pendingTestimonies ?? 0,
      },
      reports: {
        submittedThisMonth: reports?.submittedThisMonth ?? 0,
        approvedThisMonth: reports?.approvedThisMonth ?? 0,
      },
    },
    requestId,
  );
});

// ---------------------------------------------------------------------------
// PATCH /api/hierarchy/homecell/:id/meeting — set how the cell meets
//
// Deliberately narrow: a leader changes the schedule, the link, the passcode
// and whether joining is open to the public. Everything here is data, so the
// platform never hard-codes a church's operating decisions.
// ---------------------------------------------------------------------------
hierarchy.patch('/homecell/:id/meeting', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const homecellId = c.req.param('id');

  requirePermission(c, 'manage_homecell_settings');

  const scope = await getUserScope(c.env.DB, user);
  await assertHomecellAccess(c.env.DB, scope, homecellId);

  const body = await readJson<{
    meetingDay?: string | null;
    meetingTime?: string | null;
    timezone?: string;
    meetingLink?: string | null;
    meetingPlatform?: string | null;
    meetingPasscode?: string | null;
    joinInstructions?: string | null;
    publicJoinEnabled?: boolean;
    autoApproveMembers?: boolean;
  }>(c.req.raw);

  const before = await c.env.DB
    .prepare('SELECT * FROM homecells WHERE id = ?')
    .bind(homecellId)
    .first<Record<string, unknown>>();
  if (!before) throw ApiError.notFound('That cell could not be found.');

  const updates: string[] = [];
  const bindings: unknown[] = [];
  const set = (column: string, value: unknown) => {
    updates.push(`${column} = ?`);
    bindings.push(value);
  };

  if (body.meetingDay !== undefined) set('meeting_day', body.meetingDay);
  if (body.meetingTime !== undefined) set('meeting_time', body.meetingTime);
  if (body.timezone !== undefined) set('timezone', body.timezone);
  if (body.meetingPlatform !== undefined) set('meeting_platform', body.meetingPlatform);
  if (body.meetingLink !== undefined) set('meeting_link', body.meetingLink);
  if (body.meetingPasscode !== undefined) set('meeting_passcode', body.meetingPasscode);
  if (body.joinInstructions !== undefined) set('join_instructions', body.joinInstructions);
  if (body.publicJoinEnabled !== undefined) set('public_join_enabled', body.publicJoinEnabled ? 1 : 0);
  if (body.autoApproveMembers !== undefined) set('auto_approve_members', body.autoApproveMembers ? 1 : 0);

  if (updates.length === 0) throw ApiError.validation('Nothing to update.');

  set('updated_at', nowIso());
  await c.env.DB
    .prepare(`UPDATE homecells SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...bindings, homecellId)
    .run();

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'homecell.meeting.update',
    entityType: 'homecell',
    entityId: homecellId,
    homecellId,
    before,
    after: body as Record<string, unknown>,
    ip: clientIp(c.req.raw),
  });

  const after = await c.env.DB
    .prepare('SELECT * FROM homecells WHERE id = ?')
    .bind(homecellId)
    .first<Record<string, unknown>>();

  return json({ homecell: after }, requestId);
});

hierarchy.get('/homecell/:id', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);
  const id = c.req.param('id');

  if (allowed !== null && !allowed.includes(id)) {
    const { ApiError } = await import('../lib/errors');
    throw ApiError.forbidden('You do not have access to this homecell.');
  }

  const cell = await c.env.DB
    .prepare(
      `SELECT h.*, lu.name AS leaderName, au.name AS assistantName, pu.name AS providerName,
              z.name AS zoneName, a.name AS areaName, d.name AS districtName
         FROM homecells h
         JOIN zones z     ON z.id = h.zone_id
         JOIN areas a     ON a.id = z.area_id
         JOIN districts d ON d.id = a.district_id
         LEFT JOIN users lu ON lu.id = h.leader_id
         LEFT JOIN users au ON au.id = h.assistant_id
         LEFT JOIN users pu ON pu.id = h.provider_id
        WHERE h.id = ?`,
    )
    .bind(id)
    .first();

  if (!cell) {
    const { ApiError } = await import('../lib/errors');
    throw ApiError.notFound('Homecell not found.');
  }

  return json({ homecell: cell }, requestId);
});

export default hierarchy;
