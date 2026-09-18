import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { json, readJson, clientIp } from '../lib/http';
import { newId, nowIso } from '../lib/ids';
import { hashPassword } from '../lib/crypto';
import { parseOrThrow, memberCreateSchema, memberUpdateSchema } from '../lib/validation';
import { requireUser, requirePermission, resolveHomecellId } from '../auth';
import { getUserScope, getAccessibleHomecellIds, inClause, assertHomecellAccess } from '../lib/scope';
import { enforceRateLimit } from '../lib/ratelimit';
import { writeAudit } from '../lib/audit';
import { isCellLeaderLevel, isGlobalAdmin, ROLE_RANK, type UserRole } from '../../../shared/permissions';

const members = new Hono<AppEnv>();

/**
 * Columns safe to return about a person.
 *
 * `notes` is deliberately excluded here and only added for leader-level
 * callers — private pastoral notes must never reach ordinary members, and
 * that decision is made server-side.
 */
const SAFE_COLUMNS = `
  u.id, u.name, u.preferred_name AS preferredName, u.phone, u.email,
  u.gender, u.date_of_birth AS dateOfBirth, u.role, u.status,
  u.member_status AS memberStatus, u.membership_type AS membershipType,
  u.is_first_timer AS isFirstTimer, u.avatar_url AS avatarUrl,
  u.occupation, u.city, u.country, u.skills,
  u.homecell_id AS homecellId, u.joined_date AS joinedDate,
  u.last_login_at AS lastLoginAt, u.invited_by AS invitedBy,
  u.created_at AS createdAt, u.updated_at AS updatedAt`;

function deserialise<T extends { isFirstTimer?: unknown; skills?: unknown }>(row: T) {
  return {
    ...row,
    isFirstTimer: row.isFirstTimer === 1,
    skills: typeof row.skills === 'string' ? safeParseArray(row.skills) : (row.skills ?? []),
  };
}

function safeParseArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// GET /api/members — scoped list with search + filters
// ---------------------------------------------------------------------------
members.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  requirePermission(c, 'view_homecell_members');

  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);

  // A plain member may see the directory of their own cell but nothing else.
  const homecellParam = c.req.query('homecellId');
  const search = c.req.query('search')?.trim();
  const status = c.req.query('status');
  const role = c.req.query('role');
  const memberStatus = c.req.query('memberStatus');
  const limit = Math.min(Number(c.req.query('limit') ?? 200), 500);
  const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

  const where: string[] = [];
  const bindings: unknown[] = [];

  if (allowed !== null) {
    if (allowed.length === 0) return json({ members: [], total: 0 }, requestId);
    const clause = inClause(allowed);
    where.push(`u.homecell_id IN ${clause.sql}`);
    bindings.push(...clause.bindings);
  }
  if (homecellParam) {
    await assertHomecellAccess(c.env.DB, scope, homecellParam);
    where.push('u.homecell_id = ?');
    bindings.push(homecellParam);
  }
  if (search) {
    where.push('(u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR u.city LIKE ?)');
    const like = `%${search}%`;
    bindings.push(like, like, like, like);
  }
  if (status) { where.push('u.status = ?'); bindings.push(status); }
  if (role) { where.push('u.role = ?'); bindings.push(role); }
  if (memberStatus) { where.push('u.member_status = ?'); bindings.push(memberStatus); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Private pastoral notes are only ever selected for leader-level roles.
  const includeNotes = isCellLeaderLevel(user.role);

  const total = await c.env.DB
    .prepare(`SELECT COUNT(*) AS n FROM users u ${whereSql}`)
    .bind(...bindings)
    .first<{ n: number }>();

  const { results } = await c.env.DB
    .prepare(
      `SELECT ${SAFE_COLUMNS}${includeNotes ? ', u.notes' : ''}
         FROM users u
         ${whereSql}
        ORDER BY u.name
        LIMIT ? OFFSET ?`,
    )
    .bind(...bindings, limit, offset)
    .all();

  return json(
    {
      members: results.map(deserialise),
      total: total?.n ?? 0,
      includesPrivateNotes: includeNotes,
    },
    requestId,
  );
});

