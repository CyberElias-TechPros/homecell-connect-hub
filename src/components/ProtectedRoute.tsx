import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRouteProps } from '@/types';

/**
 * Client-side route guard.
 *
 * This is a convenience so users are not shown screens they cannot use. It is
 * NOT a security boundary — the Worker authorises every request independently.
 */
export function ProtectedRoute({
  children,
  requiredPermissions,
  requiredRoles,
  fallbackPath = '/dashboard',
}: ProtectedRouteProps) {
  const { isAuthenticated, isReady, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  // Wait for the session probe before deciding, otherwise a signed-in user
  // gets bounced to the login page on every refresh.
  if (!isReady) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Remember where they were headed so we can return them after signing in.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAll = requiredPermissions.every((permission) => hasPermission(permission));
    if (!hasAll) return <Navigate to={fallbackPath} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasAny = requiredRoles.some((role) => hasRole(role));
    if (!hasAny) return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
