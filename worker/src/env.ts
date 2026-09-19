/** Cloudflare Worker environment bindings. */
export interface Env {
  /** D1 relational database. */
  DB: D1Database;
  /** KV namespace: cached public config, rate-limit counters, feature flags. */
  CACHE: KVNamespace;
  /** R2 bucket: uploaded materials, avatars. */
  STORAGE: R2Bucket;
  /** 'development' | 'staging' | 'production' */
  ENVIRONMENT: string;
  /** Comma-separated allowed CORS origins. */
  ALLOWED_ORIGINS?: string;
  /** 'log' (default, safe) | 'resend' | 'termii' | 'twilio' | 'whatsapp' */
  MESSAGING_DRIVER?: string;
  /** Optional secrets — absent means the related integration is disabled. */
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  TERMII_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
}

export interface Variables {
  user: AuthenticatedUser | null;
  requestId: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  role: import('../../shared/permissions').UserRole;
  status: string;
  memberStatus: string;
  homecellId: string | null;
  avatarUrl: string | null;
  isFirstTimer: boolean;
}

export type AppEnv = { Bindings: Env; Variables: Variables };
