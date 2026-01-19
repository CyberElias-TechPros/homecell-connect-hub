import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRouteProps } from '@/types';

export function ProtectedRoute({
  children,
  requiredPermissions,
  requiredRoles,
  fallbackPath = '/'
}: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission, hasRole } = useAuth();

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check required permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => hasPermission(permission));
    if (!hasAllPermissions) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Check required roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasAnyRole = requiredRoles.some(role => hasRole(role));
    if (!hasAnyRole) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return <>{children}</>;
}