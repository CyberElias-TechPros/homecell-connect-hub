import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { json, readJson, clientIp } from '../lib/http';
import { newId, nowIso } from '../lib/ids';
import { parseOrThrow, materialCreateSchema } from '../lib/validation';
import { requireUser, requirePermission } from '../auth';
import { getUserScope, getAccessibleHomecellIds, inClause } from '../lib/scope';
import { writeAudit } from '../lib/audit';

/**
 * Study materials.
 *
 * Only links and metadata are stored here. Ministry content must not be
 * re-hosted without authorisation, so official resources are referenced by
 * URL rather than copied into this platform.
 */
const materials = new Hono<AppEnv>();

materials.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  requirePermission(c, 'view_materials');

  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);
  const category = c.req.query('category');
  const search = c.req.query('search')?.trim();

  const where: string[] = ['m.is_published = 1'];
  const bindings: unknown[] = [];

  // A material is visible when it is scoped to one of the cells the user can
  // reach, to their zone, or to everyone (homecell_id IS NULL).
  if (allowed !== null) {
    if (allowed.length === 0 && !scope.zoneId) return json({ materials: [] }, requestId);

    const visible: string[] = ['m.homecell_id IS NULL'];
    if (allowed.length > 0) {
      const clause = inClause(allowed);
      visible.push(`m.homecell_id IN ${clause.sql}`);
      bindings.push(...clause.bindings);
    }
    if (scope.zoneId) {
      visible.push('m.zone_id = ?');
      bindings.push(scope.zoneId);
    }
    where.push(`(${visible.join(' OR ')})`);
  }

  if (category) { where.push('m.category = ?'); bindings.push(category); }
  if (search) { where.push('(m.title LIKE ? OR m.description LIKE ?)'); bindings.push(`%${search}%`, `%${search}%`); }

  const { results } = await c.env.DB
    .prepare(
      `SELECT m.id, m.title, m.description, m.category, m.material_type AS materialType,
              m.url, m.file_key AS fileKey, m.file_size AS fileSize, m.mime_type AS mimeType,
              m.week_ending AS weekEnding, m.published_at AS publishedAt,
              m.created_at AS createdAt, u.name AS authorName,
              CASE WHEN EXISTS (
                SELECT 1 FROM material_acks ma WHERE ma.material_id = m.id AND ma.user_id = ?
              ) THEN 1 ELSE 0 END AS acknowledged
         FROM materials m
         LEFT JOIN users u ON u.id = m.created_by
        WHERE ${where.join(' AND ')}
        ORDER BY m.published_at DESC, m.created_at DESC
        LIMIT 200`,
    )
    .bind(user.id, ...bindings)
    .all();

  return json(
    { materials: (results as { acknowledged: number }[]).map((m) => ({ ...m, acknowledged: m.acknowledged === 1 })) },
    requestId,
  );
});

materials.post('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'upload_materials');
  const body = parseOrThrow(materialCreateSchema, await readJson(c.req.raw));

  if (!body.url) {
    throw ApiError.validation(
      'A link or uploaded file is required. File uploads are added via POST /api/materials/:id/file.',
    );
  }

  const id = newId('mat');
  const now = nowIso();
  const homecellId = c.req.query('homecellId') ?? user.homecellId;

  await c.env.DB
    .prepare(
      `INSERT INTO materials
         (id, homecell_id, title, description, category, material_type, url,
          week_ending, is_published, published_at, created_by, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      id, homecellId, body.title, body.description ?? null, body.category ?? null,
      body.materialType, body.url, body.weekEnding ?? null, 1, now, user.id, now, now,
    )
    .run();

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'material.create',
    entityType: 'material',
    entityId: id,
    homecellId,
    after: { title: body.title, materialType: body.materialType },
    ip: clientIp(c.req.raw),
  });

  return json({ id, ok: true }, requestId, 201);
});

materials.post('/:id/ack', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const id = c.req.param('id');
  const body = await readJson<{ type?: string }>(c.req.raw);

  const exists = await c.env.DB.prepare('SELECT id FROM materials WHERE id = ?').bind(id).first();
  if (!exists) throw ApiError.notFound('That material could not be found.');

  const ackType = body.type === 'downloaded' ? 'downloaded' : 'acknowledged';
  const now = nowIso();

  await c.env.DB
    .prepare(
      `INSERT INTO material_acks (material_id, user_id, ack_type, ack_at)
       VALUES (?,?,?,?)
       ON CONFLICT(material_id, user_id, ack_type) DO UPDATE SET ack_at = excluded.ack_at`,
    )
    .bind(id, user.id, ackType, now)
    .run();

  return json({ ok: true, ackType }, requestId);
});

export default materials;
