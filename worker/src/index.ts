import { Hono } from 'hono';
import type { AppEnv } from './env';
import { newId } from './lib/ids';
import { errorResponse, corsHeaders } from './lib/http';
import { getSessionUser, touchSession } from './auth';
import { ApiError } from './lib/errors';
import { pruneExpiredSessions } from './auth';
import { pruneRateLimits } from './lib/ratelimit';

import authRoutes from './routes/auth';
import publicRoutes from './routes/public';
import memberRoutes from './routes/members';
import attendanceRoutes from './routes/attendance';
import reportRoutes from './routes/reports';
import announcementRoutes from './routes/announcements';
import materialRoutes from './routes/materials';
import followUpRoutes from './routes/followups';
import prayerRoutes from './routes/prayer';
import testimonyRoutes from './routes/testimonies';
import hierarchyRoutes from './routes/hierarchy';
import notificationRoutes from './routes/notifications';
import invitationRoutes from './routes/invitations';

const app = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// Request id + structured access logging
// ---------------------------------------------------------------------------
app.use('*', async (c, next) => {
  const requestId = newId('req');
  c.set('requestId', requestId);
  const started = Date.now();
  await next();
  const ms = Date.now() - started;
  // Never log request bodies — they can contain prayer content or credentials.
  console.log(
    JSON.stringify({
      requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      ms,
    }),
  );
  c.res.headers.set('X-Request-Id', requestId);
});

// ---------------------------------------------------------------------------
// CORS — credentials are used, so the origin is echoed explicitly.
// ---------------------------------------------------------------------------
app.use('*', async (c, next) => {
  const headers = corsHeaders(c.req.raw, c.env);
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  await next();
  for (const [k, v] of Object.entries(headers)) c.res.headers.set(k, v);
});

// ---------------------------------------------------------------------------
// Resolve the signed-in user (never throws — anonymous requests are allowed
// up to the point where a route demands authentication).
// ---------------------------------------------------------------------------
app.use('*', async (c, next) => {
  try {
    const user = await getSessionUser(c.env.DB, c.req.raw);
    c.set('user', user);
    if (user) c.executionCtx.waitUntil(touchSession(c.env.DB, c.req.raw));
  } catch {
    c.set('user', null);
  }
  await next();
});

// ---------------------------------------------------------------------------
// Error handling — ApiError is client-safe; anything else is logged and
// replaced with an opaque message so internals never leak.
// ---------------------------------------------------------------------------
app.onError((err, c) => {
  const requestId = c.get('requestId') ?? 'unknown';
  if (!(err instanceof ApiError)) {
    console.error(`[${requestId}] unhandled:`, err instanceof Error ? err.stack ?? err.message : err);
  }
  return errorResponse(err, requestId);
});

app.notFound((c) => {
  const requestId = c.get('requestId') ?? 'unknown';
  return errorResponse(ApiError.notFound(`No route matches ${c.req.method} ${new URL(c.req.url).pathname}`), requestId);
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/health', (c) => c.json({ ok: true, service: 'homecell-api', env: c.env.ENVIRONMENT }));

app.route('/api/public', publicRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/hierarchy', hierarchyRoutes);
app.route('/api/members', memberRoutes);
app.route('/api/attendance', attendanceRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/announcements', announcementRoutes);
app.route('/api/materials', materialRoutes);
app.route('/api/followups', followUpRoutes);
app.route('/api/prayer', prayerRoutes);
app.route('/api/testimonies', testimonyRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/invitations', invitationRoutes);

// ---------------------------------------------------------------------------
// Scheduled maintenance
// ---------------------------------------------------------------------------
async function scheduled(_event: ScheduledController, env: AppEnv['Bindings']): Promise<void> {
  await pruneExpiredSessions(env.DB);
  await pruneRateLimits(env.DB);
}

export default {
  fetch: app.fetch,
  scheduled,
};
