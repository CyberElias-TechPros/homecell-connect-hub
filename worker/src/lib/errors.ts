/**
 * Consistent API error envelope.
 *
 * Every failure the client can encounter is expressed as an ApiError with a
 * stable machine-readable `code`. Internal details (SQL text, stack traces)
 * are logged server-side and never returned to the client.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INVITE_EXPIRED'
  | 'INVITE_USED'
  | 'INVITE_REVOKED'
  | 'INTERNAL_ERROR';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INVITE_EXPIRED: 410,
  INVITE_USED: 410,
  INVITE_REVOKED: 410,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }

  static validation(message: string, details?: unknown) {
    return new ApiError('VALIDATION_ERROR', message, details);
  }
  static unauthorized(message = 'Authentication required.') {
    return new ApiError('UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have permission to do that.') {
    return new ApiError('FORBIDDEN', message);
  }
  static notFound(message = 'Not found.') {
    return new ApiError('NOT_FOUND', message);
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError('CONFLICT', message, details);
  }
  static rateLimited(message = 'Too many attempts. Please try again shortly.') {
    return new ApiError('RATE_LIMITED', message);
  }
}

export interface ApiFailure {
  success: false;
  error: { code: ErrorCode; message: string; details?: unknown };
  requestId: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
