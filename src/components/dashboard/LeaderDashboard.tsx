import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { 
  ClipboardCheck, 
  FileText, 
  UserPlus, 
  TrendingUp, 
  TrendingDown,
  Users,
  Bell,
  ChevronRight,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { mockHomecell, mockDashboardStats, mockAnnouncements, mockFollowUps } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';

export function LeaderDashboard() {
  const navigate = useNavigate();
  const { currentWeek } = useApp();
  
  const stats = mockDashboardStats;
  const homecell = mockHomecell;
  const isGrowth = stats.growthPercentage >= 0;

  const quickActions = [
    { icon: ClipboardCheck, label: 'Mark Attendance', path: '/attendance/mark', color: 'bg-green-500' },
    { icon: FileText, label: 'Submit Report', path: '/reports/new', color: 'bg-blue-500' },
    { icon: UserPlus, label: 'Add First-Timer', path: '/members/add?type=firsttimer', color: 'bg-amber-500' },
    { icon: BookOpen, label: 'Materials', path: '/materials', color: 'bg-purple-500' },
  ];

  return (
    <MobileLayout>
      {/* Header */}
      <header className="gradient-primary px-4 pt-4 pb-8 safe-area-top">
        <div className="flex items-center justify-between mb-4">
          <div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-primary-foreground/70 text-sm"
            >
              {currentWeek}
            </motion.p>
            <motion.h1 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-serif font-bold text-primary-foreground"
            >
              {homecell.name}
            </motion.h1>
          </div>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/notifications')}
            className="relative w-10 h-10 bg-primary-foreground/10 rounded-full flex items-center justify-center press-effect"
          >
            <Bell className="w-5 h-5 text-primary-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full" />
          </motion.button>
        </div>

        {/* Attendance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-4 shadow-elevated"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">This Week's Attendance</span>
            <div className={`flex items-center gap-1 text-sm font-medium ${isGrowth ? 'text-success' : 'text-destructive'}`}>
              {isGrowth ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {stats.growthPercentage.toFixed(1)}%
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-foreground">{stats.thisWeekAttendance}</span>
            <span className="text-muted-foreground mb-1">/ {stats.totalMembers} members</span>
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-border">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Last Week</p>
              <p className="text-lg font-semibold">{stats.lastWeekAttendance}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">New Members</p>
              <p className="text-lg font-semibold">{stats.newMembers}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Follow-ups</p>
              <p className="text-lg font-semibold">{stats.pendingFollowUps}</p>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Quick Actions */}
      <Section className="mt-6">
        <div className="grid grid-cols-4 gap-3">
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
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-center text-muted-foreground font-medium leading-tight">
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>
      </Section>

      {/* Follow-up Alerts */}
      {stats.overdueFollowUps > 0 && (
        <Section className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => navigate('/followups')}
            className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl press-effect cursor-pointer"
          >
            <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{stats.overdueFollowUps} Overdue Follow-up{stats.overdueFollowUps > 1 ? 's' : ''}</p>
              <p className="text-sm text-muted-foreground">Tap to view and update</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </Section>
      )}

      {/* Announcements */}
      <Section 
        title="Announcements" 
        action={
          <button 
            onClick={() => navigate('/announcements')}
            className="text-sm text-primary font-medium press-effect"
          >
            See All
          </button>
        }
        className="mt-6"
      >
        <div className="space-y-3">
          {mockAnnouncements.slice(0, 2).map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              onClick={() => navigate(`/announcements/${announcement.id}`)}
              className="p-4 bg-card rounded-xl border border-border press-effect cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  announcement.type === 'urgent' ? 'bg-destructive' : 
                  announcement.type === 'event' ? 'bg-secondary' : 'bg-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{announcement.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{announcement.message}</p>
                </div>
                {!announcement.readAt && (
                  <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">New</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Recent Activity */}
      <Section 
        title="Pending Follow-ups" 
        action={
          <button 
            onClick={() => navigate('/followups')}
            className="text-sm text-primary font-medium press-effect"
          >
            View All
          </button>
        }
        className="mt-6 mb-6"
      >
        <div className="space-y-3">
          {mockFollowUps.slice(0, 2).map((followUp, index) => (
            <motion.div
              key={followUp.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
            >
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{followUp.memberName}</p>
                <p className="text-xs text-muted-foreground">Assigned to {followUp.assignedToName}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                followUp.status === 'pending' ? 'bg-warning/20 text-warning' :
                followUp.status === 'contacted' ? 'bg-blue-500/20 text-blue-600' :
                'bg-success/20 text-success'
              }`}>
                {followUp.status}
              </span>
            </motion.div>
          ))}
        </div>
      </Section>

      <BottomNavigation />
    </MobileLayout>
  );
}
