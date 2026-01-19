import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PageHeader } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { mockMembers, mockHomecell, Member } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';
import { useAttendance } from '@/contexts/AttendanceContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  Check,
  X,
  Users,
  UserCheck,
  Clock,
  Save,
  CheckCircle2,
  Sparkles,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  AlertCircle
} from 'lucide-react';

interface AttendanceState {
  [memberId: string]: boolean;
}

export function MarkAttendanceScreen() {
  const navigate = useNavigate();
  const { currentWeek } = useApp();
  const {
    currentAttendance,
    isLoading,
    isOnline,
    startAttendanceSession,
    markAttendance,
    saveAttendance,
    syncAttendance,
    canMarkAttendance
  } = useAttendance();

  const [showSuccess, setShowSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Initialize attendance session on mount
  useEffect(() => {
    if (!currentAttendance && canMarkAttendance()) {
      startAttendanceSession(currentWeek);
    }
  }, [currentAttendance, currentWeek, startAttendanceSession, canMarkAttendance]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && !syncing) {
      handleSync();
    }
  }, [isOnline]);

  const handleToggleAttendance = (memberId: string) => {
    if (!currentAttendance) return;

    const record = currentAttendance.records.find(r => r.memberId === memberId);
    if (record) {
      markAttendance(memberId, !record.present, record.isFirstTimer);
    }
  };

  const handleToggleFirstTimer = (memberId: string) => {
    if (!currentAttendance) return;

    const record = currentAttendance.records.find(r => r.memberId === memberId);
    if (record) {
      markAttendance(memberId, record.present, !record.isFirstTimer);
    }
  };

  const markAllPresent = () => {
    if (!currentAttendance) return;

    currentAttendance.records.forEach(record => {
      if (!record.present) {
        markAttendance(record.memberId, true, record.isFirstTimer);
      }
    });
  };

  const handleSave = async () => {
    if (!currentAttendance) return;

    try {
      await saveAttendance();
      setShowSuccess(true);

      setTimeout(() => {
        navigate('/attendance');
      }, 2000);
    } catch (error) {
      console.error('Error saving attendance:', error);
    }
  };

  const handleSync = async () => {
    if (!isOnline) return;

    setSyncing(true);
    try {
      await syncAttendance();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (!canMarkAttendance()) {
    return (
      <MobileLayout hasBottomNav={false}>
        <PageHeader title="Access Denied" onBack={() => navigate(-1)} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Permission Required</h2>
          <p className="text-muted-foreground text-center">
            You don't have permission to mark attendance. Please contact your leader.
          </p>
        </div>
      </MobileLayout>
    );
  }

  const presentCount = currentAttendance?.presentCount || 0;
  const totalMembers = currentAttendance?.totalMembers || mockMembers.length;
  const pendingSync = currentAttendance?.status === 'submitted';

  if (showSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 bg-success rounded-full flex items-center justify-center mb-6 relative"
        >
          <CheckCircle2 className="w-12 h-12 text-white" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.5, 0] }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="absolute inset-0 bg-success rounded-full"
          />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-serif font-bold text-foreground mb-2"
        >
          Attendance Saved!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-center"
        >
          {presentCount} of {totalMembers} members marked present.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 mt-4 text-secondary"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Great job keeping records!</span>
        </motion.div>
      </div>
    );
  }


  return (
    <MobileLayout hasBottomNav={false}>
      <PageHeader
        title="Mark Attendance"
        subtitle={currentWeek}
        onBack={() => navigate(-1)}
      />

      {/* Summary Bar */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-success" />
              <span className="font-semibold">{presentCount}</span>
              <span className="text-muted-foreground">present</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">{totalMembers} total</span>
            </div>
            {/* Sync Status */}
            <div className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-success" />
              ) : (
                <WifiOff className="w-4 h-4 text-destructive" />
              )}
              {pendingSync && (
                <CloudOff className="w-4 h-4 text-amber-500" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllPresent}
              className="text-sm text-primary font-medium press-effect"
            >
              Mark All
            </button>
            {!isOnline && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="text-sm text-secondary font-medium press-effect disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="p-4 pb-28">
        <div className="space-y-2">
          {mockMembers.map((member, index) => {
            const record = currentAttendance?.records.find(r => r.memberId === member.id);
            const isPresent = record?.present ?? false;
            const isFirstTimer = record?.isFirstTimer ?? false;

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isPresent
                    ? 'bg-success/10 border-success'
                    : 'bg-card border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                    member.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                  }`}>
                    {member.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">{member.fullName}</h3>
                      {isFirstTimer && (
                        <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-medium rounded">
                          1ST
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{member.tag}</p>
                  </div>

                  {/* Status Toggle */}
                  <motion.div
                    animate={{
                      scale: isPresent ? [1, 1.2, 1] : 1,
                      backgroundColor: isPresent ? 'hsl(var(--success))' : 'hsl(var(--muted))'
                    }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleToggleAttendance(member.id)}
                    className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer press-effect"
                  >
                    <AnimatePresence mode="wait">
                      {isPresent ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 180 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          <Check className="w-5 h-5 text-white" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="x"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <X className="w-5 h-5 text-muted-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* First-timer toggle for leaders/assistants */}
                {canMarkAttendance() && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">First-timer?</span>
                    <button
                      onClick={() => handleToggleFirstTimer(member.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        isFirstTimer
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {isFirstTimer ? 'Yes' : 'No'}
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
        <Button
          onClick={handleSave}
          disabled={isLoading || presentCount === 0}
          className="w-full h-14 text-base font-semibold gradient-primary shadow-primary press-effect disabled:opacity-50"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full"
            />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              {pendingSync ? 'Save Offline' : 'Save Attendance'} ({presentCount}/{totalMembers})
            </>
          )}
        </Button>
      </div>
    </MobileLayout>
  );
}
