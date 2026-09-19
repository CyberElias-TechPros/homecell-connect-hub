import type { Context } from 'hono';
import type { AppEnv, AuthenticatedUser, Env } from './env';
import type { UserRole, Permission } from '../../shared/permissions';
import { hasPermission } from '../../shared/permissions';
import { ApiError } from './lib/errors';
import { newId, newToken, nowIso, isoIn, DAY } from './lib/ids';
import { sha256 } from './lib/crypto';
import { SESSION_COOKIE, buildCookie, clearCookie, isSecureRequest, parseCookies } from './lib/http';

export const SESSION_TTL_MS = 30 * DAY;

interface UserRow {
  id: string;
  name: string;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  member_status: string;
  homecell_id: string | null;
  avatar_url: string | null;
  is_first_timer: number;
}

function toAuthenticatedUser(row: UserRow): AuthenticatedUser {
  return {
    id: row.id,
    name: row.name,
    preferredName: row.preferred_name,
    email: row.email,
    phone: row.phone,
    role: row.role as UserRole,
    status: row.status,
    memberStatus: row.member_status,
    homecellId: row.homecell_id,
    avatarUrl: row.avatar_url,
    isFirstTimer: row.is_first_timer === 1,
  };
}

/** Explicit column list — keeps every SELECT that builds a user predictable. */
const USER_COLUMNS = [
  'id',
  'name',
  'preferred_name',
  'email',
  'phone',
  'role',
  'status',
  'member_status',
  'homecell_id',
  'avatar_url',
  'is_first_timer',
].join(', ');

const USER_COLUMNS_U = USER_COLUMNS.split(', ')
  .map((col) => `u.${col}`)
  .join(', ');

/**
 * Issue a new session for a user.
 *
 * The raw token is returned to the caller exactly once and never stored; only
 * its SHA-256 digest is persisted. A stolen database therefore yields no
 * usable sessions.
 */
export async function createSession(
  db: D1Database,
  userId: string,
  request: Request,
): Promise<{ token: string; expiresAt: string }> {
  const token = newToken(32);
  const tokenHash = await sha256(token);
  const now = nowIso();
  const expiresAt = isoIn(SESSION_TTL_MS);

  await db
    .prepare(
      `INSERT INTO sessions (token_hash, user_id, expires_at, created_at, last_seen_at, user_agent, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      tokenHash,
      userId,
      expiresAt,
      now,
      now,
      request.headers.get('User-Agent')?.slice(0, 300) ?? null,
      request.headers.get('CF-Connecting-IP') ?? null,
    )
    .run();

  return { token, expiresAt };
}

export function sessionCookie(token: string, request: Request, maxAgeSeconds = SESSION_TTL_MS / 1000): string {
  return buildCookie(SESSION_COOKIE, token, {
    maxAge: maxAgeSeconds,
    secure: isSecureRequest(request),
    sameSite: 'Lax',
  });
}

export function expiredSessionCookie(request: Request): string {
  return clearCookie(SESSION_COOKIE, isSecureRequest(request));
}

/** Resolve the signed-in user from the session cookie, or null. */
export async function getSessionUser(db: D1Database, request: Request): Promise<AuthenticatedUser | null> {
  const token = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
  if (!token) return null;

  const tokenHash = await sha256(token);
  const row = await db
    .prepare(
      `SELECT ${USER_COLUMNS_U}
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
          AND s.expires_at > ?
          -- 'pending' users are allowed to authenticate so they can see that
          -- their registration is awaiting approval. What they may DO is
          -- gated separately in requirePermission().
          AND u.status IN ('active','pending')`,
    )
    .bind(tokenHash, nowIso())
    .first<UserRow>();

  if (!row) return null;
  return toAuthenticatedUser(row);
}

export async function touchSession(db: D1Database, request: Request): Promise<void> {
  const token = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
  if (!token) return;
  const tokenHash = await sha256(token);
  // Best-effort; a failure here must not affect the response.
  await db
    .prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?')
    .bind(nowIso(), tokenHash)
    .run()
    .catch(() => undefined);
}

export async function destroySession(db: D1Database, request: Request): Promise<void> {
  const token = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
  if (!token) return;
  const tokenHash = await sha256(token);
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

/** Invalidate every session for a user (password change, suspension). */
export async function destroyAllSessions(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

export async function pruneExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(nowIso()).run();
}

// ---------------------------------------------------------------------------
// Hono middleware helpers
// ---------------------------------------------------------------------------

/** Throws UNAUTHORIZED when there is no authenticated user. */
export function requireUser(c: Context<AppEnv>): AuthenticatedUser {
  const user = c.get('user');
  if (!user) throw ApiError.unauthorized();
  return user;
}

/**
 * Throws FORBIDDEN unless the signed-in user's role grants `permission`.
 * This is the single chokepoint for server-side authorization; route handlers
 * must call it before touching data.
 */
export function requirePermission(c: Context<AppEnv>, permission: Permission): AuthenticatedUser {
  const user = requireUser(c);

  // A registration awaiting leader approval may sign in and view its own
  // status, but must not be able to act on the cell. Enforcing this here —
  // rather than in each route — means a new endpoint cannot accidentally
  // forget to check.
  if (user.status === 'pending' && !PENDING_ALLOWED.has(permission)) {
    throw ApiError.forbidden('Your registration is still awaiting approval from your cell leader.');
  }

  if (!hasPermission(user.role, permission)) {
    throw ApiError.forbidden();
  }
  return user;
}

/** The only things a not-yet-approved registration may do. */
const PENDING_ALLOWED = new Set<Permission>(['view_own_profile', 'edit_own_profile']);

/**
 * Resolve the homecell a user is allowed to act on.
 *
 * Users with cell-scope roles default to their own homecell. Users with a
 * broader scope may target another cell explicitly (the caller then still has
 * to prove permission for the write itself).
 */
export function resolveHomecellId(c: Context<AppEnv>, requested?: string | null): string {
  const user = requireUser(c);
  const scope = { member: 'own', leader: 'homecell', assistant: 'homecell', provider: 'homecell',
                  zonal: 'zone', area: 'area', district: 'district', admin: 'global', super_admin: 'global' }[user.role];

  if (scope === 'own' || scope === 'homecell') {
    if (!user.homecellId) throw ApiError.forbidden('You are not assigned to a homecell yet.');
    return user.homecellId;
  }
  const target = requested ?? user.homecellId;
  if (!target) throw ApiError.validation('A homecell must be specified.');
  return target;
}

/** OTP storage lives in KV with a short TTL rather than in D1. */
export async function storeOtp(env: Env, phone: string, code: string): Promise<void> {
  await env.CACHE.put(`otp:${phone}`, JSON.stringify({ code, tries: 0 }), { expirationTtl: 600 });
}

export async function verifyStoredOtp(env: Env, phone: string, code: string): Promise<boolean> {
  const raw = await env.CACHE.get(`otp:${phone}`);
  if (!raw) return false;
  let record: { code: string; tries: number };
  try {
    record = JSON.parse(raw);
  } catch {
    return false;
  }
  if (record.tries >= 5) {
    await env.CACHE.delete(`otp:${phone}`);
    return false;
  }
  if (record.code !== code) {
    record.tries += 1;
    await env.CACHE.put(`otp:${phone}`, JSON.stringify(record), { expirationTtl: 600 });
    return false;
  }
  await env.CACHE.delete(`otp:${phone}`);
  return true;
}

export { newId };
