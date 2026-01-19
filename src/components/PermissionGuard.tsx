import React from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { UserRole } from '@/types';

interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  role?: UserRole;
  roles?: UserRole[];
  requireAll?: boolean; // For permissions array
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({
  permission,
  permissions,
  role,
  roles,
  requireAll = false,
  fallback = null,
  children
}: PermissionGuardProps) {
  const { hasPermission, hasRole, hasAnyRole, hasAllPermissions } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : permissions.some(p => hasPermission(p));
  } else if (role) {
    hasAccess = hasRole(role);
  } else if (roles) {
    hasAccess = hasAnyRole(roles);
  } else {
    // If no conditions specified, allow access
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Convenience components
export function IfHasPermission({ permission, children, fallback }: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard permission={permission} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function IfHasRole({ role, children, fallback }: {
  role: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard role={role} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function IfHasAnyRole({ roles, children, fallback }: {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard roles={roles} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}