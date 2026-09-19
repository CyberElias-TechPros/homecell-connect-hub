import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { json, readJson, clientIp } from '../lib/http';
import { newId, nowIso } from '../lib/ids';
import { parseOrThrow, reportCreateSchema, reportReviewSchema } from '../lib/validation';
import { requireUser, requirePermission, resolveHomecellId } from '../auth';
import { getUserScope, getAccessibleHomecellIds, inClause, assertHomecellAccess } from '../lib/scope';
import { writeAudit } from '../lib/audit';
import { isGlobalAdmin, atLeastRole } from '../../../shared/permissions';

const reports = new Hono<AppEnv>();

const REPORT_COLUMNS = `
  r.id, r.homecell_id AS homecellId, r.week_ending AS weekEnding, r.meeting_date AS meetingDate,
  r.total_attendance AS totalAttendance, r.male_count AS maleCount, r.female_count AS femaleCount,
  r.adult_count AS adultCount, r.children_count AS childrenCount, r.first_timers AS firstTimers,
  r.new_converts AS newConverts, r.souls_won AS soulsWon, r.offering,
  r.testimonies, r.challenges, r.prayer_points AS prayerPoints,
  r.leader_comments AS leaderComments, r.status,
  r.submitted_by AS submittedBy, r.submitted_at AS submittedAt,
  r.reviewed_by AS reviewedBy, r.reviewed_at AS reviewedAt, r.review_note AS reviewNote,
  r.created_at AS createdAt, r.updated_at AS updatedAt,
  h.name AS homecellName, h.code AS homecellCode,
  su.name AS submittedByName, ru.name AS reviewedByName`;

reports.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  requirePermission(c, 'view_homecell_reports');

  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);
  const homecellParam = c.req.query('homecellId');
  const status = c.req.query('status');
  const limit = Math.min(Number(c.req.query('limit') ?? 100), 500);

  const where: string[] = [];
  const bindings: unknown[] = [];

  if (allowed !== null) {
    if (allowed.length === 0) return json({ reports: [] }, requestId);
    const clause = inClause(allowed);
    where.push(`r.homecell_id IN ${clause.sql}`);
    bindings.push(...clause.bindings);
  }
  if (homecellParam) {
    await assertHomecellAccess(c.env.DB, scope, homecellParam);
    where.push('r.homecell_id = ?');
    bindings.push(homecellParam);
  }
  if (status) { where.push('r.status = ?'); bindings.push(status); }

  const { results } = await c.env.DB
    .prepare(
      `SELECT ${REPORT_COLUMNS}
         FROM weekly_reports r
         JOIN homecells h ON h.id = r.homecell_id
         LEFT JOIN users su ON su.id = r.submitted_by
         LEFT JOIN users ru ON ru.id = r.reviewed_by
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY r.week_ending DESC
        LIMIT ?`,
    )
    .bind(...bindings, limit)
    .all();

  return json({ reports: results }, requestId);
});

