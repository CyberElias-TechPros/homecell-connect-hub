import { OversightDashboard } from './OversightDashboard';

/**
 * District oversight.
 *
 * This previously showed invented figures. It now renders only what
 * `GET /api/hierarchy/overview` actually counts for the cells in this user's
 * scope, and says so plainly when that scope is empty.
 */
export function DistrictDashboard() {
  return <OversightDashboard level="district" />;
}
