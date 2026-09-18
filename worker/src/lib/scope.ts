import type { AuthenticatedUser } from '../env';
import { ApiError } from './errors';
import { hasPermission, type Permission } from '../../../shared/permissions';

/**
 * Row-level access scoping.
 *
 * Every list/read endpoint funnels through here so that a user can only ever
 * touch data belonging to the slice of the hierarchy their role covers.
 * This is what prevents cross-cell data leakage (IDOR) — filtering is applied
 * in SQL, not in the client.
 */

/** Where a user sits in the hierarchy, resolved from their homecell. */
export interface UserScope {
  role: AuthenticatedUser['role'];
  level: 'own' | 'homecell' | 'zone' | 'area' | 'district' | 'global';
  homecellId: string | null;
  zoneId: string | null;
  areaId: string | null;
  districtId: string | null;
  organizationId: string | null;
}

interface PlacementRow {
  zone_id: string | null;
  area_id: string | null;
  district_id: string | null;
  organization_id: string | null;
}

/** Resolve a user's position in the hierarchy. */
export async function getUserScope(db: D1Database, user: AuthenticatedUser): Promise<UserScope> {
  const level = LEVEL_BY_ROLE[user.role] ?? 'own';
  const base: UserScope = {
    role: user.role,
    level,
    homecellId: user.homecellId,
    zoneId: null,
    areaId: null,
    districtId: null,
    organizationId: null,
  };

  if (!user.homecellId) return base;

  const row = await db
    .prepare(
      `SELECT z.id AS zone_id, a.id AS area_id, d.id AS district_id, d.organization_id
         FROM homecells h
         JOIN zones z       ON z.id = h.zone_id
         JOIN areas a       ON a.id = z.area_id
         JOIN districts d   ON d.id = a.district_id
        WHERE h.id = ?`,
    )
    .bind(user.homecellId)
    .first<PlacementRow>();

  if (!row) return base;

  return {
    ...base,
    zoneId: row.zone_id,
    areaId: row.area_id,
    districtId: row.district_id,
    organizationId: row.organization_id,
  };
}

const LEVEL_BY_ROLE: Record<string, UserScope['level']> = {
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

/**
 * The homecell ids a user may read. Returns `null` to mean "no restriction"
 * (global admins) — callers must handle that explicitly rather than treating
 * an empty array as equivalent.
 */
export async function getAccessibleHomecellIds(
  db: D1Database,
  scope: UserScope,
): Promise<string[] | null> {
  switch (scope.level) {
    case 'global':
      return null;
    case 'own':
    case 'homecell':
      return scope.homecellId ? [scope.homecellId] : [];
    case 'zone': {
      if (!scope.zoneId) return [];
      const { results } = await db
        .prepare('SELECT id FROM homecells WHERE zone_id = ?')
        .bind(scope.zoneId)
        .all<{ id: string }>();
      return results.map((r) => r.id);
    }
    case 'area': {
      if (!scope.areaId) return [];
      const { results } = await db
        .prepare(
          `SELECT h.id FROM homecells h
             JOIN zones z ON z.id = h.zone_id
            WHERE z.area_id = ?`,
        )
        .bind(scope.areaId)
        .all<{ id: string }>();
      return results.map((r) => r.id);
    }
    case 'district': {
      if (!scope.districtId) return [];
      const { results } = await db
        .prepare(
          `SELECT h.id FROM homecells h
             JOIN zones z ON z.id = h.zone_id
             JOIN areas a ON a.id = z.area_id
            WHERE a.district_id = ?`,
        )
        .bind(scope.districtId)
        .all<{ id: string }>();
      return results.map((r) => r.id);
    }
    default:
      return [];
  }
}

/**
 * Assert that a user may act on a specific homecell.
 * Throws FORBIDDEN rather than returning a boolean so that callers cannot
 * forget to check the result.
 */
export async function assertHomecellAccess(
  db: D1Database,
  scope: UserScope,
  homecellId: string,
): Promise<void> {
  const allowed = await getAccessibleHomecellIds(db, scope);
  if (allowed === null) return; // global admin
  if (!allowed.includes(homecellId)) {
    throw ApiError.forbidden('You do not have access to this homecell.');
  }
}

/** Build a `IN (?, ?, ...)` fragment plus its bindings for a set of ids. */
export function inClause(ids: string[]): { sql: string; bindings: string[] } {
  if (ids.length === 0) return { sql: '(NULL)', bindings: [] };
  return { sql: `(${ids.map(() => '?').join(', ')})`, bindings: ids };
}

/** Convenience guard used by routes: permission + scope in one call. */
export function requireScopedPermission(
  hasIt: boolean,
  permission: Permission,
): void {
  if (!hasIt) throw ApiError.forbidden(`Missing permission: ${permission}.`);
}

export { hasPermission };
