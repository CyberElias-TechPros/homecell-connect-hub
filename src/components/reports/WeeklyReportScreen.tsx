import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { mockHomecell } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';
import { useReports } from '@/contexts/ReportsContext';
import {
  Save,
  Users,
  UserPlus,
  Heart,
  MessageSquare,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Gift,
  Clock,
  Lock,
  CloudOff
} from 'lucide-react';

export function WeeklyReportScreen() {
  const navigate = useNavigate();
  const { currentWeek } = useApp();
  const {
    currentReport,
    createReport,
    updateReport,
    submitReport,
    saveReport,
    canEditCurrentReport,
    canSubmitCurrentReport,
    getTimeUntilDeadline,
    isLoading,
    isOnline
  } = useReports();

  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize report on mount
  useEffect(() => {
    if (!currentReport) {
      createReport(currentWeek);
    }
  }, [currentReport, createReport, currentWeek]);

  const deadlineInfo = getTimeUntilDeadline();
  const canEdit = canEditCurrentReport();
  const canSubmit = canSubmitCurrentReport();

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    await saveReport();
    setIsSaving(false);
  };

  const validateForm = () => {
    const errors = [];
    if (!currentReport.testimonies.trim()) {
      errors.push('Testimonies are required');
    }
    if (!currentReport.challenges.trim()) {
      errors.push('Challenges field is required');
    }
    if (!currentReport.prayerPoints.trim()) {
      errors.push('Prayer points are required');
    }
    return errors;
  };

  const handleSubmit = async () => {
    if (!canSubmit || !canEdit) return;

    const errors = validateForm();
    if (errors.length > 0) {
      // Show validation errors (you could add a toast or alert here)
      console.warn('Validation errors:', errors);
      return;
    }

    await submitReport();
    setShowSuccess(true);

    setTimeout(() => {
      navigate('/reports');
    }, 2000);
  };

  const handleInputChange = (field: string, value: any) => {
    if (!canEdit) return;
    updateReport({ [field]: value });
  };

  if (!currentReport) {
    return (
      <MobileLayout hasBottomNav={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading report...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-12 h-12 text-secondary" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-serif font-bold text-foreground mb-2"
        >
          Report Submitted!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-center"
        >
          Your weekly report for {currentWeek} has been submitted.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 mt-4 text-secondary"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Keep up the great work!</span>
        </motion.div>
      </div>
    );
  }

  return (
    <MobileLayout hasBottomNav={false}>
      <PageHeader
        title="Weekly Report"
        subtitle={currentWeek}
        onBack={() => navigate(-1)}
      />

      <div className="p-4 pb-28">
        {/* Deadline Warning */}
        {deadlineInfo.isOverdue && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                Submission deadline has passed. This report cannot be edited.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {!deadlineInfo.isOverdue && deadlineInfo.hours < 24 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Alert className="border-warning/50 bg-warning/10">
              <Clock className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                {deadlineInfo.hours > 0
                  ? `${deadlineInfo.hours}h ${deadlineInfo.minutes}m remaining`
                  : `${deadlineInfo.minutes}m remaining`} until submission deadline
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Offline Indicator */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Alert className="border-muted-foreground/50 bg-muted/10">
              <CloudOff className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-muted-foreground">
                You're offline. Changes will be saved locally and synced when online.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Status Badge */}
        <div className="flex justify-between items-center mb-4">
          <Badge
            variant={currentReport.status === 'draft' ? 'secondary' : 'default'}
            className="capitalize"
          >
            {currentReport.status}
          </Badge>
          {!canEdit && (
            <Badge variant="outline" className="text-muted-foreground">
              <Lock className="w-3 h-3 mr-1" />
              Read-only
            </Badge>
          )}
        </div>

        {/* Homecell Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/50 rounded-xl p-4 mb-6"
        >
          <p className="text-sm text-muted-foreground">Submitting for</p>
          <p className="font-serif font-semibold text-foreground">{mockHomecell.name}</p>
        </motion.div>

        {/* Attendance Section - Auto-filled */}
        <Section title="Attendance (Auto-filled)" className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{currentReport.totalAttendance}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-4 h-4 text-secondary" />
                <span className="text-sm text-muted-foreground">First-Timers</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{currentReport.firstTimers}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: 'Male', value: currentReport.maleCount },
              { label: 'Female', value: currentReport.femaleCount },
              { label: 'Adults', value: currentReport.adultCount },
              { label: 'Children', value: currentReport.childrenCount },
            ].map((stat) => (
              <div key={stat.label} className="bg-muted rounded-lg p-2 text-center">
                <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Evangelism Section */}
        <Section title="Evangelism" className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm flex items-center gap-2">
                <Heart className="w-4 h-4" />
                New Converts
              </Label>
              <Input
                type="number"
                min="0"
                value={currentReport.newConverts}
                onChange={(e) => handleInputChange('newConverts', parseInt(e.target.value) || 0)}
                disabled={!canEdit}
                className="mt-2 h-12 bg-muted border-border rounded-xl text-center text-lg disabled:opacity-50"
              />
            </div>
            <div>
              <Label className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Souls Won
              </Label>
              <Input
                type="number"
                min="0"
                value={currentReport.soulsWon}
                onChange={(e) => handleInputChange('soulsWon', parseInt(e.target.value) || 0)}
                disabled={!canEdit}
                className="mt-2 h-12 bg-muted border-border rounded-xl text-center text-lg disabled:opacity-50"
              />
            </div>
          </div>
        </Section>

        {/* Testimonies */}
        <Section title="Testimonies" className="mb-6">
          <Textarea
            placeholder="Share any testimonies from members this week..."
            value={currentReport.testimonies}
            onChange={(e) => handleInputChange('testimonies', e.target.value)}
            disabled={!canEdit}
            className="min-h-[100px] bg-muted border-border rounded-xl resize-none disabled:opacity-50"
          />
        </Section>

        {/* Challenges */}
        <Section title="Challenges & Prayer Points" className="mb-6">
          <div className="space-y-3">
            <div>
              <Label className="text-sm flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" />
                Challenges Faced
              </Label>
              <Textarea
                placeholder="Any challenges faced during the week..."
                value={currentReport.challenges}
                onChange={(e) => handleInputChange('challenges', e.target.value)}
                disabled={!canEdit}
                className="min-h-[80px] bg-muted border-border rounded-xl resize-none disabled:opacity-50"
              />
            </div>
            <div>
              <Label className="text-sm flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4" />
                Prayer Points
              </Label>
              <Textarea
                placeholder="Prayer requests for the homecell..."
                value={currentReport.prayerPoints}
                onChange={(e) => handleInputChange('prayerPoints', e.target.value)}
                disabled={!canEdit}
                className="min-h-[80px] bg-muted border-border rounded-xl resize-none disabled:opacity-50"
              />
            </div>
          </div>
        </Section>

        {/* Financial (Optional) */}
        <Section title="Financial (Optional)" className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Offering (₦)
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={currentReport.offering || ''}
                onChange={(e) => handleInputChange('offering', parseInt(e.target.value) || 0)}
                disabled={!canEdit}
                className="mt-2 h-12 bg-muted border-border rounded-xl disabled:opacity-50"
              />
            </div>
            <div>
              <Label className="text-sm flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Love Seeds (₦)
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={currentReport.loveSeeds || ''}
                onChange={(e) => handleInputChange('loveSeeds', parseInt(e.target.value) || 0)}
                disabled={!canEdit}
                className="mt-2 h-12 bg-muted border-border rounded-xl disabled:opacity-50"
              />
            </div>
          </div>
        </Section>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
        <div className="flex gap-3">
          {canEdit && currentReport.status === 'draft' && (
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              variant="outline"
              className="flex-1 h-14 text-base font-semibold press-effect disabled:opacity-50"
            >
              {isSaving ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Draft
                </>
              )}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || !canEdit || isLoading}
            className="flex-1 h-14 text-base font-semibold gradient-primary shadow-primary press-effect disabled:opacity-50"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full"
              />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
