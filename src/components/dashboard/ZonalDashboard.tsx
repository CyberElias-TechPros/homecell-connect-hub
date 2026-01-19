import React, { useMemo } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Users, Home, FileText, TrendingUp, Bell, BookOpen, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';

// Mock zonal data
const mockZonalData = {
  zone: {
    id: 'z1',
    name: 'Zone A - Lekki',
    homecellCount: 5,
    totalMembers: 127,
    areaName: 'Area 1 - Victoria Island/Lekki',
    zonalLeaderName: 'Pastor John Adebayo'
  },
  homecells: [
    { id: 'hc1', name: 'Victory House Fellowship', members: 25, attendance: 85, reportsSubmitted: true },
    { id: 'hc2', name: 'Grace Assembly', members: 28, attendance: 78, reportsSubmitted: true },
    { id: 'hc3', name: 'Faith Community', members: 22, attendance: 92, reportsSubmitted: false },
    { id: 'hc4', name: 'Hope Center', members: 31, attendance: 67, reportsSubmitted: true },
    { id: 'hc5', name: 'Love Chapel', members: 21, attendance: 89, reportsSubmitted: false }
  ],
  attendanceHeatmap: [
    { homecell: 'Victory House', weeks: [85, 82, 88, 90, 85, 87, 89] },
    { homecell: 'Grace Assembly', weeks: [78, 75, 80, 82, 78, 76, 78] },
    { homecell: 'Faith Community', weeks: [92, 95, 90, 88, 92, 94, 92] },
    { homecell: 'Hope Center', weeks: [67, 70, 65, 68, 67, 69, 67] },
    { homecell: 'Love Chapel', weeks: [89, 87, 91, 88, 89, 90, 89] }
  ],
  reportsStatus: {
    submitted: 3,
    pending: 2,
    total: 5
  },
  growthTrends: [
    { week: 'Week 1', attendance: 115, members: 125 },
    { week: 'Week 2', attendance: 118, members: 126 },
    { week: 'Week 3', attendance: 122, members: 127 },
    { week: 'Week 4', attendance: 120, members: 127 },
    { week: 'Week 5', attendance: 125, members: 127 },
    { week: 'Week 6', attendance: 128, members: 127 },
    { week: 'Week 7', attendance: 130, members: 127 }
  ]
};

export function ZonalDashboard() {
  const { user, hasRole } = useAuth();
  const { hasPermission } = usePermissions();

  // Role-based access check
  if (!hasRole('zonal')) {
    return (
      <MobileLayout>
        <div className="p-4">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to view this dashboard.</p>
          </div>
        </div>
        <BottomNavigation />
      </MobileLayout>
    );
  }

  const zoneData = mockZonalData.zone;
  const homecells = mockZonalData.homecells;
  const reportsStatus = mockZonalData.reportsStatus;
  const growthTrends = mockZonalData.growthTrends;

  // Calculate average attendance
  const avgAttendance = Math.round(homecells.reduce((sum, hc) => sum + hc.attendance, 0) / homecells.length);

  // Quick actions
  const quickActions = [
    {
      id: 'announcement',
      title: 'Create Announcement',
      icon: Bell,
      action: () => console.log('Create announcement')
    },
    {
      id: 'materials',
      title: 'Share Materials',
      icon: BookOpen,
      action: () => console.log('Share materials')
    },
    {
      id: 'schedule',
      title: 'Schedule Meeting',
      icon: Calendar,
      action: () => console.log('Schedule meeting')
    }
  ];

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{zoneData.name}</h1>
          <p className="text-muted-foreground">Zonal Leader: {zoneData.zonalLeaderName}</p>
        </div>

        {/* Zone Overview */}
        <Card className="animate-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Zone Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{zoneData.homecellCount}</div>
                <div className="text-sm text-muted-foreground">Homecells</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{zoneData.totalMembers}</div>
                <div className="text-sm text-muted-foreground">Total Members</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Average Attendance</span>
                <span>{avgAttendance}%</span>
              </div>
              <Progress value={avgAttendance} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Attendance Heatmap */}
        <Card className="animate-in slide-in-from-bottom-4 duration-500 delay-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Attendance Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockZonalData.attendanceHeatmap.map((hc, index) => (
                <div key={hc.homecell} className="flex items-center gap-3">
                  <div className="w-32 text-sm font-medium truncate">{hc.homecell}</div>
                  <div className="flex gap-1 flex-1">
                    {hc.weeks.map((percentage, weekIndex) => (
                      <div
                        key={weekIndex}
                        className={`h-6 w-6 rounded-sm ${
                          percentage >= 90 ? 'bg-green-500' :
                          percentage >= 80 ? 'bg-yellow-500' :
                          percentage >= 70 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        title={`${percentage}%`}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground w-12 text-right">
                    {Math.round(hc.weeks.reduce((a, b) => a + b, 0) / hc.weeks.length)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Compliance */}
        <Card className="animate-in slide-in-from-bottom-4 duration-500 delay-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Submitted</span>
                <Badge variant="default" className="bg-green-500">
                  {reportsStatus.submitted}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending</span>
                <Badge variant="destructive">
                  {reportsStatus.pending}
                </Badge>
              </div>
              <Progress value={(reportsStatus.submitted / reportsStatus.total) * 100} className="h-2" />
              <div className="text-center text-sm text-muted-foreground">
                {Math.round((reportsStatus.submitted / reportsStatus.total) * 100)}% compliance rate
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth Trends */}
        <Card className="animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Growth Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {growthTrends.slice(-4).map((trend, index) => (
                <div key={trend.week} className="flex justify-between items-center">
                  <span className="text-sm">{trend.week}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">{trend.attendance} attendance</span>
                    <span className="text-muted-foreground">{trend.members} members</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-in slide-in-from-bottom-4 duration-500 delay-400">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className="justify-start h-auto p-4"
                  onClick={action.action}
                >
                  <action.icon className="h-5 w-5 mr-3" />
                  <span>{action.title}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Homecell Performance Cards */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Homecell Performance</h2>
          {homecells.map((homecell, index) => (
            <Card key={homecell.id} className={`animate-in slide-in-from-bottom-4 duration-500 delay-${500 + index * 100}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{homecell.name}</h3>
                    <p className="text-sm text-muted-foreground">{homecell.members} members</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {homecell.reportsSubmitted ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Reported
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Attendance</span>
                    <span>{homecell.attendance}%</span>
                  </div>
                  <Progress value={homecell.attendance} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <BottomNavigation />
    </MobileLayout>
  );
}