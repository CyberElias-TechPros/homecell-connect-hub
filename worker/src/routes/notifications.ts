import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { json, readJson } from '../lib/http';
import { nowIso } from '../lib/ids';
import { parseOrThrow, notificationReadSchema } from '../lib/validation';
import { requireUser } from '../auth';

/**
 * In-app notification inbox.
 *
 * Outbound delivery (SMS / WhatsApp / email) is deliberately not attempted
 * here: notification writes must never depend on a third-party provider
 * being configured or reachable.
 */
const notifications = new Hono<AppEnv>();

notifications.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);

  const unreadOnly = c.req.query('unread') === 'true';
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);

  const { results } = await c.env.DB
    .prepare(
      `SELECT id, type, title, body, link, severity, read_at AS readAt, created_at AS createdAt
         FROM notifications
        WHERE user_id = ?
          ${unreadOnly ? 'AND read_at IS NULL' : ''}
        ORDER BY created_at DESC
        LIMIT ?`,
    )
    .bind(user.id, limit)
    .all();

  const unread = await c.env.DB
    .prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL')
    .bind(user.id)
    .first<{ n: number }>();

  return json({ notifications: results, unreadCount: unread?.n ?? 0 }, requestId);
});

notifications.post('/read', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const body = parseOrThrow(notificationReadSchema, await readJson(c.req.raw));
  const now = nowIso();

  if (body.all || !body.ids || body.ids.length === 0) {
    await c.env.DB
      .prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL')
      .bind(now, user.id)
      .run();
    return json({ ok: true, scope: 'all' }, requestId);
  }

  // Parameterised IN list — the ids are values, never interpolated SQL.
  const placeholders = body.ids.map(() => '?').join(',');
  await c.env.DB
    .prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND id IN (${placeholders}) AND read_at IS NULL`)
    .bind(now, user.id, ...body.ids)
    .run();

  return json({ ok: true, scope: 'selected', count: body.ids.length }, requestId);
});

export default notifications;