/** Pre-fill a report from what actually happened, so leaders type less. */
reports.get('/draft', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  requirePermission(c, 'submit_homecell_reports');
  const homecellId = resolveHomecellId(c, c.req.query('homecellId'));

  const weekEnding = c.req.query('weekEnding') ?? weekEndingFor(new Date());

  const att = await c.env.DB
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) AS present,
         SUM(CASE WHEN a.is_first_timer = 1 THEN 1 ELSE 0 END) AS firstTimers,
         SUM(CASE WHEN u.gender = 'male' THEN 1 ELSE 0 END) AS male,
         SUM(CASE WHEN u.gender = 'female' THEN 1 ELSE 0 END) AS female
       FROM attendance_records a
       JOIN users u ON u.id = a.member_id
       WHERE a.homecell_id = ? AND a.meeting_date > date(?, '-7 days') AND a.meeting_date <= ?`,
    )
    .bind(homecellId, weekEnding, weekEnding)
    .first<{ total: number; present: number; firstTimers: number; male: number; female: number }>();

  const prayer = await c.env.DB
    .prepare("SELECT COUNT(*) AS n FROM prayer_requests WHERE homecell_id = ? AND status != 'closed'")
    .bind(homecellId)
    .first<{ n: number }>();

  const openFollowUps = await c.env.DB
    .prepare("SELECT COUNT(*) AS n FROM follow_ups WHERE homecell_id = ? AND status IN ('open','contacted','in_progress','waiting')")
    .bind(homecellId)
    .first<{ n: number }>();

  return json(
    {
      weekEnding,
      suggested: {
        totalAttendance: att?.present ?? 0,
        maleCount: att?.male ?? 0,
        femaleCount: att?.female ?? 0,
        adultCount: att?.total ?? 0,
        childrenCount: 0,
        firstTimers: att?.firstTimers ?? 0,
        newConverts: 0,
        soulsWon: 0,
      },
      context: {
        prayerRequestsOpen: prayer?.n ?? 0,
        followUpsOpen: openFollowUps?.n ?? 0,
      },
    },
    requestId,
  );
});

reports.post('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'submit_homecell_reports');
  const body = parseOrThrow(reportCreateSchema, await readJson(c.req.raw));
  const homecellId = resolveHomecellId(c, c.req.query('homecellId'));
  const now = nowIso();

  const existing = await c.env.DB
    .prepare('SELECT id, status FROM weekly_reports WHERE homecell_id = ? AND week_ending = ?')
    .bind(homecellId, body.weekEnding)
    .first<{ id: string; status: string }>();

  if (existing && (existing.status === 'approved' || existing.status === 'submitted')) {
    throw ApiError.conflict(
      existing.status === 'approved'
        ? 'That week has already been approved. Ask your zonal leader to reopen it.'
        : 'That week has already been submitted. You can still edit it while it awaits review.',
      { reportId: existing.id, status: existing.status },
    );
  }

  const status = body.submit ? 'submitted' : 'draft';
  const id = existing?.id ?? newId('rep');

  const values = [
    body.meetingDate ?? null,
    body.totalAttendance ?? 0,
    body.maleCount ?? 0,
    body.femaleCount ?? 0,
    body.adultCount ?? 0,
    body.childrenCount ?? 0,
    body.firstTimers ?? 0,
    body.newConverts ?? 0,
    body.soulsWon ?? 0,
    body.offering ?? null,
    body.testimonies ?? null,
    body.challenges ?? null,
    body.prayerPoints ?? null,
    body.leaderComments ?? null,
    status,
    user.id,
    body.submit ? now : null,
  ];

  if (existing) {
    await c.env.DB
      .prepare(
        `UPDATE weekly_reports SET
           meeting_date = ?, total_attendance = ?, male_count = ?, female_count = ?,
           adult_count = ?, children_count = ?, first_timers = ?, new_converts = ?,
           souls_won = ?, offering = ?, testimonies = ?, challenges = ?, prayer_points = ?,
           leader_comments = ?, status = ?, submitted_by = ?, submitted_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(...values, now, id)
      .run();
  } else {
    await c.env.DB
      .prepare(
        `INSERT INTO weekly_reports
           (id, homecell_id, week_ending, meeting_date, total_attendance, male_count, female_count,
            adult_count, children_count, first_timers, new_converts, souls_won, offering,
            testimonies, challenges, prayer_points, leader_comments, status,
            submitted_by, submitted_at, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(id, homecellId, body.weekEnding, ...values.slice(0, 17), now, now)
      .run();
  }

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: body.submit ? 'report.submit' : 'report.save_draft',
    entityType: 'weekly_report',
    entityId: id,
    homecellId,
    after: { weekEnding: body.weekEnding, status },
    ip: clientIp(c.req.raw),
  });

  const saved = await c.env.DB
    .prepare(`SELECT ${REPORT_COLUMNS} FROM weekly_reports r JOIN homecells h ON h.id = r.homecell_id
              LEFT JOIN users su ON su.id = r.submitted_by LEFT JOIN users ru ON ru.id = r.reviewed_by
              WHERE r.id = ?`)
    .bind(id)
    .first();

  return json({ report: saved, status }, requestId, status === 'submitted' ? 201 : 200);
});

/** Approve or reject a submitted report. Requires approval permission. */
reports.patch('/:id/review', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'approve_homecell_reports');
  const id = c.req.param('id');
  const body = parseOrThrow(reportReviewSchema, await readJson(c.req.raw));

  const report = await c.env.DB
    .prepare('SELECT id, homecell_id, status FROM weekly_reports WHERE id = ?')
    .bind(id)
    .first<{ id: string; homecell_id: string; status: string }>();

  if (!report) throw ApiError.notFound('That report could not be found.');

  const scope = await getUserScope(c.env.DB, user);
  await assertHomecellAccess(c.env.DB, scope, report.homecell_id);

  if (report.status !== 'submitted') {
    throw ApiError.conflict(`Only submitted reports can be reviewed (this one is "${report.status}").`);
  }

  // A reviewer must not approve a report for a cell they lead themselves —
  // that would defeat the purpose of review. Global admins are exempt.
  if (!isGlobalAdmin(user.role) && user.homecellId === report.homecell_id && !atLeastRole(user.role, 'area')) {
    throw ApiError.forbidden('You cannot review a report for your own cell.');
  }

  const now = nowIso();
  await c.env.DB
    .prepare('UPDATE weekly_reports SET status = ?, reviewed_by = ?, reviewed_at = ?, review_note = ?, updated_at = ? WHERE id = ?')
    .bind(body.decision, user.id, now, body.note ?? null, now, id)
    .run();

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: `report.${body.decision}`,
    entityType: 'weekly_report',
    entityId: id,
    homecellId: report.homecell_id,
    before: { status: report.status },
    after: { status: body.decision, note: body.note },
    ip: clientIp(c.req.raw),
  });

  return json({ ok: true, status: body.decision }, requestId);
});

function weekEndingFor(d: Date): string {
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() + diff);
  return sunday.toISOString().slice(0, 10);
}

export default reports;
