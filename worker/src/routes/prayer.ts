import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { json, readJson, clientIp } from '../lib/http';
import { newId, nowIso } from '../lib/ids';
import { parseOrThrow, prayerCreateSchema, prayerUpdateSchema } from '../lib/validation';
import { requireUser, requirePermission } from '../auth';
import { getUserScope, getAccessibleHomecellIds, inClause, assertHomecellAccess } from '../lib/scope';
import { writeAudit } from '../lib/audit';
import { isCellLeaderLevel } from '../../../shared/permissions';

/**
 * Prayer requests.
 *
 * Privacy is enforced in SQL, never in the client:
 *   private     -> visible only to the author
 *   leadership  -> visible to the author and cell leaders
 *   cell        -> visible to everyone in the cell
 *
 * An anonymous request never exposes its author, including to leaders, but
 * the author can still see and manage their own submission.
 */
const prayer = new Hono<AppEnv>();

prayer.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  requirePermission(c, 'view_prayer_requests');

  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);
  const status = c.req.query('status');

  const where: string[] = [];
  const bindings: unknown[] = [];

  if (allowed !== null) {
    if (allowed.length === 0) return json({ prayerRequests: [], summary: emptySummary() }, requestId);
    const clause = inClause(allowed);
    where.push(`p.homecell_id IN ${clause.sql}`);
    bindings.push(...clause.bindings);
  }

  // The visibility rule. A leader sees private + leadership + cell; everybody
  // else sees only cell-wide requests plus their own.
  if (!isCellLeaderLevel(user.role)) {
    where.push("(p.visibility = 'cell' OR p.author_id = ?)");
    bindings.push(user.id);
  }

  if (status) { where.push('p.status = ?'); bindings.push(status); }

  const { results } = await c.env.DB
    .prepare(
      `SELECT p.id, p.homecell_id AS homecellId, p.title, p.body, p.category, p.urgency,
              p.visibility, p.status, p.answered_note AS answeredNote, p.answered_at AS answeredAt,
              p.is_anonymous AS isAnonymous, p.assigned_to AS assignedTo,
              p.created_at AS createdAt, p.updated_at AS updatedAt,
              author.name AS authorName, assignee.name AS assignedToName,
              CASE WHEN p.author_id = ? THEN 1 ELSE 0 END AS isMine
         FROM prayer_requests p
         LEFT JOIN users author   ON author.id = p.author_id
         LEFT JOIN users assignee ON assignee.id = p.assigned_to
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY
          CASE p.urgency WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          p.created_at DESC
        LIMIT 200`,
    )
    .bind(user.id, ...bindings)
    .all();

  const rows = (results as {
    isAnonymous: number; isMine: number; authorName: string | null; authorId?: string;
  }[]).map((r) => ({
    ...r,
    isAnonymous: r.isAnonymous === 1,
    isMine: r.isMine === 1,
    // Never leak the identity behind an anonymous request.
    authorName: r.isAnonymous === 1 ? null : r.authorName,
  }));

  const summary = {
    total: rows.length,
    open: rows.filter((r) => r.status === 'open').length,
    praying: rows.filter((r) => r.status === 'praying').length,
    answered: rows.filter((r) => r.status === 'answered').length,
    urgent: rows.filter((r) => r.urgency === 'urgent' && r.status !== 'answered').length,
  };

  return json({ prayerRequests: rows, summary }, requestId);
});

prayer.post('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const body = parseOrThrow(prayerCreateSchema, await readJson(c.req.raw));

  if (!user.homecellId) {
    throw ApiError.validation('You need to be part of a cell before submitting a prayer request.');
  }

  const now = nowIso();
  const id = newId('pry');

  await c.env.DB
    .prepare(
      `INSERT INTO prayer_requests
         (id, homecell_id, author_id, is_anonymous, title, body, category, urgency, visibility,
          status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      id, user.homecellId, user.id, body.isAnonymous ? 1 : 0,
      body.title ?? null, body.body, body.category ?? null, body.urgency, body.visibility,
      'open', now, now,
    )
    .run();

  // Let the cell's leaders know something needs prayer attention, without
  // putting the request content into a notification body.
  if (body.visibility !== 'private' && body.urgency !== 'low') {
    const { results: leaders } = await c.env.DB
      .prepare("SELECT id FROM users WHERE homecell_id = ? AND role IN ('leader','assistant','provider') AND id != ?")
      .bind(user.homecellId, user.id)
      .all<{ id: string }>();

    for (const leader of leaders) {
      await c.env.DB
        .prepare(
          `INSERT INTO notifications (id, user_id, type, title, body, link, severity, created_at)
           VALUES (?,?,?,?,?,?,?,?)`,
        )
        .bind(
          newId('ntf'), leader.id, 'prayer_request',
          body.urgency === 'urgent' ? 'An urgent prayer request was submitted' : 'A new prayer request was submitted',
          'Open the prayer board to see it.', '/prayer',
          body.urgency === 'urgent' ? 'warning' : 'info', now,
        )
        .run();
    }
  }

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'prayer.create',
    entityType: 'prayer_request',
    entityId: id,
    homecellId: user.homecellId,
    // Deliberately excludes the request body.
    after: { visibility: body.visibility, urgency: body.urgency, isAnonymous: body.isAnonymous },
    ip: clientIp(c.req.raw),
  });

  return json({ id, ok: true }, requestId, 201);
});

prayer.patch('/:id', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const id = c.req.param('id');
  const body = parseOrThrow(prayerUpdateSchema, await readJson(c.req.raw));

  const existing = await c.env.DB
    .prepare('SELECT id, homecell_id, author_id, status, visibility FROM prayer_requests WHERE id = ?')
    .bind(id)
    .first<{ id: string; homecell_id: string; author_id: string | null; status: string; visibility: string }>();

  if (!existing) throw ApiError.notFound('That prayer request could not be found.');

  const isAuthor = existing.author_id === user.id;
  const isLeader = isCellLeaderLevel(user.role);

  // The author may update their own request; leaders may work any request
  // they are allowed to see. Nobody else.
  if (!isAuthor && !isLeader) throw ApiError.forbidden();
  if (!isAuthor) {
    const scope = await getUserScope(c.env.DB, user);
    await assertHomecellAccess(c.env.DB, scope, existing.homecell_id);
    requirePermission(c, 'manage_prayer_requests');
  }

  const now = nowIso();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status); }
  if (body.assignedTo !== undefined) {
    if (!isLeader) throw ApiError.forbidden('Only cell leaders can assign prayer requests.');
    fields.push('assigned_to = ?');
    values.push(body.assignedTo);
  }
  if (body.answeredNote !== undefined) {
    fields.push('answered_note = ?', 'answered_at = ?');
    values.push(body.answeredNote, body.answeredNote ? now : null);
  }

  if (fields.length === 0) return json({ updated: false }, requestId);
  fields.push('updated_at = ?');
  values.push(now, id);

  await c.env.DB.prepare(`UPDATE prayer_requests SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'prayer.update',
    entityType: 'prayer_request',
    entityId: id,
    homecellId: existing.homecell_id,
    before: { status: existing.status },
    after: { status: body.status, assignedTo: body.assignedTo },
    ip: clientIp(c.req.raw),
  });

  return json({ updated: true }, requestId);
});

function emptySummary() {
  return { total: 0, open: 0, praying: 0, answered: 0, urgent: 0 };
}

export default prayer;
