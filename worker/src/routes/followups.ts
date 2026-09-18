import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { json, readJson, clientIp } from '../lib/http';
import { newId, nowIso } from '../lib/ids';
import { parseOrThrow, followUpCreateSchema, followUpUpdateSchema, followUpNoteSchema } from '../lib/validation';
import { requireUser, requirePermission, resolveHomecellId } from '../auth';
import { getUserScope, getAccessibleHomecellIds, inClause, assertHomecellAccess } from '../lib/scope';
import { writeAudit } from '../lib/audit';
import { isCellLeaderLevel } from '../../../shared/permissions';

/**
 * Follow-up CRM — the retention engine.
 *
 * Most follow-up rows are created automatically (a first-timer registering,
 * or a member crossing the absence threshold). This module is where a leader
 * works them: assign, contact, log an outcome, close.
 */
const followUps = new Hono<AppEnv>();

const SELECT_FIELDS = `
  f.id, f.homecell_id AS homecellId, f.subject_id AS subjectId,
  f.assigned_to AS assignedTo, f.reason, f.priority, f.status,
  f.contact_method AS contactMethod, f.due_date AS dueDate,
  f.completed_at AS completedAt, f.outcome, f.next_action AS nextAction,
  f.notes, f.created_by AS createdBy, f.created_at AS createdAt, f.updated_at AS updatedAt,
  s.name AS subjectName, s.phone AS subjectPhone, s.avatar_url AS subjectAvatar,
  a.name AS assignedToName, h.name AS homecellName,
  CASE WHEN f.due_date IS NOT NULL
        AND f.due_date < date('now')
        AND f.status NOT IN ('completed','cancelled')
       THEN 1 ELSE 0 END AS isOverdue`;

followUps.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  requirePermission(c, 'view_followups');

  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);

  const status = c.req.query('status');
  const assignedTo = c.req.query('assignedTo');
  const reason = c.req.query('reason');
  const overdueOnly = c.req.query('overdue') === 'true';
  const mineOnly = c.req.query('mine') === 'true';

  const where: string[] = [];
  const bindings: unknown[] = [];

  if (allowed !== null) {
    if (allowed.length === 0) return json({ followUps: [], summary: emptySummary() }, requestId);
    const clause = inClause(allowed);
    where.push(`f.homecell_id IN ${clause.sql}`);
    bindings.push(...clause.bindings);
  }
  if (status) { where.push('f.status = ?'); bindings.push(status); }
  if (assignedTo) { where.push('f.assigned_to = ?'); bindings.push(assignedTo); }
  if (mineOnly) { where.push('f.assigned_to = ?'); bindings.push(user.id); }
  if (reason) { where.push('f.reason = ?'); bindings.push(reason); }
  if (overdueOnly) {
    where.push("f.due_date IS NOT NULL AND f.due_date < date('now') AND f.status NOT IN ('completed','cancelled')");
  }

  const { results } = await c.env.DB
    .prepare(
      `SELECT ${SELECT_FIELDS}
         FROM follow_ups f
         JOIN users s ON s.id = f.subject_id
         JOIN homecells h ON h.id = f.homecell_id
         LEFT JOIN users a ON a.id = f.assigned_to
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY
          CASE f.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          CASE WHEN f.status IN ('completed','cancelled') THEN 1 ELSE 0 END,
          COALESCE(f.due_date, '9999-12-31'),
          f.created_at DESC
        LIMIT 300`,
    )
    .bind(...bindings)
    .all();

  const rows = (results as { isOverdue: number; status: string }[]).map((r) => ({ ...r, isOverdue: r.isOverdue === 1 }));

  const summary = {
    total: rows.length,
    open: rows.filter((r) => !['completed', 'cancelled'].includes(r.status)).length,
    overdue: rows.filter((r) => r.isOverdue).length,
    completed: rows.filter((r) => r.status === 'completed').length,
    unassigned: rows.filter((r) => !r.assignedTo && !['completed', 'cancelled'].includes(r.status)).length,
  };

  return json({ followUps: rows, summary }, requestId);
});

