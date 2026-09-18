import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { json } from '../lib/http';
import { sha256 } from '../lib/crypto';
import { nowIso } from '../lib/ids';

/**
 * Unauthenticated endpoints used by the public cell landing page and the
 * invitation flow. These deliberately expose the minimum needed to decide
 * whether to join — never member data, contact details, or anything private.
 */
const pub = new Hono<AppEnv>();

/** Everything the public landing page needs about a cell. */
pub.get('/cell/:code', async (c) => {
  const requestId = c.get('requestId');
  const code = c.req.param('code');

  const cell = await c.env.DB
    .prepare(
      `SELECT h.id, h.name, h.code, h.address, h.meeting_day, h.meeting_time, h.timezone,
              h.meeting_link, h.meeting_platform, h.description, h.welcome_message,
              h.is_active,
              u.name AS leader_name,
              (SELECT COUNT(*) FROM users m WHERE m.homecell_id = h.id AND m.status = 'active') AS member_count
         FROM homecells h
         LEFT JOIN users u ON u.id = h.leader_id
        WHERE h.code = ?`,
    )
    .bind(code)
    .first<{
      id: string; name: string; code: string; address: string | null; meeting_day: string | null;
      meeting_time: string | null; timezone: string; meeting_link: string | null; meeting_platform: string | null;
      description: string | null; welcome_message: string | null; is_active: number;
      leader_name: string | null; member_count: number;
    }>();

  if (!cell) throw ApiError.notFound('We could not find that cell.');
  if (cell.is_active !== 1) throw ApiError.notFound('That cell is not currently meeting.');

  return json(
    {
      id: cell.id,
      name: cell.name,
      code: cell.code,
      address: cell.address,
      meetingDay: cell.meeting_day,
      meetingTime: cell.meeting_time,
      timezone: cell.timezone,
      meetingPlatform: cell.meeting_platform,
      description: cell.description,
      welcomeMessage: cell.welcome_message,
      leaderName: cell.leader_name,
      memberCount: cell.member_count,
      // Only reveal the join link once someone is a member — it is not a
      // public broadcast URL and may contain a passcode.
      canJoinNow: Boolean(cell.meeting_link),
    },
    requestId,
  );
});

/** Resolve an invitation token so the join page can show which cell it is for. */
pub.get('/invite/:token', async (c) => {
  const requestId = c.get('requestId');
  const token = c.req.param('token');
  const tokenHash = await sha256(token);

  const invite = await c.env.DB
    .prepare(
      `SELECT i.id, i.role, i.expires_at, i.used_at, i.revoked_at, i.note,
              h.id AS homecell_id, h.name AS homecell_name, h.meeting_day, h.meeting_time,
              h.timezone, h.welcome_message,
              u.name AS inviter_name
         FROM invitations i
         JOIN homecells h ON h.id = i.homecell_id
         LEFT JOIN users u ON u.id = i.created_by
        WHERE i.token_hash = ?`,
    )
    .bind(tokenHash)
    .first<{
      id: string; role: string; expires_at: string; used_at: string | null; revoked_at: string | null;
      note: string | null; homecell_id: string; homecell_name: string; meeting_day: string | null;
      meeting_time: string | null; timezone: string; welcome_message: string | null; inviter_name: string | null;
    }>();

  if (!invite) throw new ApiError('NOT_FOUND', 'This invitation link is not valid.');

  // Report the specific reason so invitees are not left confused, but do not
  // reveal anything about the cell beyond its name in the failure case.
  if (invite.revoked_at) throw new ApiError('INVITE_REVOKED', 'This invitation has been revoked. Please ask for a new link.');
  if (invite.used_at) throw new ApiError('INVITE_USED', 'This invitation has already been used. Please sign in, or ask for a new link.');
  if (invite.expires_at <= nowIso()) throw new ApiError('INVITE_EXPIRED', 'This invitation has expired. Please ask for a new link.');

  return json(
    {
      role: invite.role,
      note: invite.note,
      inviterName: invite.inviter_name,
      homecell: {
        id: invite.homecell_id,
        name: invite.homecell_name,
        meetingDay: invite.meeting_day,
        meetingTime: invite.meeting_time,
        timezone: invite.timezone,
        welcomeMessage: invite.welcome_message,
      },
    },
    requestId,
  );
});

export default pub;
