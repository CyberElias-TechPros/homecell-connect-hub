import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import {
  AttendanceRecord,
  WeeklyAttendance,
  AttendanceStats,
  AttendanceContextType
} from '../types';
import { mockMembers, mockAttendanceHistory } from '../data/mockData';

const AttendanceContext = createContext<AttendanceContextType | null>(null);

// Storage keys
const STORAGE_KEYS = {
  CURRENT_ATTENDANCE: 'homecell_current_attendance',
  ATTENDANCE_HISTORY: 'homecell_attendance_history',
  PENDING_SYNC: 'homecell_pending_sync',
  LAST_SYNC: 'homecell_last_sync'
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
    weekEnding: endOfWeek.toISOString().split('T')[0]
  };
};

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const [currentAttendance, setCurrentAttendance] = useState<WeeklyAttendance | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<WeeklyAttendance[]>([]);
  const [pendingSync, setPendingSync] = useState<WeeklyAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState<string>('');

  // Load data from localStorage on mount
  useEffect(() => {
    const loadStoredData = () => {
      try {
        const storedCurrent = localStorage.getItem(STORAGE_KEYS.CURRENT_ATTENDANCE);
        const storedHistory = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_HISTORY);
        const storedPending = localStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
        const storedLastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

        if (storedCurrent) {
          setCurrentAttendance(JSON.parse(storedCurrent));
        }
        if (storedHistory) {
          setAttendanceHistory(JSON.parse(storedHistory));
        }
        if (storedPending) {
          setPendingSync(JSON.parse(storedPending));
        }
        if (storedLastSync) {
          setLastSyncAt(storedLastSync);
        }
      } catch (error) {
        console.error('Error loading attendance data:', error);
      }
    };

    loadStoredData();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (currentAttendance) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_ATTENDANCE, JSON.stringify(currentAttendance));
    }
  }, [currentAttendance]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE_HISTORY, JSON.stringify(attendanceHistory));
  }, [attendanceHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(pendingSync));
  }, [pendingSync]);

  const startAttendanceSession = async (week: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { weekEnding } = getCurrentWeek();

      // Check if session already exists
      const existingSession = attendanceHistory.find(a => a.week === week && a.status === 'draft');
      if (existingSession) {
        setCurrentAttendance(existingSession);
        return;
      }

      // Create new session
      const newSession: WeeklyAttendance = {
        id: generateId(),
        homecellId: user.homecellId || '',
        week,
        weekEnding,
        totalMembers: mockMembers.length,
        presentCount: 0,
        absentCount: mockMembers.length,
        firstTimers: 0,
        adults: 0,
        children: 0,
        maleCount: 0,
        femaleCount: 0,
        records: mockMembers.map(member => ({
          id: generateId(),
          memberId: member.id,
          memberName: member.fullName,
          date: new Date().toISOString().split('T')[0],
          week,
          present: false,
          isFirstTimer: false,
          markedBy: user.id,
          markedAt: new Date().toISOString(),
          synced: false
        })),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setCurrentAttendance(newSession);
    } finally {
      setIsLoading(false);
    }
  };

  const markAttendance = (memberId: string, present: boolean, isFirstTimer?: boolean) => {
    if (!currentAttendance) return;

    setCurrentAttendance(prev => {
      if (!prev) return null;

      const updatedRecords = prev.records.map(record => {
        if (record.memberId === memberId) {
          return {
            ...record,
            present,
            isFirstTimer: isFirstTimer !== undefined ? isFirstTimer : record.isFirstTimer,
            markedAt: new Date().toISOString()
          };
        }
        return record;
      });

      // Calculate stats
      const presentCount = updatedRecords.filter(r => r.present).length;
      const firstTimers = updatedRecords.filter(r => r.present && r.isFirstTimer).length;
      const member = mockMembers.find(m => m.id === memberId);
      const adults = updatedRecords.filter(r => r.present && mockMembers.find(m => m.id === r.memberId)?.tag === 'adult').length;
      const children = updatedRecords.filter(r => r.present && mockMembers.find(m => m.id === r.memberId)?.tag === 'child').length;
      const males = updatedRecords.filter(r => r.present && mockMembers.find(m => m.id === r.memberId)?.gender === 'male').length;
      const females = updatedRecords.filter(r => r.present && mockMembers.find(m => m.id === r.memberId)?.gender === 'female').length;

      return {
        ...prev,
        records: updatedRecords,
        presentCount,
        absentCount: prev.totalMembers - presentCount,
        firstTimers,
        adults,
        children,
        maleCount: males,
        femaleCount: females,
        updatedAt: new Date().toISOString()
      };
    });
  };

  const saveAttendance = async () => {
    if (!currentAttendance) return;

    setIsLoading(true);
    try {
      const savedAttendance: WeeklyAttendance = {
        ...currentAttendance,
        status: (isOnline ? 'synced' : 'submitted') as 'draft' | 'submitted' | 'synced',
        syncedAt: isOnline ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString()
      };

      // Update records sync status
      const syncedRecords = savedAttendance.records.map(record => ({
        ...record,
        synced: isOnline
      }));

      savedAttendance.records = syncedRecords;

      // Move to history
      setAttendanceHistory(prev => {
        const existingIndex = prev.findIndex(a => a.id === savedAttendance.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = savedAttendance;
          return updated;
        }
        return [savedAttendance, ...prev];
      });

      // Add to pending sync if offline
      if (!isOnline) {
        setPendingSync(prev => [...prev, savedAttendance]);
      }

      setCurrentAttendance(null);
    } finally {
      setIsLoading(false);
    }
  };

  const syncAttendance = async () => {
    if (!isOnline || pendingSync.length === 0) return;

    setIsLoading(true);
    try {
      // Simulate API sync
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mark as synced
      const syncedItems = pendingSync.map(item => ({
        ...item,
        status: 'synced' as const,
        syncedAt: new Date().toISOString(),
        records: item.records.map(record => ({ ...record, synced: true }))
      }));

      // Update history
      setAttendanceHistory(prev =>
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

  const getAttendanceHistory = (weeks = 4): WeeklyAttendance[] => {
    return attendanceHistory.slice(0, weeks);
  };

  const getAttendanceStats = (): AttendanceStats => {
    const history = getAttendanceHistory(8);
    const currentWeek = history[0];

    // Calculate monthly average (approximate)
    const monthlyAverage = history.length > 0
      ? history.reduce((sum, week) => sum + (week.presentCount / week.totalMembers) * 100, 0) / history.length
      : 0;

    // Weekly trend
    const weeklyTrend = history.map((week, index) => {
      const prevWeek = history[index + 1];
      const growth = prevWeek
        ? ((week.presentCount - prevWeek.presentCount) / prevWeek.presentCount) * 100
        : 0;

      return {
        week: week.week,
        present: week.presentCount,
        total: week.totalMembers,
        percentage: (week.presentCount / week.totalMembers) * 100,
        growth
      };
    });

    // Category breakdown from current week
    const categoryBreakdown = currentWeek ? {
      adults: currentWeek.adults,
      children: currentWeek.children,
      firstTimers: currentWeek.firstTimers,
      males: currentWeek.maleCount,
      females: currentWeek.femaleCount
    } : {
      adults: 0,
      children: 0,
      firstTimers: 0,
      males: 0,
      females: 0
    };

    return {
      currentWeek: currentWeek ? {
        present: currentWeek.presentCount,
        total: currentWeek.totalMembers,
        percentage: (currentWeek.presentCount / currentWeek.totalMembers) * 100,
        growth: weeklyTrend[0]?.growth || 0
      } : {
        present: 0,
        total: 0,
        percentage: 0,
        growth: 0
      },
      monthlyAverage,
      weeklyTrend,
      categoryBreakdown
    };
  };

  const getPendingSync = (): WeeklyAttendance[] => {
    return pendingSync;
  };

  const canMarkAttendance = (): boolean => {
    return hasPermission('mark_attendance');
  };

  const canViewAttendance = (): boolean => {
    return hasPermission('view_homecell_reports') || hasPermission('view_homecell_members');
  };

  const canViewAggregatedData = (): boolean => {
    return ['zonal', 'area', 'district', 'admin', 'super_admin'].includes(user?.role || '');
  };

  return (
    <AttendanceContext.Provider value={{
      currentAttendance,
      isLoading,
      isOnline,
      lastSyncAt,
      startAttendanceSession,
      markAttendance,
      saveAttendance,
      syncAttendance,
      getAttendanceHistory,
      getAttendanceStats,
      getPendingSync,
      canMarkAttendance,
      canViewAttendance,
      canViewAggregatedData
    }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}