/**
 * Shared authorization model.
 *
 * This module is imported by BOTH the Cloudflare Worker (to enforce access)
 * and the frontend (to hide what a user cannot do). The frontend copy is a
 * convenience only — the Worker is the sole authority. Never rely on the
 * client to enforce anything in here.
 */

export const USER_ROLES = [
  'member',
  'leader',
  'assistant',
  'provider',
  'zonal',
  'area',
  'district',
  'admin',
  'super_admin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * Administrative scope of a role. Determines which slice of the hierarchy a
 * user may read, and is the basis for row-level filtering in the Worker.
 *
 *   own        -> only their own record
 *   homecell   -> their homecell only
 *   zone       -> every homecell inside their zone
 *   area       -> every zone inside their area
 *   district   -> every area inside their district
 *   global     -> everything in the organisation
 */
export const ROLE_SCOPE: Record<UserRole, 'own' | 'homecell' | 'zone' | 'area' | 'district' | 'global'> = {
  member: 'own',
  leader: 'homecell',
  assistant: 'homecell',
  provider: 'homecell',
  zonal: 'zone',
  area: 'area',
  district: 'district',
  admin: 'global',
  super_admin: 'global',
};

export const ALL_PERMISSIONS = [
  // profile
  'view_own_profile',
  'edit_own_profile',
  // members
  'view_homecell_members',
  'add_homecell_members',
  'edit_homecell_members',
  'remove_homecell_members',
  // attendance
  'view_attendance',
  'mark_attendance',
  'edit_attendance',
  // reports
  'view_homecell_reports',
  'submit_homecell_reports',
  'approve_homecell_reports',
  // follow-up
  'view_followups',
  'manage_followups',
  'assign_followups',
  // prayer
  'view_prayer_requests',
  'view_private_prayer_requests',
  'manage_prayer_requests',
  // announcements
  'view_announcements',
  'create_announcements',
  'manage_announcements',
  // materials
  'view_materials',
  'download_materials',
  'upload_materials',
  'manage_materials',
  // hierarchy
  'view_zone_data',
  'manage_zone_data',
  'view_area_data',
  'manage_area_data',
  'view_district_data',
  'manage_district_data',
  // platform
  'manage_users',
  'manage_invitations',
  'view_audit_logs',
  'system_admin',
  // homecell configuration
  'manage_homecell_settings',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

const CELL_MEMBER_BASE: Permission[] = [
  'view_own_profile',
  'edit_own_profile',
  'view_homecell_members',
  'view_attendance',
  'view_homecell_reports',
  'view_announcements',
  'view_materials',
  'download_materials',
  'view_followups',
  'view_prayer_requests',
];

const CELL_WORKER: Permission[] = [
  ...CELL_MEMBER_BASE,
  'add_homecell_members',
  'edit_homecell_members',
  'mark_attendance',
  'edit_attendance',
  'submit_homecell_reports',
  'manage_followups',
  'assign_followups',
  'view_private_prayer_requests',
  'manage_prayer_requests',
  'manage_invitations',
  'manage_homecell_settings',
];

const ZONAL: Permission[] = [
  ...CELL_WORKER,
  'remove_homecell_members',
  'approve_homecell_reports',
  'create_announcements',
  'view_zone_data',
  'manage_zone_data',
];

const AREA: Permission[] = [
  ...ZONAL,
  'view_area_data',
  'manage_area_data',
];

const DISTRICT: Permission[] = [
  ...AREA,
  'view_district_data',
  'manage_district_data',
];

const ADMIN: Permission[] = [
  ...DISTRICT,
  'manage_announcements',
  'manage_materials',
  'upload_materials',
  'manage_users',
  'view_audit_logs',
  'system_admin',
];

/**
 * Role -> permissions. Ordered least to most privileged so that higher roles
 * inherit everything below them, which keeps the matrix consistent as it grows.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  member: CELL_MEMBER_BASE,
  leader: CELL_WORKER,
  assistant: CELL_WORKER,
  provider: CELL_WORKER,
  zonal: ZONAL,
  area: AREA,
  district: DISTRICT,
  admin: ADMIN,
  super_admin: ALL_PERMISSIONS as unknown as Permission[],
};

/** Numeric rank, useful for "must be at least a leader" style checks. */
export const ROLE_RANK: Record<UserRole, number> = {
  member: 0,
  provider: 1,
  assistant: 2,
  leader: 3,
  zonal: 4,
  area: 5,
  district: 6,
  admin: 7,
  super_admin: 8,
};

export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const list = ROLE_PERMISSIONS[role];
  if (!list) return false;
  return list.includes(permission);
}

export function hasAnyPermission(role: UserRole | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function atLeastRole(role: UserRole | null | undefined, minimum: UserRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Roles that may see a homecell's private pastoral data. */
export function isCellLeaderLevel(role: UserRole | null | undefined): boolean {
  return atLeastRole(role, 'leader');
}

export function isGlobalAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}
