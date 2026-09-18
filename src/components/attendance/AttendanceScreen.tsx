import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { useAttendance } from '@/contexts/AttendanceContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  ChevronRight,
  BarChart3,
  Target,
  Clock,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff
} from 'lucide-react';

export function AttendanceScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentWeek } = useApp();
  const { getAttendanceHistory, getAttendanceStats, canMarkAttendance, canViewAttendance, isOnline, lastSyncAt } = useAttendance();
  const { hasPermission } = usePermissions();

  const attendanceHistory = getAttendanceHistory(8);
  const stats = getAttendanceStats();

  return (
    <MobileLayout>
      <PageHeader
        title="Attendance"
        subtitle={user?.homecellName ?? 'Your cell'}
        action={
          canMarkAttendance() ? (
            <Button
              onClick={() => navigate('/attendance/mark')}
              className="gradient-primary shadow-primary press-effect"
            >
              <Plus className="w-4 h-4 mr-2" />
              Mark Today
            </Button>
          ) : null
        }
      />

      {/* Connection Status */}
      <div className="px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-success" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
            <span className={isOnline ? 'text-success' : 'text-destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {lastSyncAt && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Cloud className="w-3 h-3" />
              <span className="text-xs">
                Synced {new Date(lastSyncAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Current Week Card */}
      <Section className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-primary rounded-2xl p-5 text-primary-foreground"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium text-primary-foreground/80">{currentWeek}</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-4xl font-bold">{stats.currentWeek.present}</p>
              <p className="text-primary-foreground/70 text-sm mt-1">Members Present</p>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1 ${stats.currentWeek.growth >= 0 ? 'text-secondary' : 'text-red-300'}`}>
                {stats.currentWeek.growth >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <span className="font-semibold">
                  {stats.currentWeek.growth >= 0 ? '+' : ''}{stats.currentWeek.growth.toFixed(1)}%
                </span>
              </div>
              <p className="text-primary-foreground/60 text-xs mt-1">vs last week</p>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* Attendance Summary */}
      <Section title="Quick Stats" className="mb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Adults', value: stats.categoryBreakdown.adults, color: 'bg-blue-500' },
            { label: 'Children', value: stats.categoryBreakdown.children, color: 'bg-purple-500' },
            { label: 'First-Timers', value: stats.categoryBreakdown.firstTimers, color: 'bg-amber-500' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mb-2`}>
                <Users className="w-4 h-4 text-white" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Analytics */}
      {canViewAttendance() && (
        <Section title="Analytics" className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Monthly Average</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.monthlyAverage.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">Weekly Trend</span>
              </div>
              <div className="flex items-center gap-1">
                {stats.currentWeek.growth >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <span className={`text-lg font-bold ${stats.currentWeek.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.currentWeek.growth >= 0 ? '+' : ''}{stats.currentWeek.growth.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">vs last week</p>
            </motion.div>
          </div>
        </Section>
      )}

      {/* History */}
      <Section
        title="Recent Weeks"
        action={
          <button className="text-sm text-primary font-medium press-effect">
            View All
          </button>
        }
        className="mb-6"
      >
        <div className="space-y-2">
          {attendanceHistory.map((record, index) => {
            const percentage = (record.presentCount / record.totalMembers) * 100;
            const prevRecord = attendanceHistory[index + 1];
            const growth = prevRecord
              ? ((record.presentCount - prevRecord.presentCount) / prevRecord.presentCount) * 100
              : 0;
            const isGrowth = growth >= 0;

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{record.week}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(record.weekEnding).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{record.presentCount}/{record.totalMembers}</p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</p>
                  </div>
                  {index < attendanceHistory.length - 1 && (
                    <div className={`flex items-center gap-0.5 text-sm font-medium ${
                      isGrowth ? 'text-success' : 'text-destructive'
                    }`}>
                      {isGrowth ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                  )}
                  {record.status === 'submitted' && (
                    <CloudOff className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            );
          })}
        </div>
      </Section>

      <BottomNavigation />
    </MobileLayout>
  );
}
