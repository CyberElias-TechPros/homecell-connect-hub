import { useAuth } from '@/contexts/AuthContext';
import { LeaderDashboard } from '@/components/dashboard/LeaderDashboard';
import { ProviderDashboard } from '@/components/dashboard/ProviderDashboard';
import { ZonalDashboard } from '@/components/dashboard/ZonalDashboard';
import { AreaDashboard } from '@/components/dashboard/AreaDashboard';
import { DistrictDashboard } from '@/components/dashboard/DistrictDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'leader':
    case 'assistant':
      return <LeaderDashboard />;
    case 'provider':
      return <ProviderDashboard />;
    case 'zonal':
      return <ZonalDashboard />;
    case 'area':
      return <AreaDashboard />;
    case 'district':
      return <DistrictDashboard />;
    case 'admin':
    case 'super_admin':
      return <AdminDashboard />;
    default:
      return <LeaderDashboard />;
  }
}
