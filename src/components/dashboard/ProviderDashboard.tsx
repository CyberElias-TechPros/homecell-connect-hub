import { LeaderDashboard } from './LeaderDashboard';

/**
 * Provider's home screen.
 *
 * A provider is a cell worker scoped to a single homecell (\`ROLE_SCOPE.provider
 * === 'homecell'\`), so they see the same live cell view as a leader — what
 * differs is which actions the permission model allows, and that gating is
 * applied inside the dashboard and the API.
 *
 * This replaces a screen that rendered a fixed roster of invented members,
 * attendance percentages and materials.
 */
export function ProviderDashboard() {
  return <LeaderDashboard />;
}
