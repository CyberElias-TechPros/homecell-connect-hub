import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { json, readJson, clientIp } from '../lib/http';
import { newId, nowIso } from '../lib/ids';
import { parseOrThrow } from '../lib/validation';
import { requireUser, requirePermission } from '../auth';
import { getUserScope, getAccessibleHomecellIds, inClause, assertHomecellAccess } from '../lib/scope';
import { writeAudit } from '../lib/audit';
import { isCellLeaderLevel } from '../../../shared/permissions';

/**
 * Testimonies.
 *
 * Access rules, enforced in SQL rather than the client:
 *   * A member sees approved testimonies for their cell, plus their own
 *     submissions at any moderation stage.
 *   * A leader sees everything in the cells they cover, including pending.
 *   * A `leadership`-only testimony is never shown on the public wall.
 *   * Nothing is published publicly without both approval and explicit consent.
 */
const testimonies = new Hono<AppEnv>();

const createSchema = z.object({
  title: z.string().trim().min(3, 'Give your testimony a title.').max(200),
  body: z.string().trim().min(10, 'Please write a little more.').max(8000),
  category: z.string().trim().max(60).optional(),
  visibility: z.enum(['leadership', 'cell', 'public']).optional().default('cell'),
  isAnonymous: z.boolean().optional().default(false),
  /**
   * Consent to appear outside the cell. Only meaningful with `visibility:
   * 'public'`, and required before a leader can share it wider.
   */
  consentToSharePublicly: z.boolean().optional().default(false),
}).refine((data) => data.visibility !== 'public' || data.consentToSharePublicly, {
  // Asking for public sharing without consent is a contradiction. Silently
  // storing it as private would let the author believe their testimony is
  // going out publicly when it is not, so the request is refused instead.
  path: ['consentToSharePublicly'],
  message: 'Public sharing needs your consent. Tick the box, or choose another audience.',
});

const reviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(2000).optional(),
});

const SELECT_FIELDS = `
  t.id, t.homecell_id AS homecellId, t.author_id AS authorId,
  t.is_anonymous AS isAnonymous, t.title, t.body, t.category,
  t.visibility, t.status, t.shared_publicly AS sharedPublicly,
  t.consent_public AS consentPublic,
  t.reviewed_by AS reviewedBy, t.reviewed_at AS reviewedAt,
  t.review_note AS reviewNote, t.published_at AS publishedAt,
  t.created_at AS createdAt, t.updated_at AS updatedAt,
  a.name AS authorName, r.name AS reviewedByName,
  CASE WHEN t.author_id = ? THEN 1 ELSE 0 END AS isMine`;

// ---------------------------------------------------------------------------
// GET /api/testimonies
// ---------------------------------------------------------------------------
testimonies.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);

  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);
  const statusFilter = c.req.query('status');
  const leader = isCellLeaderLevel(user.role);

  const where: string[] = [];
  const bindings: unknown[] = [];

  if (allowed !== null) {
    if (allowed.length === 0) return json({ testimonies: [], summary: emptySummary() }, requestId);
    const clause = inClause(allowed);
    where.push(`t.homecell_id IN ${clause.sql}`);
    bindings.push(...clause.bindings);
  }

  if (leader) {
    // Leaders may see everything, but can narrow by status.
    if (statusFilter) {
      where.push('t.status = ?');
      bindings.push(statusFilter);
    }
  } else {
    // A member sees approved cell-visible testimonies, plus their own.
    where.push("((t.status = 'approved' AND t.visibility != 'leadership') OR t.author_id = ?)");
    bindings.push(user.id);
  }

  const { results } = await c.env.DB
    .prepare(
      `SELECT ${SELECT_FIELDS}
         FROM testimonies t
         LEFT JOIN users a ON a.id = t.author_id
         LEFT JOIN users r ON r.id = t.reviewed_by
        WHERE ${where.length ? where.join(' AND ') : '1 = 1'}
        ORDER BY
          CASE t.status WHEN 'pending' THEN 0 ELSE 1 END,
          t.created_at DESC
        LIMIT 200`,
    )
    .bind(user.id, ...bindings)
    .all();

  const rows = (results as {
    isAnonymous: number; isMine: number; sharedPublicly: number; authorName: string | null;
    status: string; visibility: string;
  }[]).map((t) => ({
    ...t,
    // SQLite stores these as 0/1. Everything else in the API envelope uses real
    // booleans, so they are converted rather than leaking integers to clients.
    isAnonymous: t.isAnonymous === 1,
    isMine: t.isMine === 1,
    sharedPublicly: t.sharedPublicly === 1,
    // Anonymous authorship is never disclosed, including to leaders.
    authorName: t.isAnonymous === 1 ? null : t.authorName,
  }));

  return json(
    {
      testimonies: rows,
      summary: {
        total: rows.length,
        pending: rows.filter((t) => t.status === 'pending').length,
        approved: rows.filter((t) => t.status === 'approved').length,
        rejected: rows.filter((t) => t.status === 'rejected').length,
        public: rows.filter((t) => t.sharedPublicly && t.status === 'approved').length,
      },
    },
    requestId,
  );
});

