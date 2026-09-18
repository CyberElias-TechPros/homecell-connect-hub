import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { json, readJson, clientIp } from '../lib/http';
import { newId, nowIso } from '../lib/ids';
import { parseOrThrow, attendanceMarkSchema } from '../lib/validation';
import { requireUser, requirePermission, resolveHomecellId } from '../auth';
import { getUserScope, getAccessibleHomecellIds, inClause, assertHomecellAccess } from '../lib/scope';
import { writeAudit } from '../lib/audit';
import { isCellLeaderLevel } from '../../../shared/permissions';

const attendance = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// GET /api/attendance — records for a cell within a date range
// ---------------------------------------------------------------------------
attendance.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  requirePermission(c, 'view_attendance');

  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);
  const homecellParam = c.req.query('homecellId');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const meetingDate = c.req.query('meetingDate');

  const where: string[] = [];
  const bindings: unknown[] = [];

  if (allowed !== null) {
    if (allowed.length === 0) return json({ records: [], summary: emptySummary() }, requestId);
    const clause = inClause(allowed);
    where.push(`a.homecell_id IN ${clause.sql}`);
    bindings.push(...clause.bindings);
  }
  if (homecellParam) {
    await assertHomecellAccess(c.env.DB, scope, homecellParam);
    where.push('a.homecell_id = ?');
    bindings.push(homecellParam);
  }
  if (meetingDate) { where.push('a.meeting_date = ?'); bindings.push(meetingDate); }
  if (from) { where.push('a.meeting_date >= ?'); bindings.push(from); }
  if (to) { where.push('a.meeting_date <= ?'); bindings.push(to); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { results } = await c.env.DB
    .prepare(
      `SELECT a.id, a.homecell_id AS homecellId, a.member_id AS memberId,
              a.meeting_date AS meetingDate, a.status, a.is_first_timer AS isFirstTimer,
              a.notes, a.marked_by AS markedBy, a.created_at AS createdAt,
              u.name AS memberName, u.gender
         FROM attendance_records a
         JOIN users u ON u.id = a.member_id
         ${whereSql}
        ORDER BY a.meeting_date DESC, u.name
        LIMIT 2000`,
    )
    .bind(...bindings)
    .all();

  // A member with 'own' scope must only ever see their own records.
  const visible = scope.level === 'own'
    ? (results as { memberId: string }[]).filter((r) => r.memberId === user.id)
    : results;

  return json(
    {
      records: visible.map((r) => ({ ...(r as object), isFirstTimer: (r as { isFirstTimer: number }).isFirstTimer === 1 })),
      summary: summarise(visible as { status: string; isFirstTimer: number; gender?: string | null }[]),
    },
    requestId,
  );
});

// ---------------------------------------------------------------------------
// GET /api/attendance/trend — per-meeting totals for charts
// ---------------------------------------------------------------------------
attendance.get('/trend', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  requirePermission(c, 'view_attendance');

  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);
  if (allowed !== null && allowed.length === 0) return json({ trend: [] }, requestId);

  const homecellParam = c.req.query('homecellId');
  const clause = allowed === null ? null : inClause(allowed);

  const where: string[] = [];
  const bindings: unknown[] = [];
  if (clause) { where.push(`a.homecell_id IN ${clause.sql}`); bindings.push(...clause.bindings); }
  if (homecellParam) { where.push('a.homecell_id = ?'); bindings.push(homecellParam); }

  const { results } = await c.env.DB
    .prepare(
      `SELECT a.meeting_date AS meetingDate,
              SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent,
              SUM(CASE WHEN a.is_first_timer = 1 THEN 1 ELSE 0 END) AS firstTimers,
              COUNT(*) AS total
         FROM attendance_records a
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        GROUP BY a.meeting_date
        ORDER BY a.meeting_date DESC
        LIMIT 52`,
    )
    .bind(...bindings)
    .all();

  return json({ trend: (results as object[]).reverse() }, requestId);
});

