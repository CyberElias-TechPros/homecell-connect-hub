import { ApiError } from './errors';
import { nowIso } from './ids';

/**
 * Fixed-window rate limiter backed by D1.
 *
 * Deliberately simple: a single atomic UPSERT per check, no background jobs.
 * Good enough to stop credential stuffing and registration spam at the scale
 * this application operates at. If traffic grows, move the counter to a
 * Durable Object for precise windowing without losing the interface here.
 */
export async function enforceRateLimit(
  db: D1Database,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString();
  const key = `${bucket}:${windowStart}`;

  const row = await db
    .prepare(
      `INSERT INTO rate_limits (bucket, count, window_start)
       VALUES (?, 1, ?)
       ON CONFLICT(bucket) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(key, windowStart)
    .first<{ count: number }>();

  if (row && row.count > limit) {
    throw ApiError.rateLimited();
  }
}

/** Opportunistic cleanup of expired counter rows. Called from a cron trigger. */
export async function pruneRateLimits(db: D1Database, olderThanMs = 24 * 60 * 60 * 1000): Promise<void> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(cutoff).run();
}

export { nowIso };
