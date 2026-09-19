import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardCheck,
  FileText,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Bell,
  ChevronRight,
  AlertCircle,
  HeartHandshake,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useAttendance } from '@/contexts/AttendanceContext';
import { useFollowUps } from '@/contexts/FollowUpsContext';
import { useAnnouncements } from '@/contexts/AnnouncementsContext';
import { useMembers } from '@/contexts/MemberContext';
import { usePrayer } from '@/contexts/PrayerContext';

/**
 * The leader's home screen.
 *
 * Every figure below is derived from what the server actually holds for this
 * cell. Where there is no data yet, the screen says so rather than showing a
 * placeholder number — a leader needs to be able to trust this page.
 */
export function LeaderDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission } = usePermissions();
  const attendance = useAttendance();
  const followUps = useFollowUps();
  const announcementCtx = useAnnouncements();
  const { announcements } = announcementCtx;
  const memberCtx = useMembers();
  const prayer = usePrayer();

  const now = new Date();
  const currentWeek = `Week of ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;

  const attendanceStats = attendance.getAttendanceStats();
  const followUpStats = followUps.getFollowUpStats();
  const memberStats = memberCtx.getMemberStats();
  // Requests the leadership has not yet closed out.
  const pendingPrayer = prayer.summary.open + prayer.summary.praying;

  // Real data is still arriving only if something we actually render is loading.
  const isLoading =
    authLoading || memberCtx.isLoading || announcementCtx.isLoading || attendance.isLoading || followUps.isLoading;

  const thisWeek = attendanceStats.currentWeek.present;
  const lastWeek = attendanceStats.weeklyTrend.length > 1
    ? attendanceStats.weeklyTrend[attendanceStats.weeklyTrend.length - 2].present
    : 0;
  // Growth is only meaningful once there is a previous week to compare against.
  const growth = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : null;

  // "Has the leader marked this week yet?" drives the prompt below.
  const currentWeekRecord = attendance.getAttendanceHistory(1)[0];
  const hasMarkedThisWeek = Boolean(currentWeekRecord && currentWeekRecord.presentCount > 0);

  const quickActions = [
    { icon: ClipboardCheck, label: hasMarkedThisWeek ? 'Attendance' : 'Mark Attendance', path: '/attendance/mark', color: 'bg-green-600' },
    { icon: FileText, label: 'Weekly Report', path: '/reports/new', color: 'bg-blue-600' },
    { icon: UserPlus, label: 'Add First-Timer', path: '/members/add?type=firsttimer', color: 'bg-amber-600' },
  ];

  if (isLoading) {
    return (
      <MobileLayout>
        <header className="gradient-primary px-4 pt-4 pb-8 safe-area-top">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
          <Skeleton className="h-32 rounded-2xl" />
        </header>
        <Section className="mt-6">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </Section>
        <Section className="mt-6">
          <Skeleton className="h-24 rounded-xl" />
        </Section>
        <Section className="mt-6">
          <Skeleton className="h-16 rounded-xl" />
        </Section>
        <BottomNavigation />
      </MobileLayout>
    );
  }

  const overdueFollowUps = followUps.getOverdueFollowUps();
  const openFollowUps = followUps
    .getFollowUps({})
    .filter((f) => f.status !== 'integrated' && f.status !== 'cancelled')
    .slice(0, 2);
  const recentAnnouncements = announcements.slice(0, 2);
  const unreadAnnouncements = announcementCtx.getUnreadCount();

  return (
    <MobileLayout>
      <header className="gradient-primary px-4 pt-4 pb-8 safe-area-top">
        <div className="flex items-center justify-between mb-4">
          <div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary-foreground/70 text-sm">
              {currentWeek}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-serif font-bold text-primary-foreground"
            >
              {user?.homecellName ?? 'Your cell'}
            </motion.h1>
          </div>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/notifications')}
            className="relative w-10 h-10 bg-primary-foreground/10 rounded-full flex items-center justify-center press-effect"
            aria-label={unreadAnnouncements > 0 ? `Notifications, ${unreadAnnouncements} unread` : 'Notifications'}
          >
            <Bell className="w-5 h-5 text-primary-foreground" aria-hidden />
            {unreadAnnouncements > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full" />
            )}
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-4 shadow-elevated"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Attendance Summary</span>
            {growth !== null ? (
              <div
                className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
                  growth >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                }`}
              >
                {growth >= 0 ? <TrendingUp className="w-4 h-4" aria-hidden /> : <TrendingDown className="w-4 h-4" aria-hidden />}
                {Math.abs(growth).toFixed(1)}%
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                <Minus className="w-4 h-4" aria-hidden />
                No trend yet
              </div>
            )}
          </div>

          <div className="flex items-end gap-2 mb-4">
            <span className="text-4xl font-bold text-foreground">{thisWeek}</span>
            <span className="text-muted-foreground mb-1">/ {memberStats.totalMembers} members</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">This Week</p>
              <p className="text-2xl font-bold text-foreground">{thisWeek}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Last Week</p>
              <p className="text-2xl font-bold text-foreground">{lastWeek}</p>
            </div>
          </div>

          {!hasMarkedThisWeek && (
            <button
              onClick={() => navigate('/attendance/mark')}
              className="mt-3 w-full rounded-xl bg-primary/10 px-3 py-2 text-left text-sm text-primary press-effect"
            >
              You have not marked this week's meeting yet — tap to do it now.
            </button>
          )}
        </motion.div>
      </header>

      {hasPermission('mark_attendance') && (
        <Section className="mt-6">
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 press-effect"
              >
                <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center shadow-md`}>
                  <action.icon className="w-6 h-6 text-white" aria-hidden />
                </div>
                <span className="text-xs text-center text-muted-foreground font-medium leading-tight">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </Section>
      )}

      {/* Pastoral care at a glance — only the parts this user may see. */}
      {(pendingPrayer > 0 || overdueFollowUps.length > 0) && (
        <Section className="mt-6">
          <div className="space-y-3">
            {overdueFollowUps.length > 0 && (
              <button
                onClick={() => navigate('/followups')}
                className="flex w-full items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl press-effect text-left"
              >
                <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-destructive" aria-hidden />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {overdueFollowUps.length} Overdue Follow-up{overdueFollowUps.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">Requires immediate attention</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" aria-hidden />
              </button>
            )}
            {pendingPrayer > 0 && (
              <button
                onClick={() => navigate('/prayer')}
                className="flex w-full items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl press-effect text-left"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <HeartHandshake className="w-5 h-5 text-primary" aria-hidden />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {pendingPrayer} Prayer Request{pendingPrayer > 1 ? 's' : ''} to pray over
                  </p>
                  <p className="text-sm text-muted-foreground">Shared with the leadership</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" aria-hidden />
              </button>
            )}
          </div>
        </Section>
      )}

      <Section
        title="Follow-Up Status"
        action={
          <button onClick={() => navigate('/followups')} className="text-sm text-primary font-medium press-effect">
            View All
          </button>
        }
        className="mt-6"
      >
        {openFollowUps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium">No open follow-ups</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {followUpStats.total > 0
                ? `All ${followUpStats.total} follow-ups are completed. Well done.`
                : 'Follow-ups you create for new members will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {openFollowUps.map((followUp, index) => (
              <motion.div
                key={followUp.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                onClick={() => navigate('/followups')}
                className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border press-effect cursor-pointer"
              >
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-muted-foreground" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{followUp.memberName}</p>
                  <p className="text-xs text-muted-foreground">
                    {followUp.assignedToName ? `Assigned to ${followUp.assignedToName}` : 'Unassigned'}
                    {followUp.isOverdue && ` · ${followUp.overdueDays}d overdue`}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    followUp.isOverdue
                      ? 'bg-destructive/20 text-destructive'
                      : followUp.status === 'pending'
                        ? 'bg-warning/20 text-warning-foreground'
                        : followUp.status === 'contacted'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-success/20 text-success'
                  }`}
                >
                  {followUp.status}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Announcements"
        action={
          <button onClick={() => navigate('/announcements')} className="text-sm text-primary font-medium press-effect">
            See All
          </button>
        }
        className="mt-6 mb-6"
      >
        {recentAnnouncements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium">No announcements yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Updates from your church leadership will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAnnouncements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                onClick={() => navigate(`/announcements/${announcement.id}`)}
                className="p-4 bg-card rounded-xl border border-border press-effect cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      announcement.urgency === 'urgent'
                        ? 'bg-destructive'
                        : announcement.urgency === 'high'
                          ? 'bg-warning'
                          : 'bg-muted-foreground'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{announcement.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {announcement.createdAt
                        ? new Date(announcement.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : 'Recently'}
                    </p>
                  </div>
                  {!announcementCtx.isAnnouncementRead(announcement.id) && (
                    <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full shrink-0">
                      New
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      <BottomNavigation />
    </MobileLayout>
  );
}
