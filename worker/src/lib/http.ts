import type { Env } from '../env';
import { ApiError, type ApiResponse } from './errors';

export const SESSION_COOKIE = 'hcc_session';

export function json<T>(data: T, requestId: string, status = 200, headers?: HeadersInit): Response {
  const body: ApiResponse<T> = { success: true, data, requestId };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...Object.fromEntries(new Headers(headers ?? {}).entries()),
    },
  });
}

export function errorResponse(err: unknown, requestId: string): Response {
  if (err instanceof ApiError) {
    const body: ApiResponse<never> = {
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
      requestId,
    };
    return new Response(JSON.stringify(body), {
      status: err.status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  // Unexpected: log the real cause, return an opaque message.
  console.error(`[${requestId}] unhandled error:`, err instanceof Error ? err.stack ?? err.message : err);
  const body: ApiResponse<never> = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our end. Please try again.' },
    requestId,
  };
  return new Response(JSON.stringify(body), {
    status: 500,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

/**
 * Build a Set-Cookie value.
 *
 * `Secure` is applied whenever the request arrived over HTTPS. That keeps the
 * cookie usable over plain-HTTP localhost during development while still
 * being Secure in production and in the hosted preview environment.
 */
export function buildCookie(
  name: string,
  value: string,
  opts: { maxAge?: number; secure: boolean; sameSite?: 'Lax' | 'Strict' | 'None' } = { secure: true },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${opts.sameSite ?? 'Lax'}`,
  ];
  if (opts.secure) parts.push('Secure');
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  return parts.join('; ');
}

export function clearCookie(name: string, secure: boolean): string {
  return buildCookie(name, '', { maxAge: 0, secure });
}

export function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

// ---------------------------------------------------------------------------
// CORS
//
// Credentials are used (session cookie), so the origin must be echoed
// explicitly rather than using a wildcard. Anything not on the allowlist gets
// no CORS headers at all.
// ---------------------------------------------------------------------------

export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  if (!origin) return {};
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-requested-with',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** Parse and size-limit a JSON body. Rejects anything that is not an object. */
export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = 64 * 1024): Promise<T> {
  const text = await request.text();
  if (text.length > maxBytes) {
    throw ApiError.validation('Request body is too large.');
  }
  if (!text) return {} as T;
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw ApiError.validation('Request body must be a JSON object.');
    }
    return parsed as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw ApiError.validation('Request body is not valid JSON.');
  }
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
