import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import { useAttendance } from './AttendanceContext';
import { WeeklyReport } from '../data/mockData';

// Storage keys
const STORAGE_KEYS = {
  CURRENT_REPORT: 'homecell_current_report',
  REPORTS_HISTORY: 'homecell_reports_history',
  PENDING_SYNC: 'homecell_reports_pending_sync',
  LAST_SYNC: 'homecell_reports_last_sync'
};

// Helper functions
const generateId = () => Math.random().toString(36).substr(2, 9);

const getCurrentWeek = () => {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

  return {
    week: `Week ${Math.ceil((startOfWeek.getTime() - new Date(startOfWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`,
    weekEnding: endOfWeek.toISOString().split('T')[0],
    submissionDeadline: new Date(endOfWeek.getTime() + (24 * 60 * 60 * 1000)).toISOString() // Monday 11:59 PM
  };
};

const getSubmissionDeadline = (weekEnding: string) => {
  const endDate = new Date(weekEnding);
  return new Date(endDate.getTime() + (24 * 60 * 60 * 1000)); // Monday after Sunday
};

const isPastDeadline = (weekEnding: string) => {
  const deadline = getSubmissionDeadline(weekEnding);
  return new Date() > deadline;
};

const canEditReport = (report: WeeklyReport, userRole: string) => {
  if (report.status === 'approved') return false;
  if (report.status === 'submitted' && userRole !== 'admin' && userRole !== 'super_admin') return false;
  if (isPastDeadline(report.weekEnding) && report.status === 'draft') return false;
  return true;
};

const canSubmitReport = (userRole: string) => {
  return userRole === 'leader';
};

export interface ReportsContextType {
  currentReport: WeeklyReport | null;
  reportsHistory: WeeklyReport[];
  isLoading: boolean;
  isOnline: boolean;
  lastSyncAt: string;

  // Actions
  createReport: (week: string) => Promise<void>;
  updateReport: (updates: Partial<WeeklyReport>) => void;
  saveReport: () => Promise<void>;
  submitReport: () => Promise<void>;
  syncReports: () => Promise<void>;

  // Data
  getReportsHistory: (weeks?: number) => WeeklyReport[];
  getReportStats: () => any;
  getPendingSync: () => WeeklyReport[];

  // Permissions
  canEditCurrentReport: () => boolean;
  canSubmitCurrentReport: () => boolean;
  canViewReports: () => boolean;
  canViewAggregatedReports: () => boolean;

  // Utilities
  getTimeUntilDeadline: () => { hours: number; minutes: number; isOverdue: boolean };
}

