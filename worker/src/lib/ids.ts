/**
 * Identifier generation.
 *
 * Produces lexicographically sortable, URL-safe ids (ULID-like) so that
 * `ORDER BY id` roughly matches insertion order and index locality is decent.
 * Entropy comes from the platform CSPRNG, never Math.random().
 */

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function encodeTime(now: number, len: number): string {
  let str = '';
  let t = now;
  for (let i = len - 1; i >= 0; i--) {
    const mod = t % 32;
    str = CROCKFORD[mod] + str;
    t = (t - mod) / 32;
  }
  return str;
}

function encodeRandom(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let str = '';
  for (let i = 0; i < len; i++) {
    str += CROCKFORD[bytes[i] % 32];
  }
  return str;
}

/** A sortable unique id, e.g. "01J8ZK3M9Q7F2N4T6B8X1Y0A5C". */
export function newId(prefix?: string): string {
  const id = encodeTime(Date.now(), TIME_LEN) + encodeRandom(RANDOM_LEN);
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * A high-entropy opaque token for invitation links / sessions.
 * Base64url so it is safe in URLs and cookies.
 */
export function newToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Current time as an ISO-8601 UTC string. Single source of truth for writes. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** 'YYYY-MM-DD' for a given instant (UTC). */
export function toDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Add milliseconds to now and return ISO string (used for expiry). */
export function isoIn(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