// ---------------------------------------------------------------------------
// POST /api/testimonies — a member submits
// ---------------------------------------------------------------------------
testimonies.post('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const body = parseOrThrow(createSchema, await readJson(c.req.raw));

  if (!user.homecellId) {
    throw ApiError.validation('You need to be part of a cell before sharing a testimony.');
  }

  const now = nowIso();
  const id = newId('tst');

  // A submission never publishes anything by itself. It is stored with
  // `shared_publicly = 0` and `status = 'pending'`; the author's wish to share
  // it publicly is recorded as consent and acted on at approval time. Writing
  // the wish directly onto the row would breach the publish guard
  // (`shared_publicly = 0 OR status = 'approved'`) and, more importantly, would
  // mark something as publicly shared before any leader had seen it.
  const wantsPublic = body.visibility === 'public' && body.consentToSharePublicly;

  await c.env.DB
    .prepare(
      `INSERT INTO testimonies
         (id, homecell_id, author_id, is_anonymous, title, body, category,
          visibility, status, shared_publicly, consent_public, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      id, user.homecellId, user.id, body.isAnonymous ? 1 : 0,
      body.title, body.body, body.category ?? null,
      body.visibility, 'pending', 0, wantsPublic ? 1 : 0, now, now,
    )
    .run();

  // The account-level consent record is a *state*, unique per user and type, so
  // it is upserted rather than appended. The per-testimony consent that governs
  // publication is the `consent_public` column written above.
  await c.env.DB
    .prepare(
      `INSERT INTO consent_records (id, user_id, consent_type, granted, policy_version, recorded_at, ip)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(user_id, consent_type, policy_version)
       DO UPDATE SET granted = excluded.granted, recorded_at = excluded.recorded_at, ip = excluded.ip`,
    )
    .bind(
      newId('con'),
      user.id,
      'testimony_public',
      wantsPublic ? 1 : 0,
      'v1',
      now,
      clientIp(c.req.raw),
    )
    .run();

  // Let the cell's leaders know there is something to review.
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
      .bind(newId('ntf'), leader.id, 'testimony_submitted', 'A testimony is awaiting review',
            'Open the testimony queue to approve or decline it.', '/testimonies', 'info', now)
      .run();
  }

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'testimony.submit',
    entityType: 'testimony',
    entityId: id,
    homecellId: user.homecellId,
    after: { visibility: body.visibility, isAnonymous: body.isAnonymous, wantsPublic },
    ip: clientIp(c.req.raw),
  });

  return json({ id, status: 'pending', message: 'Thank you. Your testimony has been sent for review.' }, requestId, 201);
});

// ---------------------------------------------------------------------------
// PATCH /api/testimonies/:id/review — leader approves or declines
// ---------------------------------------------------------------------------
testimonies.patch('/:id/review', async (c) => {
  const requestId = c.get('requestId');
  const user = requirePermission(c, 'manage_prayer_requests');
  const id = c.req.param('id');
  const body = parseOrThrow(reviewSchema, await readJson(c.req.raw));

  const existing = await c.env.DB
    .prepare('SELECT id, homecell_id, status, shared_publicly FROM testimonies WHERE id = ?')
    .bind(id)
    .first<{ id: string; homecell_id: string; status: string; shared_publicly: number }>();

  if (!existing) throw ApiError.notFound('That testimony could not be found.');

  const scope = await getUserScope(c.env.DB, user);
  await assertHomecellAccess(c.env.DB, scope, existing.homecell_id);

  if (existing.status !== 'pending') {
    throw ApiError.conflict(`That testimony has already been ${existing.status}.`);
  }

  // Approval is the moment a testimony may go wider. The author's consent was
  // recorded at submission; it is honoured here and nowhere else.
  const testimony = await c.env.DB
    .prepare('SELECT consent_public FROM testimonies WHERE id = ?')
    .bind(id)
    .first<{ consent_public: number }>();

  const maySharePublicly = body.decision === 'approved' && testimony?.consent_public === 1;

  const now = nowIso();
  await c.env.DB
    .prepare(
      `UPDATE testimonies
          SET status = ?, reviewed_by = ?, reviewed_at = ?, review_note = ?,
              published_at = ?, shared_publicly = ?, updated_at = ?
        WHERE id = ?`,
    )
    .bind(
      body.decision, user.id, now, body.note ?? null,
      body.decision === 'approved' ? now : null,
      maySharePublicly ? 1 : 0, now, id,
    )
    .run();

  // Tell the author the outcome.
  const author = await c.env.DB
    .prepare('SELECT author_id FROM testimonies WHERE id = ?')
    .bind(id)
    .first<{ author_id: string | null }>();

  if (author?.author_id && author.author_id !== user.id) {
    await c.env.DB
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, link, severity, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
      )
      .bind(
        newId('ntf'), author.author_id,
        body.decision === 'approved' ? 'testimony_approved' : 'testimony_declined',
        body.decision === 'approved' ? 'Your testimony was approved' : 'Your testimony was not published',
        body.decision === 'approved'
          ? 'It is now visible to the cell. Thank you for sharing.'
          : (body.note ?? 'Please speak with your cell leader if you would like to know more.'),
        '/testimonies',
        body.decision === 'approved' ? 'success' : 'warning',
        now,
      )
      .run();
  }

  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: `testimony.${body.decision}`,
    entityType: 'testimony',
    entityId: id,
    homecellId: existing.homecell_id,
    before: { status: existing.status },
    after: { status: body.decision, note: body.note, sharedPublicly: maySharePublicly },
    ip: clientIp(c.req.raw),
  });

  return json({ ok: true, status: body.decision }, requestId);
});

// ---------------------------------------------------------------------------
// DELETE /api/testimonies/:id — the author withdraws their own submission
// ---------------------------------------------------------------------------
testimonies.delete('/:id', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const id = c.req.param('id');

  const existing = await c.env.DB
    .prepare('SELECT id, homecell_id, author_id FROM testimonies WHERE id = ?')
    .bind(id)
    .first<{ id: string; homecell_id: string; author_id: string | null }>();

  if (!existing) throw ApiError.notFound('That testimony could not be found.');

  // An author may always withdraw their own words.
  if (existing.author_id !== user.id) {
    requirePermission(c, 'manage_prayer_requests');
    const scope = await getUserScope(c.env.DB, user);
    await assertHomecellAccess(c.env.DB, scope, existing.homecell_id);
  }

  await c.env.DB.prepare('DELETE FROM testimonies WHERE id = ?').bind(id).run();
  await writeAudit(c.env.DB, {
    actorId: user.id,
    action: 'testimony.withdraw',
    entityType: 'testimony',
    entityId: id,
    homecellId: existing.homecell_id,
    ip: clientIp(c.req.raw),
  });

  return json({ ok: true }, requestId);
});

function emptySummary() {
  return { total: 0, pending: 0, approved: 0, rejected: 0, public: 0 };
}

export default testimonies;
