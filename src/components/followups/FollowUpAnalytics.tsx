import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useFollowUps } from '@/contexts/FollowUpsContext';
import {
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Target,
  Calendar
} from 'lucide-react';

export function FollowUpAnalytics() {
  const { getFollowUpStats, getSuccessMetrics } = useFollowUps();
  const stats = getFollowUpStats();
  const metrics = getSuccessMetrics();

  const statusData = [
    { label: 'Pending', value: stats.pending, color: 'bg-orange-500', percentage: stats.total > 0 ? (stats.pending / stats.total) * 100 : 0 },
    { label: 'Contacted', value: stats.contacted, color: 'bg-purple-500', percentage: stats.total > 0 ? (stats.contacted / stats.total) * 100 : 0 },
    { label: 'Visited', value: stats.visited, color: 'bg-blue-500', percentage: stats.total > 0 ? (stats.visited / stats.total) * 100 : 0 },
    { label: 'Integrated', value: stats.integrated, color: 'bg-green-500', percentage: stats.total > 0 ? (stats.integrated / stats.total) * 100 : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Follow-ups</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Follow-up Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusData.map((status) => (
              <div key={status.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${status.color}`} />
                    <span className="font-medium">{status.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{status.value}</span>
                    <Badge variant="outline">{status.percentage.toFixed(1)}%</Badge>
                  </div>
                </div>
                <Progress value={status.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Days to Contact</p>
                <p className="text-xl font-bold">{stats.averageDaysToContact.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Days to Visit</p>
                <p className="text-xl font-bold">{stats.averageDaysToVisit.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Days to Integration</p>
                <p className="text-xl font-bold">{stats.averageDaysToIntegration.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Weekly Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.weeklyTrends.map((week, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{week.week}</p>
                  <p className="text-sm text-muted-foreground">
                    {week.new} new, {week.completed} completed
                  </p>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-100 text-green-800">
                    {week.successRate.toFixed(1)}% success
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Follow-up Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Efficiency</span>
                <span className="text-sm text-muted-foreground">{metrics.followUpEfficiency.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.followUpEfficiency} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.integrated}</p>
                <p className="text-sm text-muted-foreground">Successfully Integrated</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.contacted + stats.visited}</p>
                <p className="text-sm text-muted-foreground">Active Follow-ups</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}