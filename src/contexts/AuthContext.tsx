import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ApiError, type MeResponse, type Role, type SessionUser } from '../lib/api';

/**
 * Authentication backed by the real API.
 *
 * Role and permissions are supplied by the server and are never chosen by the
 * client. The frontend uses them only to decide what to render — the Worker
 * enforces every rule independently, so tampering with this state in devtools
 * grants nothing.
 */

export type UserRole = Role;

export interface User {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  role: UserRole;
  status: SessionUser['status'];
  avatar?: string | null;
  homecellId?: string | null;
  homecellName?: string | null;
  isFirstTimer?: boolean;
  memberStatus?: string;
  preferredName?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True once the initial session probe has finished (success or failure). */
  isReady: boolean;
  user: User | null;
  permissions: string[];
  error: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ nextStep: string }>;
  requestOtp: (phone: string) => Promise<{ delivered: boolean; messagingConfigured: boolean; message: string }>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  refresh: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  /** True while the account is awaiting leader approval. */
  isPendingApproval: boolean;
}

export interface RegisterInput {
  name: string;
  phone?: string;
  email?: string;
  password: string;
  city?: string;
  country?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  occupation?: string;
  howHeard?: string;
  isFirstTimer?: boolean;
  inviteToken?: string;
  consentDataProcessing: boolean;
  consentWhatsapp?: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapUser(raw: SessionUser, homecellName?: string | null): User {
  return {
    id: raw.id,
    name: raw.name,
    preferredName: raw.preferredName,
    phone: raw.phone,
    email: raw.email,
    role: raw.role,
    status: raw.status,
    avatar: raw.avatarUrl,
    homecellId: raw.homecellId,
    homecellName: homecellName ?? null,
    isFirstTimer: raw.isFirstTimer,
    memberStatus: raw.memberStatus,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Restore an existing session, if any. Silent on failure. */
  const refresh = useCallback(async () => {
    try {
      const me = await api.get<MeResponse>('/api/auth/me');
      setUser(mapUser(me.user, me.homecell?.name));
      setPermissions(me.permissions ?? []);
    } catch (err) {
      // A 401 simply means "not signed in" — not an error worth surfacing.
      if (!(err instanceof ApiError && err.isUnauthorized)) {
        if (err instanceof ApiError && err.isOffline) setError(err.message);
      }
      setUser(null);
      setPermissions([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.post<{ user: SessionUser }>('/api/auth/login', { identifier, password });
      const me = await api.get<MeResponse>('/api/auth/me');
      setUser(mapUser(result.user, me.homecell?.name));
      setPermissions(me.permissions ?? []);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'We could not sign you in.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.post<{ user: SessionUser; nextStep: string }>('/api/auth/register', input);
      const me = await api.get<MeResponse>('/api/auth/me');
      setUser(mapUser(result.user, me.homecell?.name));
      setPermissions(me.permissions ?? []);
      return { nextStep: result.nextStep };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'We could not complete your registration.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    setError(null);
    try {
      return await api.post<{ delivered: boolean; messagingConfigured: boolean; message: string }>(
        '/api/auth/otp/request',
        { phone },
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'We could not send a code.';
      setError(message);
      throw err;
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post<{ user: SessionUser }>('/api/auth/otp/verify', { phone, code });
      const me = await api.get<MeResponse>('/api/auth/me');
      setUser(mapUser(me.user, me.homecell?.name));
      setPermissions(me.permissions ?? []);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'That code could not be verified.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Even if the server call fails, drop local state so the UI reflects
      // the user's intent. The session will expire server-side regardless.
    }
    setUser(null);
    setPermissions([]);
    setError(null);
  }, []);

  const updateProfile = useCallback((data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  }, []);

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions],
  );

  const hasRole = useCallback((role: UserRole) => user?.role === role, [user]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(user),
        isLoading,
        isReady,
        user,
        permissions,
        error,
        login,
        register,
        requestOtp,
        verifyOtp,
        logout,
        updateProfile,
        refresh,
        hasPermission,
        hasRole,
        isPendingApproval: user?.status === 'pending',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
