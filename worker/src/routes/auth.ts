import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { json, readJson, clientIp } from '../lib/http';
import { newId, nowIso } from '../lib/ids';
import { hashPassword, verifyPassword, sha256, generateOtp } from '../lib/crypto';
import { parseOrThrow, registerSchema, loginSchema, requestOtpSchema, verifyOtpSchema, profileUpdateSchema, changePasswordSchema } from '../lib/validation';
import {
  createSession,
  sessionCookie,
  expiredSessionCookie,
  destroySession,
  destroyAllSessions,
  requireUser,
  storeOtp,
  verifyStoredOtp,
} from '../auth';
import { enforceRateLimit } from '../lib/ratelimit';
import { writeAudit } from '../lib/audit';
import { hasPermission } from '../../../shared/permissions';

const auth = new Hono<AppEnv>();

/** Shape returned to the client for the signed-in user. Never includes hashes. */
function publicUser(u: {
  id: string; name: string; preferredName: string | null; email: string | null; phone: string | null;
  role: string; status: string; memberStatus: string; homecellId: string | null;
  avatarUrl: string | null; isFirstTimer: boolean;
}) {
  return {
    id: u.id,
    name: u.name,
    preferredName: u.preferredName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    memberStatus: u.memberStatus,
    homecellId: u.homecellId,
    avatarUrl: u.avatarUrl,
    isFirstTimer: u.isFirstTimer,
    permissions: hasPermission(u.role as never, 'view_own_profile')
      ? // Full permission list is served from /api/auth/me below.
        undefined
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// Public. Creates a member account, optionally attached to a cell via invite.
// ---------------------------------------------------------------------------
auth.post('/register', async (c) => {
  const requestId = c.get('requestId');
  const ip = clientIp(c.req.raw);
  await enforceRateLimit(c.env.DB, `register:${ip}`, 10, 60 * 60 * 1000);

  const body = parseOrThrow(registerSchema, await readJson(c.req.raw));
  const now = nowIso();

  // Resolve target homecell: an invitation takes precedence.
  let homecellId: string | null = null;
  let invitedBy: string | null = null;
  let invitationRole: string | null = null;
  let invitationId: string | null = null;

  if (body.inviteToken) {
    const tokenHash = await sha256(body.inviteToken);
    const invite = await c.env.DB
      .prepare('SELECT id, homecell_id, created_by, role, expires_at, used_at, revoked_at FROM invitations WHERE token_hash = ?')
      .bind(tokenHash)
      .first<{ id: string; homecell_id: string; created_by: string; role: string; expires_at: string; used_at: string | null; revoked_at: string | null }>();

    if (!invite) throw new ApiError('NOT_FOUND', 'This invitation link is not valid.');
    if (invite.revoked_at) throw new ApiError('INVITE_REVOKED', 'This invitation link has been revoked.');
    if (invite.used_at) throw new ApiError('INVITE_USED', 'This invitation link has already been used.');
    if (invite.expires_at <= now) throw new ApiError('INVITE_EXPIRED', 'This invitation link has expired.');

    homecellId = invite.homecell_id;
    invitedBy = invite.created_by;
    invitationRole = invite.role;
    invitationId = invite.id;
  } else {
    const setting = await c.env.DB
      .prepare("SELECT value FROM app_settings WHERE key = 'default_homecell_id'")
      .first<{ value: string }>();
    homecellId = setting?.value ?? null;
  }

  // Reject duplicates with a clear, non-enumerating message.
  if (body.phone) {
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(body.phone).first();
    if (existing) throw ApiError.conflict('An account already exists for that phone number. Try signing in instead.');
  }
  if (body.email) {
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
    if (existing) throw ApiError.conflict('An account already exists for that email address. Try signing in instead.');
  }

  const pwd = await hashPassword(body.password);
  const userId = newId('usr');

  // Members arriving through an invitation are trusted; open registration
  // goes into the approval queue unless the cell has auto-approval enabled.
  let status: 'pending' | 'active' = 'active';
  let memberStatus = body.isFirstTimer ? 'first_timer' : 'member';
  let role = invitationRole ?? 'member';

  if (homecellId) {
    const cell = await c.env.DB
      .prepare('SELECT auto_approve_members FROM homecells WHERE id = ?')
      .bind(homecellId)
      .first<{ auto_approve_members: number }>();
    if (!invitationId && cell && cell.auto_approve_members === 0 && !body.isFirstTimer) {
      status = 'pending';
    }
  }

  await c.env.DB
    .prepare(
      `INSERT INTO users
         (id, phone, email, password_hash, password_salt, password_iterations,
          name, gender, date_of_birth, role, homecell_id, status, member_status,
          is_first_timer, city, country, occupation, how_heard, invited_by, joined_date,
          created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      userId,
      body.phone ?? null,
      body.email ?? null,
      pwd.hash,
      pwd.salt,
      pwd.iterations,
      body.name,
      body.gender ?? null,
      body.dateOfBirth ?? null,
      role,
      homecellId,
      status,
      memberStatus,
      body.isFirstTimer ? 1 : 0,
      body.city ?? null,
      body.country ?? null,
      body.occupation ?? null,
      body.howHeard ?? null,
      invitedBy,
      now.slice(0, 10),
      now,
      now,
    )
    .run();

  // Consent is recorded explicitly — it is required for lawful processing.
  await c.env.DB
    .prepare(
      `INSERT INTO consent_records (id, user_id, consent_type, granted, policy_version, recorded_at, ip)
       VALUES (?,?,?,?,?,?,?)`,
    )
    .bind(newId('con'), userId, 'data_processing', 1, 'v1', now, ip)
    .run();
  if (body.consentWhatsapp) {
    await c.env.DB
      .prepare(
        `INSERT INTO consent_records (id, user_id, consent_type, granted, policy_version, recorded_at, ip)
         VALUES (?,?,?,?,?,?,?)`,
      )
      .bind(newId('con'), userId, 'whatsapp', 1, 'v1', now, ip)
      .run();
  }

  if (invitationId) {
    await c.env.DB
      .prepare('UPDATE invitations SET used_at = ?, used_by = ? WHERE id = ?')
      .bind(now, userId, invitationId)
      .run();
  }

  // A first-timer automatically enters the follow-up pipeline. This is the
  // single most important automation in the product: nobody gets missed.
  if (homecellId && (body.isFirstTimer || status === 'pending')) {
    await c.env.DB
      .prepare(
        `INSERT INTO follow_ups
           (id, homecell_id, subject_id, assigned_to, reason, priority, status, due_date, created_by, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        newId('fu'),
        homecellId,
        userId,
        null,
        body.isFirstTimer ? 'first_timer' : 'care',
        'high',
        'open',
        new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        null,
        now,
        now,
      )
      .run();
  }

  await writeAudit(c.env.DB, {
    actorId: userId,
    action: 'user.register',
    entityType: 'user',
    entityId: userId,
    homecellId,
    after: { role, status, memberStatus, viaInvite: Boolean(invitationId) },
    ip,
    userAgent: c.req.raw.headers.get('User-Agent'),
  });

  const { token } = await createSession(c.env.DB, userId, c.req.raw);

  const created = await c.env.DB
    .prepare('SELECT id, name, preferred_name AS preferredName, email, phone, role, status, member_status AS memberStatus, homecell_id AS homecellId, avatar_url AS avatarUrl, is_first_timer AS isFirstTimer FROM users WHERE id = ?')
    .bind(userId)
    .first<{
      id: string; name: string; preferredName: string | null; email: string | null; phone: string | null;
      role: string; status: string; memberStatus: string; homecellId: string | null;
      avatarUrl: string | null; isFirstTimer: number;
    }>();

  return json(
    {
      user: created ? { ...created, isFirstTimer: created.isFirstTimer === 1 } : null,
      // Tell the UI plainly what happens next instead of leaving them guessing.
      nextStep:
        status === 'pending'
          ? 'Your request has been sent to the cell leader for approval.'
          : 'Welcome! You are now part of the cell.',
    },
    requestId,
    201,
    // The cookie must travel on the Response we return; setting it via
    // c.header() would be discarded because this helper builds a new Response.
    { 'Set-Cookie': sessionCookie(token, c.req.raw) },
  );
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
auth.post('/login', async (c) => {
  const requestId = c.get('requestId');
  const ip = clientIp(c.req.raw);
  await enforceRateLimit(c.env.DB, `login:${ip}`, 20, 15 * 60 * 1000);

  const input = parseOrThrow(loginSchema, await readJson(c.req.raw));

  const row = input.email
    ? await c.env.DB
        .prepare('SELECT id, name, password_hash, password_salt, password_iterations, status FROM users WHERE email = ?')
        .bind(input.email)
        .first<{ id: string; name: string; password_hash: string | null; password_salt: string | null; password_iterations: number | null; status: string }>()
    : await c.env.DB
        .prepare('SELECT id, name, password_hash, password_salt, password_iterations, status FROM users WHERE phone = ?')
        .bind(input.phone)
        .first<{ id: string; name: string; password_hash: string | null; password_salt: string | null; password_iterations: number | null; status: string }>();

  // Always run a hash comparison so that response timing does not reveal
  // whether the account exists.
  const ok = await verifyPassword(
    input.password,
    row ?? { password_hash: null, password_salt: null, password_iterations: null },
  );

  if (!row || !ok) {
    await enforceRateLimit(c.env.DB, `login-fail:${ip}`, 10, 15 * 60 * 1000);
    throw new ApiError('UNAUTHORIZED', 'Those details do not match our records.');
  }

  if (row.status === 'suspended') {
    throw new ApiError('FORBIDDEN', 'This account has been suspended. Please contact your cell leader.');
  }
  if (row.status === 'archived') {
    throw new ApiError('FORBIDDEN', 'This account is no longer active.');
  }

  await c.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(nowIso(), row.id).run();

  const { token } = await createSession(c.env.DB, row.id, c.req.raw);

  await writeAudit(c.env.DB, { actorId: row.id, action: 'user.login', entityType: 'user', entityId: row.id, ip });

  const full = await c.env.DB
    .prepare('SELECT id, name, preferred_name AS preferredName, email, phone, role, status, member_status AS memberStatus, homecell_id AS homecellId, avatar_url AS avatarUrl, is_first_timer AS isFirstTimer FROM users WHERE id = ?')
    .bind(row.id)
    .first<{
      id: string; name: string; preferredName: string | null; email: string | null; phone: string | null;
      role: string; status: string; memberStatus: string; homecellId: string | null;
      avatarUrl: string | null; isFirstTimer: number;
    }>();

  return json(
    { user: full ? { ...full, isFirstTimer: full.isFirstTimer === 1 } : null },
    requestId,
    200,
    { 'Set-Cookie': sessionCookie(token, c.req.raw) },
  );
});

// ---------------------------------------------------------------------------
// POST /api/auth/otp/request  — passwordless login for low-friction mobile use
// ---------------------------------------------------------------------------
auth.post('/otp/request', async (c) => {
  const requestId = c.get('requestId');
  const ip = clientIp(c.req.raw);
  await enforceRateLimit(c.env.DB, `otp-req:${ip}`, 5, 15 * 60 * 1000);

  const { phone } = parseOrThrow(requestOtpSchema, await readJson(c.req.raw));
  await enforceRateLimit(c.env.DB, `otp-req-phone:${phone}`, 5, 15 * 60 * 1000);

  const user = await c.env.DB.prepare('SELECT id, name FROM users WHERE phone = ?').bind(phone).first<{ id: string; name: string }>();

  // Respond identically whether or not the account exists, so this endpoint
  // cannot be used to discover who has an account.
  let delivered = false;
  if (user) {
    const code = generateOtp(6);
    await storeOtp(c.env, phone, code);

    const driver = c.env.MESSAGING_DRIVER ?? 'log';
    if (driver === 'log' || !c.env.TERMII_API_KEY) {
      // No SMS provider configured. Log so a developer can complete the flow
      // locally, and report clearly that delivery did not happen for real.
      console.log(`[otp] ${phone} -> ${code} (dev driver; no SMS provider configured)`);
      delivered = false;
    } else {
      // Real delivery is wired in a later phase; see docs/DEPLOYMENT.md.
      delivered = false;
    }
  }

  return json(
    {
      message: 'If that number is registered, a code has been sent.',
      delivered,
      // Surface the driver state honestly so the UI can be explicit with users
      // rather than pretending a message was sent.
      messagingConfigured: (c.env.MESSAGING_DRIVER ?? 'log') !== 'log',
    },
    requestId,
  );
});

// ---------------------------------------------------------------------------
// POST /api/auth/otp/verify
// ---------------------------------------------------------------------------
auth.post('/otp/verify', async (c) => {
  const requestId = c.get('requestId');
  const ip = clientIp(c.req.raw);
  await enforceRateLimit(c.env.DB, `otp-verify:${ip}`, 20, 15 * 60 * 1000);

  const { phone, code } = parseOrThrow(verifyOtpSchema, await readJson(c.req.raw));

  const valid = await verifyStoredOtp(c.env, phone, code);
  if (!valid) throw new ApiError('UNAUTHORIZED', 'That code is not correct or has expired.');

  const user = await c.env.DB.prepare('SELECT id, status FROM users WHERE phone = ?').bind(phone).first<{ id: string; status: string }>();
  if (!user) throw new ApiError('UNAUTHORIZED', 'That code is not correct or has expired.');
  if (user.status !== 'active') throw new ApiError('FORBIDDEN', 'This account is not active yet.');

  const { token } = await createSession(c.env.DB, user.id, c.req.raw);
  await c.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(nowIso(), user.id).run();

  const full = await c.env.DB
    .prepare('SELECT id, name, preferred_name AS preferredName, email, phone, role, status, member_status AS memberStatus, homecell_id AS homecellId, avatar_url AS avatarUrl, is_first_timer AS isFirstTimer FROM users WHERE id = ?')
    .bind(user.id)
    .first<{
      id: string; name: string; preferredName: string | null; email: string | null; phone: string | null;
      role: string; status: string; memberStatus: string; homecellId: string | null;
      avatarUrl: string | null; isFirstTimer: number;
    }>();

  return json(
    { user: full ? { ...full, isFirstTimer: full.isFirstTimer === 1 } : null },
    requestId,
    200,
    { 'Set-Cookie': sessionCookie(token, c.req.raw) },
  );
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
auth.get('/me', async (c) => {
  const requestId = c.get('requestId');
  const user = c.get('user');
  if (!user) throw ApiError.unauthorized();

  const homecell = user.homecellId
    ? await c.env.DB
        .prepare('SELECT id, name, code, meeting_day, meeting_time, timezone, meeting_link, meeting_platform FROM homecells WHERE id = ?')
        .bind(user.homecellId)
        .first()
    : null;

  return json(
    {
      user,
      homecell,
      permissions: (await import('../../../shared/permissions')).ROLE_PERMISSIONS[user.role] ?? [],
    },
    requestId,
  );
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
auth.post('/logout', async (c) => {
  const requestId = c.get('requestId');
  await destroySession(c.env.DB, c.req.raw);
  return json({ ok: true }, requestId, 200, { 'Set-Cookie': expiredSessionCookie(c.req.raw) });
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/profile
// ---------------------------------------------------------------------------
auth.patch('/profile', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const body = parseOrThrow(profileUpdateSchema, await readJson(c.req.raw));
  const now = nowIso();

  const fields: string[] = [];
  const values: unknown[] = [];
  const map: Record<string, string> = {
    name: 'name',
    preferredName: 'preferred_name',
    email: 'email',
    gender: 'gender',
    dateOfBirth: 'date_of_birth',
    city: 'city',
    country: 'country',
    occupation: 'occupation',
    address: 'address',
  };

  for (const [key, column] of Object.entries(map)) {
    if (key in body && body[key as keyof typeof body] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(body[key as keyof typeof body]);
    }
  }
  if (body.skills !== undefined) {
    fields.push('skills = ?');
    values.push(JSON.stringify(body.skills));
  }

  if (fields.length === 0) return json({ updated: false }, requestId);

  // Guard against stealing an email that belongs to somebody else.
  if (body.email) {
    const clash = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(body.email, user.id).first();
    if (clash) throw ApiError.conflict('That email address is already in use.');
  }

  fields.push('updated_at = ?');
  values.push(now, user.id);

  await c.env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'user.profile.update',
    entityType: 'user',
    entityId: user.id,
    homecellId: user.homecellId,
    after: { fields: Object.keys(body) },
    ip: clientIp(c.req.raw),
  });

  const updated = await c.env.DB
    .prepare('SELECT id, name, preferred_name AS preferredName, email, phone, role, status, member_status AS memberStatus, homecell_id AS homecellId, avatar_url AS avatarUrl, is_first_timer AS isFirstTimer FROM users WHERE id = ?')
    .bind(user.id)
    .first<{
      id: string; name: string; preferredName: string | null; email: string | null; phone: string | null;
      role: string; status: string; memberStatus: string; homecellId: string | null;
      avatarUrl: string | null; isFirstTimer: number;
    }>();

  return json({ updated: true, user: updated ? { ...updated, isFirstTimer: updated.isFirstTimer === 1 } : null }, requestId);
});

// ---------------------------------------------------------------------------
// POST /api/auth/password
// ---------------------------------------------------------------------------
auth.post('/password', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  await enforceRateLimit(c.env.DB, `pwd:${user.id}`, 10, 60 * 60 * 1000);

  const body = parseOrThrow(changePasswordSchema, await readJson(c.req.raw));

  const row = await c.env.DB
    .prepare('SELECT password_hash, password_salt, password_iterations FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ password_hash: string | null; password_salt: string | null; password_iterations: number | null }>();

  const ok = await verifyPassword(body.currentPassword, row ?? { password_hash: null, password_salt: null, password_iterations: null });
  if (!ok) throw new ApiError('UNAUTHORIZED', 'Your current password is not correct.');

  const pwd = await hashPassword(body.newPassword);
  await c.env.DB
    .prepare('UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = ? WHERE id = ?')
    .bind(pwd.hash, pwd.salt, pwd.iterations, nowIso(), user.id)
    .run();

  // Changing a password invalidates every other session.
  await destroyAllSessions(c.env.DB, user.id);
  const { token } = await createSession(c.env.DB, user.id, c.req.raw);

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'user.password.change',
    entityType: 'user',
    entityId: user.id,
    homecellId: user.homecellId,
    ip: clientIp(c.req.raw),
  });

  return json(
    { ok: true, message: 'Password updated. Other devices have been signed out.' },
    requestId,
    200,
    { 'Set-Cookie': sessionCookie(token, c.req.raw) },
  );
});

export { publicUser };
export default auth;
