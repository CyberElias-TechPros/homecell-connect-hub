import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import { api, ApiError } from '../lib/api';
import { toUiReport, toApiReportPayload, weekEndingFrom, type ApiReport } from '../lib/adapters';
import type { WeeklyReport } from '../types';

export interface ReportsContextType {
  currentReport: WeeklyReport | null;
  reportsHistory: WeeklyReport[];
  isLoading: boolean;
  isOnline: boolean;
  lastSyncAt: string;
  loadError: string | null;

  createReport: (week: string) => Promise<void>;
  updateReport: (updates: Partial<WeeklyReport>) => void;
  saveReport: () => Promise<void>;
  submitReport: () => Promise<void>;
  syncReports: () => Promise<void>;

  getReportsHistory: (weeks?: number) => WeeklyReport[];
  getReportStats: () => {
    totalReports: number;
    submitted: number;
    approved: number;
    pending: number;
    averageAttendance: number;
    totalSoulsWon: number;
  };
  getPendingSync: () => WeeklyReport[];

  canEditCurrentReport: () => boolean;
  canSubmitCurrentReport: () => boolean;
  canViewReports: () => boolean;
  canViewAggregatedReports: () => boolean;

  getTimeUntilDeadline: () => { hours: number; minutes: number; isOverdue: boolean };
}

/**
 * Weekly cell reports, backed by the real API.
 *
 * The API uniquely constrains one report per cell per week and refuses to
 * overwrite a report that is already submitted or approved, so the guard here
 * mirrors a rule the database also enforces.
 */
const ReportsContext = createContext<ReportsContextType | null>(null);

interface ReportsResponse {
  reports: ApiReport[];
}

interface DraftResponse {
  weekEnding: string;
  suggested: {
    totalAttendance: number;
    maleCount: number;
    femaleCount: number;
    adultCount: number;
    childrenCount: number;
    firstTimers: number;
    newConverts: number;
    soulsWon: number;
  };
  context: { prayerRequestsOpen: number; followUpsOpen: number };
}

/** Sunday 23:59 is the reporting deadline for the week that just ended. */
function deadlineFor(weekEnding: string): Date {
  const d = new Date(`${weekEnding}T23:59:59.999Z`);
  return d;
}

