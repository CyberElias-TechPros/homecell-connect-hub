/**
 * Support for tests that talk to a genuinely running backend.
 *
 * These tests are only meaningful when the Worker and Vite dev server are up.
 * They are skipped (not silently passed) when the API cannot be reached, so a
 * green run never implies coverage that did not happen.
 *
 * Node's `fetch` has no cookie jar, so a session established by logging in is
 * carried manually in a Cookie header on every subsequent request — which is
 * exactly what a browser would do.
 */

export const API_BASE = process.env.TEST_API_BASE ?? 'http://127.0.0.1:8080';

let sessionCookie: string | null = null;

/**
 * Sessions are cached per account.
 *
 * A real browser logs in once and keeps the cookie; the server's login rate
 * limit (20 per 15 minutes per IP) is a genuine protection that should not be
 * relaxed for tests, so the harness behaves like a browser instead.
 */
const sessionCache = new Map<string, string>();

export function getSessionCookie(): string | null {
  return sessionCookie;
}

export function clearSession(): void {
  sessionCookie = null;
}

/** The real Node fetch, captured before any patching. */
const realFetch = globalThis.fetch.bind(globalThis);

/**
 * Install a fetch that resolves relative URLs against API_BASE and attaches the
 * current session cookie. jsdom has no fetch of its own, so this also provides
 * the global the components expect.
 */
export function installLiveFetch(): void {
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith('/')) url = `${API_BASE}${url}`;

    const headers = new Headers(init?.headers ?? {});
    if (sessionCookie && !headers.has('cookie')) headers.set('cookie', sessionCookie);

    return realFetch(url, { ...init, headers });
  }) as typeof fetch;
}

/** Returns a raw token from a Set-Cookie header, or null. */
function sessionFrom(response: Response): string | null {
  const raw = response.headers.get('set-cookie');
  if (!raw) return null;
  const match = raw.match(/hcc_session=[^;]+/);
  return match ? match[0] : null;
}

export interface TestUser {
  phone: string;
  password: string;
  name: string;
}

/** The seeded demo cell leader. */
export const LEADER: TestUser = {
  phone: '+2348051112222',
  password: process.env.TEST_LEADER_PASSWORD ?? 'GraceLife2026!',
  name: 'Pastor John',
};

/**
 * A member created for the duration of a test run. Registration is the only way
 * to create a member through the API, so the tests use the same path a real
 * person would.
 */
/**
 * Deterministic phone numbers for test accounts.
 *
 * These sit in the 80 5xx xxxx range, far from any number a person is likely to
 * hold, and they are fixed so that re-running the suite logs into the accounts
 * the first run created rather than registering new ones. The server's
 * registration limit (10 per hour per IP) is a real protection, and a test
 * suite should not need it relaxed.
 *
 * Nigerian mobile numbers in E.164 are +234 followed by 10 digits.
 */
let phoneCounter = 0;
export function freshPhone(): string {
  phoneCounter += 1;
  return `+23480500${String(phoneCounter).padStart(4, '0')}`;
}

/** Log in (once per account) and remember the session for later calls. */
export async function login(user: TestUser): Promise<Record<string, unknown>> {
  const cached = sessionCache.get(user.phone);
  if (cached) {
    sessionCookie = cached;
    const me = await realFetch(`${API_BASE}/api/auth/me`, { headers: { cookie: cached } });
    const body = await me.json();
    if (body.success) return body.data.user;
    // The cached session expired — fall through and log in again.
    sessionCache.delete(user.phone);
  }

  const response = await realFetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // Login accepts a single `identifier` field, not `phone`.
    body: JSON.stringify({ identifier: user.phone, password: user.password }),
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(`Login failed for ${user.phone}: ${JSON.stringify(body.error ?? body)}`);
  }
  const cookie = sessionFrom(response);
  if (!cookie) throw new Error('Login succeeded but no session cookie was returned.');
  sessionCookie = cookie;
  sessionCache.set(user.phone, cookie);
  return body.data.user;
}

/** Register a brand-new member and log them in. */
export async function registerAndLogin(user: {
  name: string;
  phone: string;
  password: string;
}): Promise<Record<string, unknown>> {
  const already = sessionCache.get(user.phone);
  if (already) return login({ ...user, password: user.password });

  const response = await realFetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: user.name,
      phone: user.phone,
      password: user.password,
      consentDataProcessing: true,
    }),
  });
  const body = await response.json();

  // If this account already exists (a previous run created it), sign in
  // instead — the suite is designed to be re-runnable.
  if (!response.ok && (response.status === 409 && /already exists/i.test(body.error?.message ?? ''))) {
    return login({ phone: user.phone, password: user.password, name: user.name });
  }
  if (!response.ok || !body.success) {
    throw new Error(`Registration failed: ${JSON.stringify(body.error ?? body)}`);
  }
  const cookie = sessionFrom(response);
  if (cookie) {
    sessionCookie = cookie;
    sessionCache.set(user.phone, cookie);
  }
  return body.data.user;
}

/**
 * An authenticated JSON call. Throws on a non-2xx so a test fails loudly rather
 * than asserting against an error envelope.
 */
export async function apiCall<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await realFetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(sessionCookie ? { cookie: sessionCookie } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${JSON.stringify(body.error ?? body)}`);
  }
  return body.data as T;
}

/** Like apiCall, but returns the status and envelope instead of throwing. */
export async function apiCallRaw(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<{ status: number; success: boolean; error?: { code: string; message: string } }> {
  const response = await realFetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(sessionCookie ? { cookie: sessionCookie } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, success: Boolean(body.success), error: body.error };
}

/**
 * Is the backend actually running? Used to skip rather than false-pass.
 *
 * `AbortSignal.timeout` is not available under jsdom, so the timeout is done
 * with a controller and a timer instead.
 */
export async function isApiUp(attempts = 4): Promise<boolean> {
  // `wrangler dev` reloads the Worker whenever a server file changes, and a
  // probe that lands in that window would wrongly skip the whole suite. Retry
  // briefly before concluding the backend is down.
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await realFetch(`${API_BASE}/api/public/cell/HC1`, {
        signal: controller.signal,
      });
      if (response.ok) {
        const body = await response.json();
        if (body.success) return true;
      }
    } catch {
      // fall through to the retry
    } finally {
      clearTimeout(timer);
    }
    if (attempt < attempts) await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}