// ---------------------------------------------------------------------------
// POST /api/members — a leader records someone on their behalf
// ---------------------------------------------------------------------------
members.post('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'add_homecell_members');
  await enforceRateLimit(c.env.DB, `member-create:${user.id}`, 100, 60 * 60 * 1000);

  const body = parseOrThrow(memberCreateSchema, await readJson(c.req.raw));
  const homecellId = resolveHomecellId(c, c.req.query('homecellId'));
  const now = nowIso();

  if (body.phone) {
    const clash = await c.env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(body.phone).first();
    if (clash) throw ApiError.conflict('Someone with that phone number is already recorded.');
  }
  if (body.email) {
    const clash = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
    if (clash) throw ApiError.conflict('Someone with that email address is already recorded.');
  }

  const id = newId('usr');
  // Without a password the record exists but cannot be signed into until the
  // person registers or the leader sets one. That is intentional.
  const pwd = body.password ? await hashPassword(body.password) : null;

  await c.env.DB
    .prepare(
      `INSERT INTO users
         (id, phone, email, password_hash, password_salt, password_iterations,
          name, gender, date_of_birth, role, homecell_id, status, member_status,
          membership_type, is_first_timer, occupation, address, city,
          joined_date, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      id,
      body.phone ?? null,
      body.email ?? null,
      pwd?.hash ?? null,
      pwd?.salt ?? null,
      pwd?.iterations ?? null,
      body.name,
      body.gender ?? null,
      body.dateOfBirth ?? null,
      'member',
      homecellId,
      body.password ? 'active' : 'pending',
      body.memberStatus ?? (body.isFirstTimer ? 'first_timer' : 'member'),
      body.membershipType ?? null,
      body.isFirstTimer ? 1 : 0,
      body.occupation ?? null,
      body.address ?? null,
      body.city ?? null,
      now.slice(0, 10),
      now,
      now,
    )
    .run();

  // First-timers always enter the follow-up pipeline.
  if (body.isFirstTimer) {
    await c.env.DB
      .prepare(
        `INSERT INTO follow_ups
           (id, homecell_id, subject_id, assigned_to, reason, priority, status, due_date, created_by, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(newId('fu'), homecellId, id, null, 'first_timer', 'high', 'open',
            new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), user.id, now, now)
      .run();
  }

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'member.create',
    entityType: 'user',
    entityId: id,
    homecellId,
    after: { name: body.name, isFirstTimer: body.isFirstTimer },
    ip: clientIp(c.req.raw),
  });

  const created = await c.env.DB
    .prepare(`SELECT ${SAFE_COLUMNS} FROM users u WHERE u.id = ?`)
    .bind(id)
    .first();

  return json({ member: created ? deserialise(created) : null }, requestId, 201);
});

// ---------------------------------------------------------------------------
// GET /api/members/:id
// ---------------------------------------------------------------------------
members.get('/:id', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const id = c.req.param('id');

  const scope = await getUserScope(c.env.DB, user);

  // A member with 'own' scope may read only their own record.
  if (scope.level === 'own' && id !== user.id) {
    throw ApiError.forbidden('You can only view your own profile.');
  }

  const includeNotes = isCellLeaderLevel(user.role);
  const row = await c.env.DB
    .prepare(`SELECT ${SAFE_COLUMNS}${includeNotes ? ', u.notes' : ''} FROM users u WHERE u.id = ?`)
    .bind(id)
    .first<{ homecellId: string | null }>();

  if (!row) throw ApiError.notFound('That person could not be found.');

  if (scope.level !== 'own' && scope.level !== 'global' && row.homecellId) {
    await assertHomecellAccess(c.env.DB, scope, row.homecellId);
  }

  return json({ member: deserialise(row) }, requestId);
});

