import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { UserRole } from '../types';

interface PermissionsContextType {
  // Permission checking
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;

  // Conditional rendering utilities
  renderIfHasPermission: (permission: string, component: ReactNode) => ReactNode;
  renderIfHasRole: (role: UserRole, component: ReactNode) => ReactNode;
  renderIfHasAnyRole: (roles: UserRole[], component: ReactNode) => ReactNode;

  // Guards
  requirePermission: (permission: string) => void;
  requireRole: (role: UserRole) => void;
  requireAnyRole: (roles: UserRole[]) => void;
}

const PermissionsContext = createContext<PermissionsContextType | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const hasPermission = (permission: string): boolean => {
    return auth.hasPermission(permission);
  };

  const hasRole = (role: UserRole): boolean => {
    return auth.hasRole(role);
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.some(role => auth.hasRole(role));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => auth.hasPermission(permission));
  };

  const renderIfHasPermission = (permission: string, component: ReactNode): ReactNode => {
    return hasPermission(permission) ? component : null;
  };

  const renderIfHasRole = (role: UserRole, component: ReactNode): ReactNode => {
    return hasRole(role) ? component : null;
  };

  const renderIfHasAnyRole = (roles: UserRole[], component: ReactNode): ReactNode => {
    return hasAnyRole(roles) ? component : null;
  };

  const requirePermission = (permission: string): void => {
    if (!hasPermission(permission)) {
      throw new Error(`Permission required: ${permission}`);
    }
  };

  const requireRole = (role: UserRole): void => {
    if (!hasRole(role)) {
      throw new Error(`Role required: ${role}`);
    }
  };

  const requireAnyRole = (roles: UserRole[]): void => {
    if (!hasAnyRole(roles)) {
      throw new Error(`One of roles required: ${roles.join(', ')}`);
    }
  };

  return (
    <PermissionsContext.Provider value={{
      hasPermission,
      hasRole,
      hasAnyRole,
      hasAllPermissions,
      renderIfHasPermission,
      renderIfHasRole,
      renderIfHasAnyRole,
      requirePermission,
      requireRole,
      requireAnyRole
    }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}