/** A leader's daily worklist: what must be contacted today. */
followUps.get('/today', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  requirePermission(c, 'view_followups');

  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);
  if (allowed !== null && allowed.length === 0) return json({ tasks: [] }, requestId);

  const where: string[] = [
    "f.status IN ('open','contacted','in_progress','waiting')",
    "f.due_date IS NOT NULL AND f.due_date <= date('now', '+1 day')",
  ];
  const bindings: unknown[] = [];
  if (allowed !== null) {
    const clause = inClause(allowed);
    where.push(`f.homecell_id IN ${clause.sql}`);
    bindings.push(...clause.bindings);
  }

  const { results } = await c.env.DB
    .prepare(
      `SELECT ${SELECT_FIELDS}
         FROM follow_ups f
         JOIN users s ON s.id = f.subject_id
         JOIN homecells h ON h.id = f.homecell_id
         LEFT JOIN users a ON a.id = f.assigned_to
        WHERE ${where.join(' AND ')}
        ORDER BY COALESCE(f.due_date, '9999-12-31'), 
                 CASE f.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END
        LIMIT 100`,
    )
    .bind(...bindings)
    .all();

  return json({ tasks: (results as { isOverdue: number }[]).map((r) => ({ ...r, isOverdue: r.isOverdue === 1 })) }, requestId);
});

followUps.post('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'manage_followups');
  const body = parseOrThrow(followUpCreateSchema, await readJson(c.req.raw));
  const homecellId = resolveHomecellId(c, c.req.query('homecellId'));
  const now = nowIso();

  const subject = await c.env.DB
    .prepare('SELECT id, homecell_id FROM users WHERE id = ?')
    .bind(body.subjectId)
    .first<{ id: string; homecell_id: string | null }>();
  if (!subject) throw ApiError.notFound('That person could not be found.');
  if (subject.homecell_id !== homecellId) {
    throw ApiError.validation('That person does not belong to this cell.');
  }

  if (body.assignedTo) {
    const assignee = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(body.assignedTo).first();
    if (!assignee) throw ApiError.validation('The person you are assigning to could not be found.');
  }

  // Avoid piling up duplicate open follow-ups of the same kind.
  const duplicate = await c.env.DB
    .prepare("SELECT id FROM follow_ups WHERE subject_id = ? AND reason = ? AND status IN ('open','contacted','in_progress','waiting')")
    .bind(body.subjectId, body.reason)
    .first<{ id: string }>();
  if (duplicate) {
    throw ApiError.conflict('There is already an open follow-up of this kind for that person.', { followUpId: duplicate.id });
  }

  const id = newId('fu');
  await c.env.DB
    .prepare(
      `INSERT INTO follow_ups
         (id, homecell_id, subject_id, assigned_to, reason, priority, status, due_date, notes, created_by, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      id, homecellId, body.subjectId, body.assignedTo ?? null, body.reason, body.priority,
      'open', body.dueDate ?? null, body.notes ?? null, user.id, now, now,
    )
    .run();

  if (body.assignedTo && body.assignedTo !== user.id) {
    await c.env.DB
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, link, severity, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
      )
      .bind(newId('ntf'), body.assignedTo, 'followup_assigned', 'A follow-up has been assigned to you',
            `Please reach out to ${body.reason.replace(/_/g, ' ')}.`, '/followups', 'info', now)
      .run();
  }

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'followup.create',
    entityType: 'follow_up',
    entityId: id,
    homecellId,
    after: { subjectId: body.subjectId, reason: body.reason, assignedTo: body.assignedTo },
    ip: clientIp(c.req.raw),
  });

  return json({ id, ok: true }, requestId, 201);
});

followUps.patch('/:id', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'manage_followups');
  const id = c.req.param('id');
  const body = parseOrThrow(followUpUpdateSchema, await readJson(c.req.raw));

  const existing = await c.env.DB
    .prepare('SELECT id, homecell_id, subject_id, status, assigned_to FROM follow_ups WHERE id = ?')
    .bind(id)
    .first<{ id: string; homecell_id: string; subject_id: string; status: string; assigned_to: string | null }>();
  if (!existing) throw ApiError.notFound('That follow-up could not be found.');

  const scope = await getUserScope(c.env.DB, user);
  await assertHomecellAccess(c.env.DB, scope, existing.homecell_id);

  // Reassignment needs the dedicated permission.
  if (body.assignedTo !== undefined && body.assignedTo !== existing.assigned_to) {
    requirePermission(c, 'assign_followups');
  }

  const now = nowIso();
  const fields: string[] = [];
  const values: unknown[] = [];
  const columnMap: Record<string, string> = {
    status: 'status',
    assignedTo: 'assigned_to',
    priority: 'priority',
    contactMethod: 'contact_method',
    dueDate: 'due_date',
    outcome: 'outcome',
    nextAction: 'next_action',
    notes: 'notes',
  };

  for (const [key, column] of Object.entries(columnMap)) {
    if (key in body && body[key as keyof typeof body] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(body[key as keyof typeof body]);
    }
  }

  if (body.status === 'completed') {
    fields.push('completed_at = ?');
    values.push(now);
  } else if (body.status && body.status !== 'completed') {
    fields.push('completed_at = NULL');
  }

  if (fields.length === 0) return json({ updated: false }, requestId);

  fields.push('updated_at = ?');
  values.push(now, id);

  await c.env.DB.prepare(`UPDATE follow_ups SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  // Completing a follow-up notifies whoever raised it.
  if (body.status === 'completed') {
    const watchers = await c.env.DB
      .prepare('SELECT DISTINCT created_by FROM follow_ups WHERE id = ? AND created_by IS NOT NULL AND created_by != ?')
      .bind(id, user.id)
      .first<{ created_by: string }>();
    if (watchers?.created_by) {
      await c.env.DB
        .prepare(
          `INSERT INTO notifications (id, user_id, type, title, body, link, severity, created_at)
           VALUES (?,?,?,?,?,?,?,?)`,
        )
        .bind(newId('ntf'), watchers.created_by, 'followup_completed', 'A follow-up was completed',
              body.outcome ?? 'The follow-up has been marked complete.', '/followups', 'success', now)
        .run();
    }
  }

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'followup.update',
    entityType: 'follow_up',
    entityId: id,
    homecellId: existing.homecell_id,
    before: { status: existing.status, assignedTo: existing.assigned_to },
    after: { status: body.status, assignedTo: body.assignedTo, outcome: body.outcome },
    ip: clientIp(c.req.raw),
  });

  return json({ updated: true }, requestId);
});

