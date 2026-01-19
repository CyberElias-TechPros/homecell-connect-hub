import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { useReports } from '@/contexts/ReportsContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Calendar,
  Eye,
  Lock,
  User,
  History
} from 'lucide-react';

export function ReportsScreen() {
  const navigate = useNavigate();
  const { currentWeek } = useApp();
  const { user } = useAuth();
  const {
    reportsHistory,
    getReportStats,
    canSubmitCurrentReport,
    canViewReports,
    getTimeUntilDeadline
  } = useReports();

  const reportStats = getReportStats();
  const deadlineInfo = getTimeUntilDeadline();
  const canSubmit = canSubmitCurrentReport();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/20', label: 'Approved' };
      case 'submitted':
        return { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500/20', label: 'Submitted' };
      default:
        return { icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/20', label: 'Draft' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <MobileLayout>
      <PageHeader
        title="Reports"
        subtitle="Weekly submissions"
        action={
          canSubmit && (
            <Button
              onClick={() => navigate('/reports/new')}
              className="gradient-primary shadow-primary press-effect"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Report
            </Button>
          )
        }
      />

      {/* Current Week Banner */}
      <Section className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => canSubmit && navigate('/reports/new')}
          className={`border-2 border-dashed rounded-2xl p-5 ${
            canSubmit
              ? 'bg-secondary/20 border-secondary cursor-pointer press-effect'
              : 'bg-muted/20 border-muted cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              canSubmit ? 'bg-secondary' : 'bg-muted'
            }`}>
              {canSubmit ? (
                <FileText className="w-6 h-6 text-secondary-foreground" />
              ) : (
                <Lock className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{currentWeek}</h3>
                {deadlineInfo.isOverdue && (
                  <Badge variant="destructive" className="text-xs">Overdue</Badge>
                )}
                {!deadlineInfo.isOverdue && deadlineInfo.hours < 24 && (
                  <Badge variant="secondary" className="text-xs">
                    {deadlineInfo.hours}h {deadlineInfo.minutes}m left
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {canSubmit
                  ? 'Tap to submit your report'
                  : user?.role === 'leader'
                    ? 'Report already submitted'
                    : 'Read-only access'
                }
              </p>
            </div>
            {canSubmit && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
          </div>
        </motion.div>
      </Section>

      {/* Summary Cards */}
      <Section className="mb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Submitted', value: reportStats.submitted, color: 'bg-blue-500' },
            { label: 'Approved', value: reportStats.approved, color: 'bg-success' },
            { label: 'Pending', value: reportStats.pending, color: 'bg-warning' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl p-4 border border-border text-center"
            >
              <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                <FileText className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Reports List */}
      <Section title="Report History" className="mb-6">
        <div className="space-y-2">
          {reportsHistory.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reports submitted yet</p>
            </motion.div>
          ) : (
            reportsHistory.map((report, index) => {
              const status = getStatusConfig(report.status);
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  onClick={() => navigate(`/reports/${report.id}`)}
                  className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border press-effect cursor-pointer"
                >
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">Week {report.weekEnding.split('-')[1]}</p>
                      {report.submittedAt && (
                        <Badge variant="outline" className="text-xs">
                          Submitted {formatDate(report.submittedAt)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {report.totalAttendance} attended • {report.newConverts} converts • {report.soulsWon} souls won
                    </p>
                    {report.approvedAt && report.approvedBy && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Approved by {report.approvedBy} on {formatDate(report.approvedAt)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${status.bgColor}`}>
                      <StatusIcon className={`w-3 h-3 ${status.color}`} />
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Eye className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">View</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              );
            })
          )}
        </div>
      </Section>

      <BottomNavigation />
    </MobileLayout>
  );
}
