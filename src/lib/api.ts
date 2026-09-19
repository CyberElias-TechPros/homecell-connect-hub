/**
 * Typed API client.
 *
 * The single place the frontend talks to the backend. Responsibilities:
 *   * resolve the base URL (same-origin in dev via the Vite proxy, or an
 *     explicit VITE_API_URL when the API is deployed separately)
 *   * send cookies (`credentials: 'include'`)
 *   * unwrap the `{ success, data }` envelope
 *   * turn error envelopes into an ApiError carrying field-level validation
 *     details so forms can highlight the offending input
 *   * never invent success — a network failure is always surfaced as failure
 */

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, string> | unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ApiErrorShape['details'];

  constructor(status: number, shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = shape.code;
    this.details = shape.details;
  }

  /** Field-level messages, when the failure was a validation error. */
  get fieldErrors(): Record<string, string> {
    const d = this.details;
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
        if (typeof v === 'string') out[k] = v;
      }
      return out;
    }
    return {};
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isOffline(): boolean {
    return this.code === 'NETWORK_ERROR';
  }
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Query parameters; undefined/empty values are omitted. */
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    // Distinguish a genuine network failure from an application error so the
    // UI can offer "retry" rather than a confusing validation message.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'We could not reach the server. Check your connection and try again.',
    });
  }

  // 204 or an empty body should not blow up JSON parsing.
  const text = await response.text();
  if (!text) {
    if (response.ok) return undefined as T;
    throw new ApiError(response.status, { code: 'INTERNAL_ERROR', message: 'The server returned an empty response.' });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new ApiError(response.status, {
      code: 'INTERNAL_ERROR',
      message: 'The server returned an unexpected response.',
    });
  }

  const envelope = payload as { success?: boolean; data?: T; error?: ApiErrorShape };

  if (envelope.success === true) return envelope.data as T;
  if (envelope.error) throw new ApiError(response.status, envelope.error);

  throw new ApiError(response.status, {
    code: 'INTERNAL_ERROR',
    message: 'The server returned an unexpected response.',
  });
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    apiRequest<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown, query?: RequestOptions['query']) =>
    apiRequest<T>(path, { method: 'POST', body, query }),
  patch: <T>(path: string, body?: unknown, query?: RequestOptions['query']) =>
    apiRequest<T>(path, { method: 'PATCH', body, query }),
  del: <T>(path: string, query?: RequestOptions['query']) =>
    apiRequest<T>(path, { method: 'DELETE', query }),
};

// ---------------------------------------------------------------------------
// Shared response types
// ---------------------------------------------------------------------------

export type Role =
  | 'member' | 'leader' | 'assistant' | 'provider'
  | 'zonal' | 'area' | 'district' | 'admin' | 'super_admin';

export interface SessionUser {
  id: string;
  name: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  status: 'pending' | 'active' | 'suspended' | 'archived';
  memberStatus: string;
  homecellId: string | null;
  avatarUrl: string | null;
  isFirstTimer: boolean;
}

export interface HomecellSummary {
  id: string;
  name: string;
  code: string;
  meeting_day: string | null;
  meeting_time: string | null;
  timezone: string;
  meeting_link: string | null;
  meeting_platform: string | null;
}

export interface MeResponse {
  user: SessionUser;
  homecell: HomecellSummary | null;
  permissions: string[];
}