// ---------------------------------------------------------------------------
// PATCH /api/members/:id
// ---------------------------------------------------------------------------
members.patch('/:id', async (c) => {
  const requestId = c.get('requestId');
  const actor = requireUser(c);
  const id = c.req.param('id');
  const body = parseOrThrow(memberUpdateSchema, await readJson(c.req.raw));

  const isSelf = actor.id === id;
  if (!isSelf) requirePermission(c, 'edit_homecell_members');

  const target = await c.env.DB
    .prepare('SELECT id, role, homecell_id, status, member_status, is_first_timer, email FROM users WHERE id = ?')
    .bind(id)
    .first<{ id: string; role: string; homecell_id: string | null; status: string; member_status: string; is_first_timer: number; email: string | null }>();

  if (!target) throw ApiError.notFound('That person could not be found.');

  const scope = await getUserScope(c.env.DB, actor);
  if (!isSelf && scope.level !== 'global' && target.homecell_id) {
    await assertHomecellAccess(c.env.DB, scope, target.homecell_id);
  }

  // Privilege-escalation guard: a user may never raise their own role, and a
  // lower-ranked leader may never promote anybody to a role at or above their
  // own. Role changes also require the dedicated permission.
  if (body.role && body.role !== target.role) {
    if (isSelf) throw ApiError.forbidden('You cannot change your own role.');
    requirePermission(c, 'manage_users');
    const actorRank = ROLE_RANK[actor.role];
    const newRank = ROLE_RANK[body.role as UserRole];
    const targetRank = ROLE_RANK[target.role as UserRole];
    if (newRank >= actorRank) throw ApiError.forbidden('You cannot assign a role at or above your own.');
    if (targetRank >= actorRank) throw ApiError.forbidden('You cannot modify somebody with an equal or higher role.');
  }

  // Members may not change their own status fields.
  if (isSelf && (body.memberStatus || body.notes !== undefined || body.role)) {
    throw ApiError.forbidden('Those fields can only be changed by your cell leader.');
  }

  const before = {
    name: undefined,
    role: target.role,
    status: target.status,
    memberStatus: target.member_status,
    isFirstTimer: target.is_first_timer === 1,
  };

  if (body.email && body.email !== target.email) {
    const clash = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(body.email, id).first();
    if (clash) throw ApiError.conflict('That email address is already in use.');
  }

  const now = nowIso();
  const fields: string[] = [];
  const values: unknown[] = [];
  const columnMap: Record<string, string> = {
    name: 'name',
    phone: 'phone',
    email: 'email',
    gender: 'gender',
    dateOfBirth: 'date_of_birth',
    membershipType: 'membership_type',
    memberStatus: 'member_status',
    role: 'role',
    occupation: 'occupation',
    address: 'address',
    city: 'city',
    notes: 'notes',
  };

  for (const [key, column] of Object.entries(columnMap)) {
    if (key in body && body[key as keyof typeof body] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(body[key as keyof typeof body]);
    }
  }
  if (body.isFirstTimer !== undefined) {
    fields.push('is_first_timer = ?');
    values.push(body.isFirstTimer ? 1 : 0);
  }

  if (fields.length === 0) return json({ updated: false }, requestId);

  fields.push('updated_at = ?');
  values.push(now, id);

  await c.env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  await writeAudit(c.env.DB, {
    actorId: actor.id,
    action: body.role ? 'member.role.change' : 'member.update',
    entityType: 'user',
    entityId: id,
    homecellId: target.homecell_id,
    before,
    after: { changed: Object.keys(body), role: body.role, memberStatus: body.memberStatus },
    ip: clientIp(c.req.raw),
  });

  const updated = await c.env.DB
    .prepare(`SELECT ${SAFE_COLUMNS}${isCellLeaderLevel(actor.role) ? ', u.notes' : ''} FROM users u WHERE u.id = ?`)
    .bind(id)
    .first();

  return json({ updated: true, member: updated ? deserialise(updated) : null }, requestId);
});