/** Append an interaction note — the running history of a relationship. */
followUps.post('/:id/notes', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'manage_followups');
  const id = c.req.param('id');
  const body = parseOrThrow(followUpNoteSchema, await readJson(c.req.raw));

  const existing = await c.env.DB
    .prepare('SELECT id, homecell_id FROM follow_ups WHERE id = ?')
    .bind(id)
    .first<{ id: string; homecell_id: string }>();
  if (!existing) throw ApiError.notFound('That follow-up could not be found.');

  const scope = await getUserScope(c.env.DB, user);
  await assertHomecellAccess(c.env.DB, scope, existing.homecell_id);

  const now = nowIso();
  const noteId = newId('fun');
  await c.env.DB
    .prepare('INSERT INTO follow_up_notes (id, follow_up_id, author_id, body, outcome, created_at) VALUES (?,?,?,?,?,?)')
    .bind(noteId, id, user.id, body.body, body.outcome ?? null, now)
    .run();

  // Logging a note implies the follow-up has at least been attempted.
  if (body.outcome) {
    await c.env.DB
      .prepare("UPDATE follow_ups SET status = CASE WHEN status = 'open' THEN 'contacted' ELSE status END, updated_at = ? WHERE id = ?")
      .bind(now, id)
      .run();
  }

  return json({ id: noteId, ok: true }, requestId, 201);
});

followUps.get('/:id/notes', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  requirePermission(c, 'view_followups');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare('SELECT homecell_id FROM follow_ups WHERE id = ?').bind(id)
    .first<{ homecell_id: string }>();
  if (!existing) throw ApiError.notFound('That follow-up could not be found.');

  const scope = await getUserScope(c.env.DB, user);
  await assertHomecellAccess(c.env.DB, scope, existing.homecell_id);

  const { results } = await c.env.DB
    .prepare(
      `SELECT n.id, n.body, n.outcome, n.created_at AS createdAt, u.name AS authorName
         FROM follow_up_notes n
         LEFT JOIN users u ON u.id = n.author_id
        WHERE n.follow_up_id = ?
        ORDER BY n.created_at DESC`,
    )
    .bind(id)
    .all();

  return json({ notes: results }, requestId);
});

function emptySummary() {
  return { total: 0, open: 0, overdue: 0, completed: 0, unassigned: 0 };
}

export { isCellLeaderLevel };
export default followUps;
