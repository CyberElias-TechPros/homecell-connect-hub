import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { 
  Plus, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Calendar
} from 'lucide-react';

const mockReports = [
  { id: 'r1', week: 'Week 3', date: 'Jan 21, 2024', status: 'draft', attendance: 7 },
  { id: 'r2', week: 'Week 2', date: 'Jan 14, 2024', status: 'submitted', attendance: 6 },
  { id: 'r3', week: 'Week 1', date: 'Jan 7, 2024', status: 'approved', attendance: 8 },
  { id: 'r4', week: 'Week 52', date: 'Dec 31, 2023', status: 'approved', attendance: 5 },
];

export function ReportsScreen() {
  const navigate = useNavigate();
  const { currentWeek } = useApp();

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

  return (
    <MobileLayout>
      <PageHeader 
        title="Reports" 
        subtitle="Weekly submissions"
        action={
          <Button
            onClick={() => navigate('/reports/new')}
            className="gradient-primary shadow-primary press-effect"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Button>
        }
      />

      {/* Current Week Banner */}
      <Section className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/reports/new')}
          className="bg-secondary/20 border-2 border-dashed border-secondary rounded-2xl p-5 cursor-pointer press-effect"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{currentWeek}</h3>
              <p className="text-sm text-muted-foreground">Tap to submit your report</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </motion.div>
      </Section>

      {/* Summary Cards */}
      <Section className="mb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Submitted', value: 2, color: 'bg-blue-500' },
            { label: 'Approved', value: 2, color: 'bg-success' },
            { label: 'Pending', value: 1, color: 'bg-warning' },
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
          {mockReports.map((report, index) => {
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
                  <p className="font-medium text-foreground">{report.week}</p>
                  <p className="text-sm text-muted-foreground">{report.date}</p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${status.bgColor}`}>
                    <StatusIcon className={`w-3 h-3 ${status.color}`} />
                    <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{report.attendance} attended</p>
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
