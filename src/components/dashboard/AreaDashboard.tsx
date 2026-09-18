import { OversightDashboard } from './OversightDashboard';

/**
 * Area oversight.
 *
 * This previously showed invented figures. It now renders only what
 * `GET /api/hierarchy/overview` actually counts for the cells in this user's
 * scope, and says so plainly when that scope is empty.
 */
export function AreaDashboard() {
  return <OversightDashboard level="area" />;
}
