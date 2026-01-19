import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MobileLayout, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  Home,
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  FileText,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { mockAdminDashboardData } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#6b7280'
};

export function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const data = mockAdminDashboardData;

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const MetricCard = ({
    title,
    value,
    change,
    icon: Icon,
    delay = 0
  }: {
    title: string;
    value: string | number;
    change: number;
    icon: React.ComponentType<{ className?: string }>;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card rounded-xl p-4 border border-border"
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-muted-foreground" />
        {getTrendIcon(change)}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={`text-xs font-medium ${getTrendColor(change)}`}>
          {change > 0 ? '+' : ''}{change} from last week
        </p>
      </div>
    </motion.div>
  );

  if (isLoading || authLoading) {
    return (
      <MobileLayout>
        <div className="p-4">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl mb-6" />
          <Skeleton className="h-48 rounded-xl mb-6" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <BottomNavigation />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold mb-6 text-foreground"
        >
          Admin Dashboard
        </motion.h1>

        {/* Global Metrics */}
        <Section title="Global Metrics" className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Total Homecells"
              value={data.globalMetrics.totalHomecells}
              change={data.globalMetrics.totalHomecellsChange}
              icon={Home}
              delay={0.1}
            />
            <MetricCard
              title="Weekly Attendance"
              value={data.globalMetrics.totalAttendance}
              change={data.globalMetrics.totalAttendanceChange}
              icon={Users}
              delay={0.2}
            />
            <MetricCard
              title="First-Timers"
              value={data.globalMetrics.firstTimers}
              change={data.globalMetrics.firstTimersChange}
              icon={UserPlus}
              delay={0.3}
            />
            <MetricCard
              title="New Converts"
              value={data.globalMetrics.newConverts}
              change={data.globalMetrics.newConvertsChange}
              icon={TrendingUp}
              delay={0.4}
            />
          </div>
        </Section>

        {/* Heat Map Section */}
        <Section title="Attendance by Zone/Area" className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card rounded-xl p-4 border border-border"
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium text-foreground">Zone Performance Heat Map</h3>
            </div>
            <ChartContainer
              config={{
                attendance: {
                  label: "Attendance %",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.heatMapData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="zone"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="percentage"
                    fill={COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </motion.div>
        </Section>

        {/* Reports Status */}
        <Section title="Reports Status" className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card rounded-xl p-4 border border-border"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium text-foreground">Weekly Report Submissions</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Submitted</span>
                <span className="text-sm font-medium text-foreground">
                  {data.reportsStatus.submitted}/{data.reportsStatus.total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(data.reportsStatus.submitted / data.reportsStatus.total) * 100}%` }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                  className="bg-green-500 h-2 rounded-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-sm font-medium text-foreground">
                  {data.reportsStatus.pending}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(data.reportsStatus.pending / data.reportsStatus.total) * 100}%` }}
                  transition={{ delay: 0.9, duration: 0.8 }}
                  className="bg-yellow-500 h-2 rounded-full"
                />
              </div>

              {data.reportsStatus.late > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.0 }}
                  className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-400">
                    {data.reportsStatus.late} late submissions
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        </Section>

        {/* Growth Trends */}
        <Section title="Growth Trends" className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-card rounded-xl p-4 border border-border"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium text-foreground">8-Week Attendance & Conversion Trends</h3>
            </div>

            <ChartContainer
              config={{
                attendance: {
                  label: "Attendance",
                  color: "hsl(var(--chart-1))",
                },
                firstTimers: {
                  label: "First-Timers",
                  color: "hsl(var(--chart-2))",
                },
                newConverts: {
                  label: "New Converts",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.growthTrends.attendance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div className="mt-4 pt-4 border-t border-border">
              <ChartContainer
                config={{
                  firstTimers: {
                    label: "First-Timers",
                    color: "hsl(var(--chart-2))",
                  },
                  newConverts: {
                    label: "New Converts",
                    color: "hsl(var(--chart-3))",
                  },
                }}
                className="h-48"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.growthTrends.conversions} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <Line
                      type="monotone"
                      dataKey="firstTimers"
                      stroke={COLORS.secondary}
                      strokeWidth={2}
                      dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="newConverts"
                      stroke={COLORS.warning}
                      strokeWidth={2}
                      dot={{ fill: COLORS.warning, strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </motion.div>
        </Section>
      </div>
      <BottomNavigation />
    </MobileLayout>
  );
}