/**
 * Cryptographic primitives — all via WebCrypto, which is available natively
 * in the Workers runtime. No third-party hashing dependency.
 */

/**
 * PBKDF2 iteration count.
 *
 * Workers have a CPU-time budget per request (10 ms on the free plan, far
 * higher on paid). PBKDF2-HMAC-SHA256 is deliberately slow, so this value is
 * a security/budget trade-off that was measured rather than guessed:
 * see worker/src/lib/crypto.test.ts.
 *
 * 100_000 is the OWASP-recommended floor for PBKDF2-SHA256 and is kept here
 * because it is affordable on Workers Paid. Deploying on the free plan should
 * lower this to 25_000 (still a meaningful work factor) — the stored
 * `password_iterations` column means old hashes keep verifying after a change.
 */
export const PBKDF2_ITERATIONS = 100_000;

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomSalt(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toBase64(buf);
}

async function derive(password: string, salt: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations,
      hash: 'SHA-256',
    },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

export interface PasswordHash {
  hash: string;
  salt: string;
  iterations: number;
}

export async function hashPassword(
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<PasswordHash> {
  const salt = randomSalt();
  const hash = await derive(password, salt, iterations);
  return { hash, salt, iterations };
}

/**
 * Verify a password against a stored hash.
 *
 * Returns false (never throws) for malformed input so that callers cannot
 * accidentally leak database structure through error messages.
 * Comparison is constant-time with respect to the digest contents.
 */
export async function verifyPassword(
  password: string,
  stored: { password_hash: string | null; password_salt: string | null; password_iterations: number | null },
): Promise<boolean> {
  if (!stored.password_hash || !stored.password_salt) return false;
  const iterations = stored.password_iterations ?? PBKDF2_ITERATIONS;
  const candidate = await derive(password, stored.password_salt, iterations);
  return timingSafeEqual(candidate, stored.password_hash);
}

/** Constant-time string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** SHA-256 of a value, base64url — used to store session/invite tokens at rest. */
export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toBase64(new Uint8Array(digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Numeric one-time passcode of the given length, uniformly distributed. */
export function generateOtp(length = 6): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += String(bytes[i] % 10);
  return out;
}

export { toBase64, fromBase64 };
