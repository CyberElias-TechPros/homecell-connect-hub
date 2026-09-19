import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { json, readJson, clientIp } from '../lib/http';
import { newId, nowIso } from '../lib/ids';
import { parseOrThrow, announcementCreateSchema } from '../lib/validation';
import { requireUser, requirePermission } from '../auth';
import { getUserScope, getAccessibleHomecellIds, inClause } from '../lib/scope';
import { writeAudit } from '../lib/audit';
import { isGlobalAdmin } from '../../../shared/permissions';

const announcements = new Hono<AppEnv>();

announcements.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  requirePermission(c, 'view_announcements');

  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);

  // An announcement is visible when it targets the user's cell, their zone,
  // or any wider scope they fall within.
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (allowed === null) {
    conditions.push('1 = 1');
  } else {
    if (allowed.length > 0) {
      const clause = inClause(allowed);
      conditions.push(`a.homecell_id IN ${clause.sql}`);
      bindings.push(...clause.bindings);
    }
    if (scope.zoneId) { conditions.push('a.zone_id = ?'); bindings.push(scope.zoneId); }
    if (scope.areaId) { conditions.push('a.scope = ?'); bindings.push('area'); }
    if (scope.districtId) { conditions.push('a.scope = ?'); bindings.push('district'); }
    conditions.push("a.scope = 'global'");
  }

  const whereSql = conditions.length ? conditions.join(' OR ') : '1 = 0';

  const { results } = await c.env.DB
    .prepare(
      `SELECT a.id, a.title, a.body, a.category, a.priority, a.scope,
              a.homecell_id AS homecellId, a.zone_id AS zoneId,
              a.published_at AS publishedAt, a.expires_at AS expiresAt,
              a.created_at AS createdAt, a.created_by AS createdBy,
              u.name AS authorName,
              (SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id) AS readCount,
              CASE WHEN EXISTS (
                SELECT 1 FROM announcement_reads ar2
                 WHERE ar2.announcement_id = a.id AND ar2.user_id = ?
              ) THEN 1 ELSE 0 END AS isRead
         FROM announcements a
         LEFT JOIN users u ON u.id = a.created_by
        WHERE a.is_published = 1
          AND (a.expires_at IS NULL OR a.expires_at > ?)
          AND (${whereSql})
        ORDER BY
          CASE a.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          a.created_at DESC
        LIMIT 100`,
    )
    .bind(user.id, nowIso(), ...bindings)
    .all();

  return json(
    { announcements: (results as { isRead: number }[]).map((a) => ({ ...a, isRead: a.isRead === 1 })) },
    requestId,
  );
});

announcements.post('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'create_announcements');
  const body = parseOrThrow(announcementCreateSchema, await readJson(c.req.raw));
  const now = nowIso();

  let homecellId: string | null = null;
  let zoneId: string | null = null;

  if (body.scope === 'homecell') {
    homecellId = c.req.query('homecellId') ?? user.homecellId;
    if (!homecellId) throw ApiError.validation('You are not assigned to a homecell.');

    // Only somebody with authority over that cell may post into it.
    const scope = await getUserScope(c.env.DB, user);
    const allowed = await getAccessibleHomecellIds(c.env.DB, scope);
    if (allowed !== null && !allowed.includes(homecellId)) {
      throw ApiError.forbidden('You cannot post announcements for that cell.');
    }
  } else if (body.scope === 'zone') {
    const scope = await getUserScope(c.env.DB, user);
    zoneId = scope.zoneId;
    if (!zoneId) throw ApiError.validation('You are not assigned to a zone.');
  } else if (!isGlobalAdmin(user.role) && !['area', 'district'].includes(user.role)) {
    throw ApiError.forbidden('You cannot post announcements at that scope.');
  }

  const id = newId('ann');
  await c.env.DB
    .prepare(
      `INSERT INTO announcements
         (id, homecell_id, zone_id, scope, title, body, category, priority,
          expires_at, is_published, published_at, created_by, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      id, homecellId, zoneId, body.scope, body.title, body.body,
      body.category ?? null, body.priority, body.expiresAt ?? null,
      1, now, user.id, now, now,
    )
    .run();

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'announcement.create',
    entityType: 'announcement',
    entityId: id,
    homecellId,
    after: { title: body.title, scope: body.scope, priority: body.priority },
    ip: clientIp(c.req.raw),
  });

  return json({ id, ok: true }, requestId, 201);
});

announcements.post('/:id/read', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const id = c.req.param('id');

  const exists = await c.env.DB.prepare('SELECT id FROM announcements WHERE id = ?').bind(id).first();
  if (!exists) throw ApiError.notFound('That announcement could not be found.');

  await c.env.DB
    .prepare(
      `INSERT INTO announcement_reads (announcement_id, user_id, read_at)
       VALUES (?,?,?)
       ON CONFLICT(announcement_id, user_id) DO UPDATE SET read_at = excluded.read_at`,
    )
    .bind(id, user.id, nowIso())
    .run();

  return json({ ok: true }, requestId);
});

announcements.delete('/:id', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'manage_announcements');
  const id = c.req.param('id');

  const row = await c.env.DB.prepare('SELECT id, created_by, homecell_id FROM announcements WHERE id = ?').bind(id)
    .first<{ id: string; created_by: string; homecell_id: string | null }>();
  if (!row) throw ApiError.notFound('That announcement could not be found.');

  if (row.created_by !== user.id && !isGlobalAdmin(user.role)) {
    throw ApiError.forbidden('You can only delete announcements you created.');
  }

  await c.env.DB.prepare('DELETE FROM announcements WHERE id = ?').bind(id).run();
  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'announcement.delete',
    entityType: 'announcement',
    entityId: id,
    homecellId: row.homecell_id,
    ip: clientIp(c.req.raw),
  });

  return json({ ok: true }, requestId);
});

export default announcements;