// ---------------------------------------------------------------------------
// POST /api/attendance — mark / update attendance in bulk
//
// Idempotent by design: re-submitting the same meeting simply updates the
// existing rows. The UNIQUE(homecell, member, date) constraint makes duplicate
// attendance structurally impossible even under concurrent writes.
// ---------------------------------------------------------------------------
attendance.post('/', async (c) => {
  const requestId = c.get('requestId');
  const actor = requirePermission(c, 'mark_attendance');
  const body = parseOrThrow(attendanceMarkSchema, await readJson(c.req.raw, 256 * 1024));
  const homecellId = resolveHomecellId(c, c.req.query('homecellId'));
  const now = nowIso();

  // Verify every referenced member actually belongs to this cell. Without this
  // check a leader could record attendance against another cell's members.
  const memberIds = body.records.map((r) => r.memberId);
  const uniqueIds = [...new Set(memberIds)];
  if (uniqueIds.length !== memberIds.length) {
    throw ApiError.validation('The same person appears more than once in this submission.');
  }

  const { results: validMembers } = await c.env.DB
    .prepare(`SELECT id FROM users WHERE homecell_id = ? AND id IN (${uniqueIds.map(() => '?').join(',')})`)
    .bind(homecellId, ...uniqueIds)
    .all<{ id: string }>();

  const validSet = new Set(validMembers.map((m) => m.id));
  const invalid = uniqueIds.filter((id) => !validSet.has(id));
  if (invalid.length > 0) {
    throw ApiError.validation('Some people are not members of this cell.', { memberIds: invalid });
  }

  const statements = body.records.map((r) =>
    c.env.DB
      .prepare(
        `INSERT INTO attendance_records
           (id, homecell_id, member_id, meeting_date, status, is_first_timer, notes, marked_by, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(homecell_id, member_id, meeting_date)
         DO UPDATE SET status = excluded.status,
                       notes = excluded.notes,
                       is_first_timer = excluded.is_first_timer,
                       marked_by = excluded.marked_by,
                       updated_at = excluded.updated_at`,
      )
      .bind(
        newId('att'),
        homecellId,
        r.memberId,
        body.meetingDate,
        r.status,
        r.status === 'first_timer' ? 1 : 0,
        r.notes ?? null,
        actor.id,
        now,
        now,
      ),
  );

  await c.env.DB.batch(statements);

  // Absentee detection: anyone who reached the cell's consecutive-absence
  // threshold without an open follow-up gets one, so nobody silently drifts.
  const cell = await c.env.DB
    .prepare('SELECT absence_threshold FROM homecells WHERE id = ?')
    .bind(homecellId)
    .first<{ absence_threshold: number }>();
  const threshold = cell?.absence_threshold ?? 2;

  const { results: streaks } = await c.env.DB
    .prepare(
      `SELECT member_id AS memberId,
              SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absentCount
         FROM (
           SELECT member_id, status,
                  ROW_NUMBER() OVER (PARTITION BY member_id ORDER BY meeting_date DESC) AS rn
             FROM attendance_records
            WHERE homecell_id = ?
         )
        WHERE rn <= ?
        GROUP BY member_id
       HAVING absentCount >= ?`,
    )
    .bind(homecellId, threshold, threshold)
    .all<{ memberId: string; absentCount: number }>();

  let followUpsCreated = 0;
  for (const s of streaks) {
    const existing = await c.env.DB
      .prepare("SELECT id FROM follow_ups WHERE subject_id = ? AND reason = 'absentee' AND status IN ('open','contacted','in_progress','waiting')")
      .bind(s.memberId)
      .first();
    if (existing) continue;

    await c.env.DB
      .prepare(
        `INSERT INTO follow_ups
           (id, homecell_id, subject_id, assigned_to, reason, priority, status, due_date, created_by, notes, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        newId('fu'), homecellId, s.memberId, null, 'absentee', 'high', 'open',
        new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        actor.id,
        `Missed ${s.absentCount} consecutive meetings.`,
        now, now,
      )
      .run();
    followUpsCreated++;
  }

  await writeAudit(c.env.DB, {
    actorId: actor.id,
    action: 'attendance.mark',
    entityType: 'homecell',
    entityId: homecellId,
    homecellId,
    after: { meetingDate: body.meetingDate, count: body.records.length, followUpsCreated },
    ip: clientIp(c.req.raw),
  });

  return json(
    {
      saved: body.records.length,
      meetingDate: body.meetingDate,
      followUpsCreated,
      summary: summarise(body.records.map((r) => ({ status: r.status, isFirstTimer: r.status === 'first_timer' ? 1 : 0 }))),
    },
    requestId,
  );
});

function emptySummary() {
  return { total: 0, present: 0, absent: 0, excused: 0, firstTimers: 0, male: 0, female: 0, rate: 0 };
}

function summarise(records: { status: string; isFirstTimer: number; gender?: string | null }[]) {
  const s = emptySummary();
  s.total = records.length;
  for (const r of records) {
    if (r.status === 'present' || r.status === 'late') s.present++;
    else if (r.status === 'absent') s.absent++;
    else if (r.status === 'excused') s.excused++;
    if (r.isFirstTimer === 1) s.firstTimers++;
    if (r.gender === 'male') s.male++;
    else if (r.gender === 'female') s.female++;
  }
  s.rate = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
  return s;
}

export { isCellLeaderLevel };
export default attendance;