const ReportsContext = createContext<ReportsContextType | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { getAttendanceHistory } = useAttendance();

  const [currentReport, setCurrentReport] = useState<WeeklyReport | null>(null);
  const [reportsHistory, setReportsHistory] = useState<WeeklyReport[]>([]);
  const [pendingSync, setPendingSync] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState<string>('');

  // Load data from localStorage on mount
  useEffect(() => {
    const loadStoredData = () => {
      try {
        const storedCurrent = localStorage.getItem(STORAGE_KEYS.CURRENT_REPORT);
        const storedHistory = localStorage.getItem(STORAGE_KEYS.REPORTS_HISTORY);
        const storedPending = localStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
        const storedLastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

        if (storedCurrent) {
          setCurrentReport(JSON.parse(storedCurrent));
        }
        if (storedHistory) {
          setReportsHistory(JSON.parse(storedHistory));
        }
        if (storedPending) {
          setPendingSync(JSON.parse(storedPending));
        }
        if (storedLastSync) {
          setLastSyncAt(storedLastSync);
        }
      } catch (error) {
        console.error('Error loading reports data:', error);
      }
    };

    loadStoredData();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming online and there are pending items
  useEffect(() => {
    if (isOnline && pendingSync.length > 0) {
      syncReports();
    }
  }, [isOnline, pendingSync.length]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (currentReport) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_REPORT, JSON.stringify(currentReport));
    }
  }, [currentReport]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REPORTS_HISTORY, JSON.stringify(reportsHistory));
  }, [reportsHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(pendingSync));
  }, [pendingSync]);

  const createReport = async (week: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { weekEnding } = getCurrentWeek();

      // Check if report already exists
      const existingReport = reportsHistory.find(r => r.weekEnding === weekEnding);
      if (existingReport && existingReport.status !== 'draft') {
        setCurrentReport(existingReport);
        return;
      }

      // Get attendance data for auto-fill
      const attendanceHistory = getAttendanceHistory(1);
      const currentAttendance = attendanceHistory.find(a => a.week === week);

      const newReport: WeeklyReport = {
        id: generateId(),
        homecellId: user.homecellId || '',
        weekEnding,
        totalAttendance: currentAttendance?.presentCount || 0,
        maleCount: currentAttendance?.maleCount || 0,
        femaleCount: currentAttendance?.femaleCount || 0,
        adultCount: currentAttendance?.adults || 0,
        childrenCount: currentAttendance?.children || 0,
        firstTimers: currentAttendance?.firstTimers || 0,
        newConverts: 0,
        soulsWon: 0,
        testimonies: '',
        challenges: '',
        prayerPoints: '',
        offering: 0,
        loveSeeds: 0,
        status: 'draft'
      };

      setCurrentReport(newReport);
    } finally {
      setIsLoading(false);
    }
  };

  const updateReport = (updates: Partial<WeeklyReport>) => {
    if (!currentReport) return;

    setCurrentReport(prev => prev ? {
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString()
    } : null);
  };

  const saveReport = async () => {
    if (!currentReport) return;

    setIsLoading(true);
    try {
      const savedReport = {
        ...currentReport,
        updatedAt: new Date().toISOString()
      };

      // Update history
      setReportsHistory(prev => {
        const existingIndex = prev.findIndex(r => r.id === savedReport.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = savedReport;
          return updated;
        }
        return [savedReport, ...prev];
      });

      // Add to pending sync if offline
      if (!isOnline) {
        setPendingSync(prev => [...prev, savedReport]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const submitReport = async () => {
    if (!currentReport || !canSubmitCurrentReport()) return;

    setIsLoading(true);
    try {
      const submittedReport: WeeklyReport = {
        ...currentReport,
        status: (isOnline ? 'submitted' : 'submitted') as 'draft' | 'submitted' | 'approved',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Update history
      setReportsHistory(prev => {
        const existingIndex = prev.findIndex(r => r.id === submittedReport.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = submittedReport;
          return updated;
        }
        return [submittedReport, ...prev];
      });

      // Add to pending sync if offline
      if (!isOnline) {
        setPendingSync(prev => [...prev, submittedReport]);
      }

      setCurrentReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const syncReports = async () => {
    if (!isOnline || pendingSync.length === 0) return;

    setIsLoading(true);
    try {
      // Simulate API sync
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mark as synced
      const syncedItems = pendingSync.map(item => ({
        ...item,
        syncedAt: new Date().toISOString()
      }));

      // Update history
      setReportsHistory(prev =>
        prev.map(item => {
          const synced = syncedItems.find(s => s.id === item.id);
          return synced || item;
        })
      );

      setPendingSync([]);
      setLastSyncAt(new Date().toISOString());
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  };

  const getReportsHistory = (weeks = 4): WeeklyReport[] => {
    return reportsHistory.slice(0, weeks);
  };

  const getReportStats = () => {
    const history = getReportsHistory(8);
    const submitted = history.filter(r => r.status === 'submitted' || r.status === 'approved').length;
    const approved = history.filter(r => r.status === 'approved').length;
    const pending = history.filter(r => r.status === 'draft').length;

    return {
      submitted,
      approved,
      pending,
      total: history.length
    };
  };

  const getPendingSync = (): WeeklyReport[] => {
    return pendingSync;
  };

  const canEditCurrentReport = (): boolean => {
    if (!currentReport || !user) return false;
    return canEditReport(currentReport, user.role);
  };

  const canSubmitCurrentReport = (): boolean => {
    if (!user) return false;
    return canSubmitReport(user.role);
  };

  const canViewReports = (): boolean => {
    return hasPermission('view_homecell_reports') || hasPermission('view_homecell_members');
  };

  const canViewAggregatedReports = (): boolean => {
    return ['zonal', 'area', 'district', 'admin', 'super_admin'].includes(user?.role || '');
  };

  const getTimeUntilDeadline = () => {
    if (!currentReport) return { hours: 0, minutes: 0, isOverdue: false };

    const deadline = getSubmissionDeadline(currentReport.weekEnding);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs <= 0) return { hours: 0, minutes: 0, isOverdue: true };

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, isOverdue: false };
  };

  return (
    <ReportsContext.Provider value={{
      currentReport,
      reportsHistory,
      isLoading,
      isOnline,
      lastSyncAt,
      createReport,
      updateReport,
      saveReport,
      submitReport,
      syncReports,
      getReportsHistory,
      getReportStats,
      getPendingSync,
      canEditCurrentReport,
      canSubmitCurrentReport,
      canViewReports,
      canViewAggregatedReports,
      getTimeUntilDeadline
    }}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
}