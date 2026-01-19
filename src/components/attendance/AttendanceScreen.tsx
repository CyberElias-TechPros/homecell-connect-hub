import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { mockAttendanceHistory, mockHomecell } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';
import { 
  Plus, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Users,
  ChevronRight
} from 'lucide-react';

export function AttendanceScreen() {
  const navigate = useNavigate();
  const { currentWeek } = useApp();

  return (
    <MobileLayout>
      <PageHeader 
        title="Attendance" 
        subtitle={mockHomecell.name}
        action={
          <Button
            onClick={() => navigate('/attendance/mark')}
            className="gradient-primary shadow-primary press-effect"
          >
            <Plus className="w-4 h-4 mr-2" />
            Mark Today
          </Button>
        }
      />

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
              <p className="text-4xl font-bold">7</p>
              <p className="text-primary-foreground/70 text-sm mt-1">Members Present</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-secondary">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">+16.7%</span>
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
            { label: 'Adults', value: 6, color: 'bg-blue-500' },
            { label: 'Children', value: 1, color: 'bg-purple-500' },
            { label: 'First-Timers', value: 1, color: 'bg-amber-500' },
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
          {mockAttendanceHistory.map((record, index) => {
            const percentage = (record.present / record.total) * 100;
            const prevRecord = mockAttendanceHistory[index + 1];
            const growth = prevRecord 
              ? ((record.present - prevRecord.present) / prevRecord.present) * 100 
              : 0;
            const isGrowth = growth >= 0;

            return (
              <motion.div
                key={record.week}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{record.week}</p>
                  <p className="text-sm text-muted-foreground">{record.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{record.present}/{record.total}</p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</p>
                  </div>
                  {index < mockAttendanceHistory.length - 1 && (
                    <div className={`flex items-center gap-0.5 text-sm font-medium ${
                      isGrowth ? 'text-success' : 'text-destructive'
                    }`}>
                      {isGrowth ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
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