// ---------------------------------------------------------------------------
// POST /api/members/:id/approve — approve a pending registration
// ---------------------------------------------------------------------------
members.post('/:id/approve', async (c) => {
  const requestId = c.get('requestId');
  const actor = requirePermission(c, 'add_homecell_members');
  const id = c.req.param('id');
  const body = await readJson<{ decision?: string }>(c.req.raw);

  const target = await c.env.DB
    .prepare('SELECT id, status, homecell_id, member_status FROM users WHERE id = ?')
    .bind(id)
    .first<{ id: string; status: string; homecell_id: string | null; member_status: string }>();

  if (!target) throw ApiError.notFound('That person could not be found.');

  const scope = await getUserScope(c.env.DB, actor);
  if (scope.level !== 'global' && target.homecell_id) {
    await assertHomecellAccess(c.env.DB, scope, target.homecell_id);
  }

  if (target.status !== 'pending') {
    throw ApiError.conflict('That registration is not awaiting approval.');
  }

  const approve = body.decision !== 'reject';
  const now = nowIso();

  await c.env.DB
    .prepare('UPDATE users SET status = ?, member_status = ?, updated_at = ? WHERE id = ?')
    .bind(approve ? 'active' : 'archived', approve ? 'member' : target.member_status, now, id)
    .run();

  await c.env.DB
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, severity, created_at)
       VALUES (?,?,?,?,?,?,?)`,
    )
    .bind(
      newId('ntf'),
      id,
      approve ? 'registration_approved' : 'registration_declined',
      approve ? 'Your registration was approved' : 'Your registration was not approved',
      approve ? 'Welcome to the cell! You can now sign in and join meetings.' : 'Please contact your cell leader for more information.',
      approve ? 'success' : 'warning',
      now,
    )
    .run();

  await writeAudit(c.env.DB, {
    actorId: actor.id,
    action: approve ? 'member.approve' : 'member.reject',
    entityType: 'user',
    entityId: id,
    homecellId: target.homecell_id,
    before: { status: target.status },
    after: { status: approve ? 'active' : 'archived' },
    ip: clientIp(c.req.raw),
  });

  return json({ ok: true, status: approve ? 'active' : 'archived' }, requestId);
});

// ---------------------------------------------------------------------------
// GET /api/members/:id/timeline — the person's journey, assembled from records
// ---------------------------------------------------------------------------
members.get('/:id/timeline', async (c) => {
  const requestId = c.get('requestId');
  const actor = requireUser(c);
  const id = c.req.param('id');

  const scope = await getUserScope(c.env.DB, actor);
  if (scope.level === 'own' && id !== actor.id) throw ApiError.forbidden('You can only view your own timeline.');

  const person = await c.env.DB
    .prepare('SELECT id, homecell_id, joined_date, created_at FROM users WHERE id = ?')
    .bind(id)
    .first<{ id: string; homecell_id: string | null; joined_date: string | null; created_at: string }>();

  if (!person) throw ApiError.notFound('That person could not be found.');
  if (scope.level !== 'own' && scope.level !== 'global' && person.homecell_id) {
    await assertHomecellAccess(c.env.DB, scope, person.homecell_id);
  }

  const [attendance, followUps, prayer] = await Promise.all([
    c.env.DB
      .prepare('SELECT meeting_date AS date, status, is_first_timer AS isFirstTimer FROM attendance_records WHERE member_id = ? ORDER BY meeting_date DESC LIMIT 50')
      .bind(id)
      .all(),
    c.env.DB
      .prepare('SELECT id, reason, status, priority, due_date AS dueDate, outcome, created_at AS createdAt FROM follow_ups WHERE subject_id = ? ORDER BY created_at DESC LIMIT 50')
      .bind(id)
      .all(),
    c.env.DB
      .prepare("SELECT id, title, status, created_at AS createdAt FROM prayer_requests WHERE author_id = ? AND visibility != 'private' ORDER BY created_at DESC LIMIT 20")
      .bind(id)
      .all(),
  ]);

  // Merge into a single chronological timeline the UI can render directly.
  type Entry = { type: string; at: string; title: string; detail?: string | null };
  const entries: Entry[] = [];

  entries.push({ type: 'joined', at: person.created_at, title: 'Joined the cell' });

  for (const a of attendance.results as { date: string; status: string; isFirstTimer: number }[]) {
    entries.push({
      type: 'attendance',
      at: a.date,
      title: a.status === 'present' || a.status === 'late' ? 'Attended cell meeting' : `Marked ${a.status}`,
      detail: a.isFirstTimer === 1 ? 'First time' : null,
    });
  }
  for (const f of followUps.results as { reason: string; status: string; createdAt: string }[]) {
    entries.push({ type: 'follow_up', at: f.createdAt, title: `Follow-up: ${f.reason.replace(/_/g, ' ')}`, detail: f.status });
  }
  for (const p of prayer.results as { title: string | null; status: string; createdAt: string }[]) {
    entries.push({ type: 'prayer', at: p.createdAt, title: p.title ?? 'Prayer request', detail: p.status });
  }

  entries.sort((a, b) => (a.at < b.at ? 1 : -1));

  return json({ timeline: entries.slice(0, 100) }, requestId);
});

export default members;
