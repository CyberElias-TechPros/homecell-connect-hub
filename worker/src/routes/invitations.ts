import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { json, readJson, clientIp } from '../lib/http';
import { newId, newToken, nowIso, isoIn, DAY } from '../lib/ids';
import { sha256 } from '../lib/crypto';
import { parseOrThrow, invitationCreateSchema } from '../lib/validation';
import { requireUser, requirePermission } from '../auth';
import { getUserScope, getAccessibleHomecellIds, assertHomecellAccess } from '../lib/scope';
import { writeAudit } from '../lib/audit';

/**
 * Invitation links.
 *
 * The raw token is returned exactly once, at creation, and is never stored —
 * only its SHA-256 digest is kept. If a leader loses the link they must issue
 * a new one; this is deliberate, because a stored token is a stored credential.
 */
const invitations = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// GET /api/invitations — list the links a leader has issued
// ---------------------------------------------------------------------------
invitations.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'manage_invitations');

  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);
  if (allowed !== null && allowed.length === 0) return json({ invitations: [] }, requestId);

  const where: string[] = [];
  const bindings: unknown[] = [];
  if (allowed !== null) {
    where.push(`i.homecell_id IN (${allowed.map(() => '?').join(', ')})`);
    bindings.push(...allowed);
  }

  const { results } = await c.env.DB
    .prepare(
      `SELECT i.id, i.role, i.note, i.expires_at AS expiresAt, i.used_at AS usedAt,
              i.revoked_at AS revokedAt, i.created_at AS createdAt,
              u.name AS createdByName, h.name AS homecellName,
              used.name AS usedByName,
              CASE
                WHEN i.revoked_at IS NOT NULL THEN 'revoked'
                WHEN i.used_at IS NOT NULL THEN 'used'
                WHEN i.expires_at <= ? THEN 'expired'
                ELSE 'active'
              END AS status
         FROM invitations i
         JOIN homecells h ON h.id = i.homecell_id
         LEFT JOIN users u ON u.id = i.created_by
         LEFT JOIN users used ON used.id = i.used_by
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY i.created_at DESC
        LIMIT 100`,
    )
    .bind(nowIso(), ...bindings)
    .all();

  return json({ invitations: results }, requestId);
});

// ---------------------------------------------------------------------------
// POST /api/invitations — issue a new link
// ---------------------------------------------------------------------------
invitations.post('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'manage_invitations');
  const body = parseOrThrow(invitationCreateSchema, await readJson(c.req.raw));

  const homecellId = c.req.query('homecellId') ?? user.homecellId;
  if (!homecellId) throw ApiError.validation('You are not assigned to a homecell.');

  const scope = await getUserScope(c.env.DB, user);
  await assertHomecellAccess(c.env.DB, scope, homecellId);

  // Only a leader-level role may invite somebody as a leader.
  if (body.role !== 'member' && !['leader', 'admin', 'super_admin'].includes(user.role)) {
    throw ApiError.forbidden('Only a cell leader can issue a leadership invitation.');
  }

  const token = newToken(24);
  const tokenHash = await sha256(token);
  const now = nowIso();
  const id = newId('inv');
  const expiresAt = isoIn(body.expiresInDays * DAY);

  await c.env.DB
    .prepare(
      `INSERT INTO invitations
         (id, token_hash, homecell_id, created_by, role, note, expires_at, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    .bind(id, tokenHash, homecellId, user.id, body.role, body.note ?? null, expiresAt, now)
    .run();

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'invitation.create',
    entityType: 'invitation',
    entityId: id,
    homecellId,
    after: { role: body.role, expiresAt },
    ip: clientIp(c.req.raw),
  });

  return json(
    {
      id,
      // Returned once, never retrievable again.
      token,
      role: body.role,
      expiresAt,
    },
    requestId,
    201,
  );
});

// ---------------------------------------------------------------------------
// DELETE /api/invitations/:id — revoke
// ---------------------------------------------------------------------------
invitations.delete('/:id', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'manage_invitations');
  const id = c.req.param('id');

  const invite = await c.env.DB
    .prepare('SELECT id, homecell_id, created_by, used_at, revoked_at FROM invitations WHERE id = ?')
    .bind(id)
    .first<{ id: string; homecell_id: string; created_by: string; used_at: string | null; revoked_at: string | null }>();

  if (!invite) throw ApiError.notFound('That invitation could not be found.');

  const scope = await getUserScope(c.env.DB, user);
  await assertHomecellAccess(c.env.DB, scope, invite.homecell_id);

  if (invite.revoked_at) throw ApiError.conflict('That invitation has already been revoked.');
  if (invite.used_at) {
    throw ApiError.conflict('That invitation has already been used and cannot be revoked.');
  }

  await c.env.DB
    .prepare('UPDATE invitations SET revoked_at = ? WHERE id = ?')
    .bind(nowIso(), id)
    .run();

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'invitation.revoke',
    entityType: 'invitation',
    entityId: id,
    homecellId: invite.homecell_id,
    ip: clientIp(c.req.raw),
  });

  return json({ ok: true }, requestId);
});

export default invitations;
