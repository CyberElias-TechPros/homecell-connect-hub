import { LeaderDashboard } from '@/components/dashboard/LeaderDashboard';

export function DashboardPage() {
  // In a real app, this would check the user's role and render the appropriate dashboard
  // For now, we default to the Leader dashboard
  return <LeaderDashboard />;
}
