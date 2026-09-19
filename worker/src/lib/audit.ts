import { newId, nowIso } from './ids';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  homecellId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append an entry to the audit log.
 *
 * Audit writes must never break the operation they are describing, so failures
 * are logged and swallowed. The audit trail is for accountability, not for
 * transactional correctness.
 *
 * Sensitive values must not be passed in `before`/`after` — no passwords,
 * tokens, session ids, or prayer content.
 */
export async function writeAudit(db: D1Database, input: AuditInput): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO audit_logs
           (id, actor_id, action, entity_type, entity_id, homecell_id,
            before_json, after_json, ip, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId('aud'),
        input.actorId ?? null,
        input.action,
        input.entityType ?? null,
        input.entityId ?? null,
        input.homecellId ?? null,
        input.before === undefined ? null : JSON.stringify(input.before),
        input.after === undefined ? null : JSON.stringify(input.after),
        input.ip ?? null,
        input.userAgent ?? null,
        nowIso(),
      )
      .run();
  } catch (err) {
    console.error('audit write failed:', err instanceof Error ? err.message : err);
  }
}