export function ReportsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isReady } = useAuth();
  const { hasPermission } = usePermissions();

  const [currentReport, setCurrentReport] = useState<WeeklyReport | null>(null);
  const [reportsHistory, setReportsHistory] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated || !user?.homecellId || !hasPermission('view_homecell_reports')) {
      setReportsHistory([]);
      setCurrentReport(null);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<ReportsResponse>('/api/reports', { homecellId: user.homecellId });
      const reports = (data.reports ?? []).map(toUiReport);
      setReportsHistory(reports);
      setLastSyncAt(new Date().toISOString());

      // Keep any in-progress draft the leader is editing; otherwise show the
      // most recent report so the screen is never empty when data exists.
      setCurrentReport((prev) => {
        if (prev && prev.status === 'draft') return prev;
        return reports[0] ?? null;
      });
    } catch (err) {
      if (!(err instanceof ApiError && err.isUnauthorized)) {
        setLoadError(err instanceof Error ? err.message : 'Could not load reports.');
      }
      setReportsHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.homecellId, hasPermission]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  /**
   * Start a report for a week, pre-filled from what actually happened.
   *
   * The draft figures come from the server's own attendance and follow-up
   * data, so a leader is confirming reality rather than counting from memory.
   */
  const createReport = useCallback(
    async (week: string) => {
      const weekEnding = /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : weekEndingFrom(week);

      const existing = reportsHistory.find((r) => r.weekEnding === weekEnding);
      if (existing) {
        setCurrentReport(existing);
        return;
      }

      try {
        const draft = await api.get<DraftResponse>('/api/reports/draft', {
          homecellId: user?.homecellId ?? undefined,
          weekEnding,
        });
        setCurrentReport({
          id: '',
          homecellId: user?.homecellId ?? '',
          weekEnding: draft.weekEnding,
          totalAttendance: draft.suggested.totalAttendance,
          maleCount: draft.suggested.maleCount,
          femaleCount: draft.suggested.femaleCount,
          adultCount: draft.suggested.adultCount,
          childrenCount: draft.suggested.childrenCount,
          firstTimers: draft.suggested.firstTimers,
          newConverts: draft.suggested.newConverts,
          soulsWon: draft.suggested.soulsWon,
          testimonies: '',
          challenges: '',
          prayerPoints: '',
          status: 'draft',
        });
      } catch {
        // Fall back to a blank report rather than failing the whole action.
        setCurrentReport({
          id: '',
          homecellId: user?.homecellId ?? '',
          weekEnding,
          totalAttendance: 0,
          maleCount: 0,
          femaleCount: 0,
          adultCount: 0,
          childrenCount: 0,
          firstTimers: 0,
          newConverts: 0,
          soulsWon: 0,
          testimonies: '',
          challenges: '',
          prayerPoints: '',
          status: 'draft',
        });
      }
    },
    [reportsHistory, user?.homecellId],
  );

  const updateReport = useCallback((updates: Partial<WeeklyReport>) => {
    setCurrentReport((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const persist = useCallback(
    async (submit: boolean) => {
      if (!currentReport || !user?.homecellId) return;
      setIsLoading(true);
      try {
        const saved = await api.post<{ report: ApiReport }>(
          '/api/reports',
          { ...toApiReportPayload(currentReport), submit },
          { homecellId: user.homecellId },
        );
        const mapped = toUiReport(saved.report);
        setCurrentReport(mapped);
        setReportsHistory((prev) => {
          const others = prev.filter((r) => r.weekEnding !== mapped.weekEnding);
          return [mapped, ...others].sort((a, b) => (a.weekEnding < b.weekEnding ? 1 : -1));
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentReport, user?.homecellId],
  );

  const saveReport = useCallback(async () => {
    await persist(false);
  }, [persist]);

  const submitReport = useCallback(async () => {
    await persist(true);
  }, [persist]);

  const syncReports = useCallback(async () => {
    await load();
  }, [load]);

  const getReportsHistory = useCallback(
    (weeks?: number) => (weeks ? reportsHistory.slice(0, weeks) : reportsHistory),
    [reportsHistory],
  );

  const getReportStats = useCallback(() => {
    const withAttendance = reportsHistory.filter((r) => r.totalAttendance > 0);
    return {
      totalReports: reportsHistory.length,
      submitted: reportsHistory.filter((r) => r.status === 'submitted').length,
      approved: reportsHistory.filter((r) => r.status === 'approved').length,
      pending: reportsHistory.filter((r) => r.status === 'draft').length,
      averageAttendance:
        withAttendance.length > 0
          ? Math.round(
              withAttendance.reduce((sum, r) => sum + r.totalAttendance, 0) / withAttendance.length,
            )
          : 0,
      totalSoulsWon: reportsHistory.reduce((sum, r) => sum + r.soulsWon, 0),
    };
  }, [reportsHistory]);

  const getPendingSync = useCallback((): WeeklyReport[] => {
    // Only a draft that has never been persisted to the server is pending.
    if (currentReport && currentReport.status === 'draft' && !currentReport.id) {
      return [currentReport];
    }
    return [];
  }, [currentReport]);

  const value = useMemo(
    () => ({
      currentReport,
      reportsHistory,
      isLoading,
      isOnline,
      lastSyncAt,
      loadError,
      createReport,
      updateReport,
      saveReport,
      submitReport,
      syncReports,
      getReportsHistory,
      getReportStats,
      getPendingSync,
      canEditCurrentReport: () =>
        Boolean(currentReport) && currentReport?.status !== 'approved' && hasPermission('submit_homecell_reports'),
      canSubmitCurrentReport: () =>
        currentReport?.status === 'draft' && hasPermission('submit_homecell_reports'),
      canViewReports: () => hasPermission('view_homecell_reports'),
      canViewAggregatedReports: () => hasPermission('approve_homecell_reports'),
      getTimeUntilDeadline: () => {
        if (!currentReport) return { hours: 0, minutes: 0, isOverdue: false };
        const deadline = deadlineFor(currentReport.weekEnding);
        const diff = deadline.getTime() - Date.now();
        const overdue = diff < 0;
        const abs = Math.abs(diff);
        return {
          hours: Math.floor(abs / 3600000),
          minutes: Math.floor((abs % 3600000) / 60000),
          isOverdue: overdue,
        };
      },
    }),
    [
      currentReport, reportsHistory, isLoading, isOnline, lastSyncAt, loadError,
      createReport, updateReport, saveReport, submitReport, syncReports,
      getReportsHistory, getReportStats, getPendingSync, hasPermission,
    ],
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
}
