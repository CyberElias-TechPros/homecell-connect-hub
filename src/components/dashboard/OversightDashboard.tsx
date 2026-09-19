import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { api, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import {
  Users,
  Home,
  FileText,
  HeartHandshake,
  PhoneCall,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

/**
 * Oversight dashboard for roles above a single cell.
 *
 * Every figure comes from `GET /api/hierarchy/overview`, which counts rows in
 * the database scoped to the cells this user can reach. There are no
 * placeholders: if nothing has been recorded yet, the screen says so.
 */

interface Overview {
  scope: string;
  homecells: { total: number; cells: Array<{ id: string; name: string; code: string }>; silentThisMonth: Array<{ id: string; name: string }> };
  members: { total: number; active: number; firstTimers: number; newThisMonth: number };
  attendance: { thisWeek: number; lastWeek: number; averageThisWeek: number };
  care: { openFollowUps: number; overdueFollowUps: number; openPrayerRequests: number; pendingTestimonies: number };
  reports: { submittedThisMonth: number; approvedThisMonth: number };
}

const SCOPE_LABEL: Record<string, string> = {
  district: 'District',
  area: 'Area',
  zone: 'Zone',
  homecell: 'Cell',
  global: 'Organisation',
};

export function OversightDashboard({ level }: { level: string }) {
  const navigate = useNavigate();
  const [data, setData] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await api.get<Overview>('/api/hierarchy/overview'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not load your overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (isLoading) {
    return (
      <MobileLayout>
        <PageHeader title={`${SCOPE_LABEL[level] ?? 'Oversight'} Overview`} subtitle="Loading your cells…" />
        <Section className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </Section>
        <BottomNavigation />
      </MobileLayout>
    );
  }

  if (error || !data) {
    return (
      <MobileLayout>
        <PageHeader title={`${SCOPE_LABEL[level] ?? 'Oversight'} Overview`} />
        <Section>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
              <p className="font-medium">We could not load your overview</p>
              <p className="text-sm text-muted-foreground">{error ?? 'Please try again.'}</p>
              <Button onClick={load} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden />
                Try again
              </Button>
            </CardContent>
          </Card>
        </Section>
        <BottomNavigation />
      </MobileLayout>
    );
  }

  const { homecells, members, attendance, care, reports } = data;

  // A ratio is only shown when there is a denominator to divide by.
  const reportCompliance =
    homecells.total > 0 ? Math.round((reports.submittedThisMonth / homecells.total) * 100) : null;
  const attendanceChange =
    attendance.lastWeek > 0
      ? Math.round(((attendance.thisWeek - attendance.lastWeek) / attendance.lastWeek) * 100)
      : null;

  if (homecells.total === 0) {
    return (
      <MobileLayout>
        <PageHeader title={`${SCOPE_LABEL[level] ?? 'Oversight'} Overview`} subtitle="No cells in your scope" />
        <Section>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <Home className="h-10 w-10 text-muted-foreground" aria-hidden />
              <p className="font-medium">No cells are assigned to you yet</p>
              <p className="text-sm text-muted-foreground">
                Once a cell is placed under your {SCOPE_LABEL[level]?.toLowerCase() ?? 'oversight'}, its
                activity will appear here.
              </p>
            </CardContent>
          </Card>
        </Section>
        <BottomNavigation />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader
        title={`${SCOPE_LABEL[level] ?? 'Oversight'} Overview`}
        subtitle={`${homecells.total} cell${homecells.total === 1 ? '' : 's'} under your oversight`}
        action={
          <Button size="sm" variant="ghost" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" aria-hidden />
          </Button>
        }
      />

      {/* Headline numbers */}
      <Section className="space-y-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Home className="h-4 w-4" aria-hidden />
                <span className="text-xs">Cells</span>
              </div>
              <p className="mt-1 text-3xl font-bold">{homecells.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" aria-hidden />
                <span className="text-xs">Members</span>
              </div>
              <p className="mt-1 text-3xl font-bold">{members.total}</p>
              <p className="text-xs text-muted-foreground">{members.active} active</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance this week */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attendance this week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold">{attendance.thisWeek}</span>
              <span className="mb-1 text-sm text-muted-foreground">
                across {homecells.total} cell{homecells.total === 1 ? '' : 's'} · {attendance.averageThisWeek} avg
              </span>
            </div>
            {attendanceChange !== null ? (
              <p className={`mt-2 text-sm ${attendanceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                {attendanceChange >= 0 ? '▲' : '▼'} {Math.abs(attendanceChange)}% against last week ({attendance.lastWeek})
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No attendance recorded last week, so there is no trend to show.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Members breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">People</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{members.firstTimers}</p>
              <p className="text-xs text-muted-foreground">First-timers</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{members.newThisMonth}</p>
              <p className="text-xs text-muted-foreground">New this month</p>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Care pipeline */}
      <Section className="pb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartHandshake className="h-4 w-4" aria-hidden />
              Pastoral care
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => navigate('/followups')}
              className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left press-effect"
            >
              <span className="flex items-center gap-2 text-sm">
                <PhoneCall className="h-4 w-4 text-muted-foreground" aria-hidden />
                Open follow-ups
              </span>
              <span className="flex items-center gap-2">
                {care.overdueFollowUps > 0 && (
                  <Badge variant="destructive">{care.overdueFollowUps} overdue</Badge>
                )}
                <span className="font-medium">{care.openFollowUps}</span>
              </span>
            </button>

            <button
              onClick={() => navigate('/prayer')}
              className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left press-effect"
            >
              <span className="flex items-center gap-2 text-sm">
                <HeartHandshake className="h-4 w-4 text-muted-foreground" aria-hidden />
                Prayer requests open
              </span>
              <span className="font-medium">{care.openPrayerRequests}</span>
            </button>

            <button
              onClick={() => navigate('/testimonies')}
              className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left press-effect"
            >
              <span className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
                Testimonies awaiting review
              </span>
              <span className="font-medium">{care.pendingTestimonies}</span>
            </button>
          </CardContent>
        </Card>
      </Section>

      {/* Reporting compliance */}
      <Section className="pb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" aria-hidden />
              Reporting this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold">{reports.submittedThisMonth}</span>
              <span className="mb-1 text-sm text-muted-foreground">
                submitted · {reports.approvedThisMonth} approved
              </span>
            </div>
            {reportCompliance !== null && (
              <>
                <Progress value={Math.min(reportCompliance, 100)} className="mt-3 h-2" />
                <p className="mt-2 text-xs text-muted-foreground">{reportCompliance}% of your cells have reported</p>
              </>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* Cells that have not reported — the actionable list */}
      {homecells.silentThisMonth.length > 0 && (
        <Section className="pb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Not reported this month</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {homecells.silentThisMonth.map((cell) => (
                  <li key={cell.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="truncate text-sm">{cell.name}</span>
                    <Badge variant="outline" className="shrink-0">No report</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Every cell in scope */}
      <Section className="pb-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Your cells</h2>
        <ul className="space-y-2">
          {homecells.cells.map((cell) => (
            <li key={cell.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <span className="truncate text-sm font-medium">{cell.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{cell.code}</span>
            </li>
          ))}
        </ul>
      </Section>

      <BottomNavigation />
    </MobileLayout>
  );
}
