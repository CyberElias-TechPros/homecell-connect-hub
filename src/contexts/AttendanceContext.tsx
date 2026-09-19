import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import { api, ApiError } from '../lib/api';
import {
  groupAttendanceByMeeting,
  computeAttendanceStats,
  todayIso,
  weekEndingFrom,
  type ApiAttendanceRecord,
} from '../lib/adapters';
import type { WeeklyAttendance, AttendanceContextType, AttendanceStats } from '../types';

/**
 * Attendance, backed by the real API.
 *
 * Marking is optimistic: the checkbox updates immediately for responsiveness,
 * but the authoritative record only exists once the server confirms it. If the
 * save fails the draft is retained (never silently discarded) and the error is
 * surfaced to the caller.
 */
const AttendanceContext = createContext<AttendanceContextType | null>(null);

interface AttendanceResponse {
  records: ApiAttendanceRecord[];
  summary: {
    total: number;
    present: number;
    absent: number;
    excused: number;
    firstTimers: number;
    male: number;
    female: number;
    rate: number;
  };
}

/** Local, unsaved edits keyed by member id. */
interface Draft {
  meetingDate: string;
  marks: Record<string, { present: boolean; isFirstTimer: boolean }>;
}

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isReady } = useAuth();
  const { hasPermission } = usePermissions();

  const [history, setHistory] = useState<WeeklyAttendance[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState('');

  const canView = useCallback(() => hasPermission('view_attendance'), [hasPermission]);
  const canMark = useCallback(() => hasPermission('mark_attendance'), [hasPermission]);

  const load = useCallback(async () => {
    if (!isAuthenticated || !user?.homecellId || !canView()) {
      setHistory([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.get<AttendanceResponse>('/api/attendance', { homecellId: user.homecellId });
      setHistory(groupAttendanceByMeeting(data.records ?? [], user.homecellId));
      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      if (!(err instanceof ApiError && err.isUnauthorized)) {
        console.error('attendance load failed:', err);
      }
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.homecellId, canView]);

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
   * Begin (or resume) a session for the given week.
   *
   * Existing marks are pre-loaded from history so a leader opening a past
   * meeting sees what was recorded rather than a blank sheet.
   */
  const startAttendanceSession = useCallback(
    async (week: string) => {
      const meetingDate = /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : weekEndingFrom(week);
      const existing = history.find((w) => w.weekEnding === meetingDate || w.weekEnding === week);

      const marks: Draft['marks'] = {};
      if (existing) {
        for (const record of existing.records) {
          marks[record.memberId] = { present: record.present, isFirstTimer: record.isFirstTimer };
        }
      }
      setDraft({ meetingDate, marks });
    },
    [history],
  );

  const markAttendance = useCallback((memberId: string, present: boolean, isFirstTimer = false) => {
    setDraft((prev) => {
      const base: Draft = prev ?? { meetingDate: todayIso(), marks: {} };
      const existing = base.marks[memberId];
      return {
        ...base,
        marks: {
          ...base.marks,
          [memberId]: {
            present,
            // Marking someone absent clears any first-timer flag.
            isFirstTimer: present ? (isFirstTimer || existing?.isFirstTimer || false) : false,
          },
        },
      };
    });
  }, []);

  const saveAttendance = useCallback(async () => {
    if (!draft || !user?.homecellId) return;
    const entries = Object.entries(draft.marks);
    if (entries.length === 0) return;

    setIsLoading(true);
    try {
      await api.post(
        '/api/attendance',
        {
          meetingDate: draft.meetingDate,
          records: entries.map(([memberId, mark]) => ({
            memberId,
            status: mark.isFirstTimer ? 'first_timer' : mark.present ? 'present' : 'absent',
          })),
        },
        { homecellId: user.homecellId },
      );
      setDraft(null);
      await load();
    } catch (err) {
      // Deliberately keep the draft: losing a leader's attendance sheet to a
      // transient network error would be far worse than showing an error.
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [draft, user?.homecellId, load]);

  const syncAttendance = useCallback(async () => {
    await load();
  }, [load]);

  const getAttendanceHistory = useCallback(
    (weeks?: number) => (weeks ? history.slice(0, weeks) : history),
    [history],
  );

  const getAttendanceStats = useCallback((): AttendanceStats => computeAttendanceStats(history), [history]);

  /**
   * A draft that has not been persisted. Reported as a single synthetic week so
   * the UI can honestly say "1 unsaved session" rather than implying nothing
   * is pending.
   */
  const getPendingSync = useCallback((): WeeklyAttendance[] => {
    if (!draft || !user?.homecellId || Object.keys(draft.marks).length === 0) return [];
    const records = Object.entries(draft.marks).map(([memberId, mark]) => ({
      id: `draft:${memberId}`,
      memberId,
      memberName: '',
      date: draft.meetingDate,
      week: weekEndingFrom(draft.meetingDate),
      present: mark.present,
      isFirstTimer: mark.isFirstTimer,
      markedBy: user.id,
      markedAt: new Date().toISOString(),
      synced: false,
    }));

    return [
      {
        id: `draft:${draft.meetingDate}`,
        homecellId: user.homecellId,
        week: draft.meetingDate,
        weekEnding: weekEndingFrom(draft.meetingDate),
        totalMembers: records.length,
        presentCount: records.filter((r) => r.present).length,
        absentCount: records.filter((r) => !r.present).length,
        firstTimers: records.filter((r) => r.isFirstTimer).length,
        adults: 0,
        children: 0,
        maleCount: 0,
        femaleCount: 0,
        records,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }, [draft, user?.homecellId, user?.id]);

  const currentAttendance = useMemo(() => {
    if (draft) {
      const pending = getPendingSync();
      return pending[0] ?? null;
    }
    return history[0] ?? null;
  }, [draft, getPendingSync, history]);

  const value = useMemo(
    () => ({
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
      canMarkAttendance: canMark,
      canViewAttendance: canView,
      // Aggregated multi-cell reporting needs zone scope or above.
      canViewAggregatedData: () => hasPermission('view_zone_data'),
      /** True when there are unsaved marks the leader should be warned about. */
      hasUnsavedChanges: Boolean(draft && Object.keys(draft.marks).length > 0),
    }),
    [
      currentAttendance, isLoading, isOnline, lastSyncAt,
      startAttendanceSession, markAttendance, saveAttendance, syncAttendance,
      getAttendanceHistory, getAttendanceStats, getPendingSync,
      canMark, canView, hasPermission, draft,
    ],
  );

  return (
    <AttendanceContext.Provider value={value as AttendanceContextType}>
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
