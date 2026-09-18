import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import { api } from '../lib/api';
import {
  toUiFollowUp,
  toApiFollowUpStatus,
  type ApiFollowUp,
  type ApiFollowUpNote,
} from '../lib/adapters';
import type { FollowUp, FollowUpContextType, FollowUpFilters, FollowUpStats, PendingChange } from '../types';

/**
 * Follow-up CRM backed by the real API.
 *
 * Most follow-ups are created automatically by the server (a first-timer
 * registering, or a member crossing the absence threshold). This context is
 * where leaders work them: assign, contact, log an outcome, close.
 */
const FollowUpsContext = createContext<FollowUpContextType | null>(null);

interface FollowUpsResponse {
  followUps: ApiFollowUp[];
  summary: { total: number; open: number; overdue: number; completed: number; unassigned: number };
}

export function FollowUpsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isReady } = useAuth();
  const { hasPermission } = usePermissions();

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [notes, setNotes] = useState<Record<string, ApiFollowUpNote[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const canView = useCallback(() => hasPermission('view_followups'), [hasPermission]);

  const load = useCallback(async () => {
    if (!isAuthenticated || !canView()) {
      setFollowUps([]);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<FollowUpsResponse>('/api/followups');
      setFollowUps((data.followUps ?? []).map((f) => toUiFollowUp(f)));
      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load follow-ups.');
      setFollowUps([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, canView]);

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

  /** Load the interaction history for one follow-up on demand. */
  const loadNotes = useCallback(async (id: string) => {
    try {
      const data = await api.get<{ notes: ApiFollowUpNote[] }>(`/api/followups/${id}/notes`);
      setNotes((prev) => ({ ...prev, [id]: data.notes ?? [] }));
      return data.notes ?? [];
    } catch {
      return [];
    }
  }, []);

  const createFollowUp = useCallback(
    async (input: Parameters<FollowUpContextType['createFollowUp']>[0]): Promise<FollowUp> => {
      const reason = input.tags?.[0] ?? (input.status === 'pending' ? 'other' : 'other');
      const created = await api.post<{ id: string }>('/api/followups', {
        subjectId: input.memberId,
        assignedTo: input.assignedTo || null,
        reason: normaliseReason(reason),
        priority: input.priority === 'normal' ? 'normal' : input.priority,
        dueDate: input.nextFollowUpDate ?? null,
        notes: input.notes || undefined,
      });
      await load();
      const found = followUps.find((f) => f.id === created.id);
      if (found) return found;
      // The list reloaded; return a best-effort object so callers never get null.
      return {
        ...input,
        id: created.id,
        followUpHistory: [],
        isOverdue: false,
        overdueDays: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.id ?? '',
        updatedBy: user?.id ?? '',
      } as FollowUp;
    },
    [load, followUps, user?.id],
  );

  const updateFollowUp = useCallback(
    async (id: string, updates: Partial<FollowUp>): Promise<FollowUp> => {
      const payload: Record<string, unknown> = {};
      if (updates.status !== undefined) payload.status = toApiFollowUpStatus(updates.status);
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.assignedTo !== undefined) payload.assignedTo = updates.assignedTo || null;
      if (updates.nextFollowUpDate !== undefined) payload.dueDate = updates.nextFollowUpDate || null;
      if (updates.notes !== undefined) payload.notes = updates.notes;

      await api.patch(`/api/followups/${id}`, payload);
      await load();

      const updated = followUps.find((f) => f.id === id);
      return updated ?? ({ id, ...updates } as FollowUp);
    },
    [load, followUps],
  );

  /**
   * Move a follow-up through the pipeline.
   *
   * The note is written as an interaction entry first so the history records
   * what happened even if the status write is retried.
   */
  const updateFollowUpStatus = useCallback(
    async (
      id: string,
      status: FollowUp['status'],
      noteText?: string,
      contactMethod?: 'phone' | 'whatsapp' | 'visit' | 'email' | 'other',
    ): Promise<FollowUp> => {
      if (noteText && noteText.trim()) {
        await api.post(`/api/followups/${id}/notes`, {
          body: noteText.trim(),
          outcome: status,
        });
      }
      await api.patch(`/api/followups/${id}`, {
        status: toApiFollowUpStatus(status),
        ...(contactMethod ? { contactMethod: normaliseContactMethod(contactMethod) } : {}),
      });
      await load();
      return (followUps.find((f) => f.id === id) ?? { id, status } as FollowUp) as FollowUp;
    },
    [load, followUps],
  );

  const reassignFollowUp = useCallback(
    async (id: string, newAssigneeId: string, reason?: string): Promise<FollowUp> => {
      await api.patch(`/api/followups/${id}`, { assignedTo: newAssigneeId });
      if (reason?.trim()) {
        await api.post(`/api/followups/${id}/notes`, { body: `Reassigned: ${reason.trim()}` });
      }
      await load();
      return (followUps.find((f) => f.id === id) ?? { id }) as FollowUp;
    },
    [load, followUps],
  );

  /**
   * Cancel rather than delete.
   *
   * The API intentionally has no hard delete: follow-up history is pastoral
   * record and must survive. The UI's "delete" therefore voids the record.
   */
  const deleteFollowUp = useCallback(async (id: string): Promise<void> => {
    await api.patch(`/api/followups/${id}`, { status: 'cancelled' });
    setFollowUps((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'cancelled' } : f)));
  }, []);

  const getFollowUps = useCallback(
    (filters?: FollowUpFilters) => {
      // Cancelled records are void; they stay in the database but are excluded
      // from the working pipeline by default.
      let result = followUps.filter((f) => f.status !== 'cancelled');

      if (!filters) return result;
      if (filters.status) result = result.filter((f) => f.status === filters.status);
      if (filters.priority) result = result.filter((f) => f.priority === filters.priority);
      if (filters.assignedTo) result = result.filter((f) => f.assignedTo === filters.assignedTo);
      if (filters.isOverdue) result = result.filter((f) => f.isOverdue);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (f) => f.memberName.toLowerCase().includes(q) || (f.phone ?? '').includes(q),
        );
      }
      return result;
    },
    [followUps],
  );

  const getFollowUp = useCallback((id: string) => followUps.find((f) => f.id === id), [followUps]);
  const getAssignedFollowUps = useCallback(
    (userId: string) => followUps.filter((f) => f.assignedTo === userId && f.status !== 'cancelled'),
    [followUps],
  );
  const getOverdueFollowUps = useCallback(
    () => followUps.filter((f) => f.isOverdue && f.status !== 'cancelled'),
    [followUps],
  );

  const getFollowUpStats = useCallback((): FollowUpStats => {
    const active = followUps.filter((f) => f.status !== 'cancelled');
    const integrated = active.filter((f) => f.status === 'integrated');

    const meanDays = (subset: FollowUp[]) => {
      const durations = subset
        .map((f) => (new Date(f.updatedAt).getTime() - new Date(f.createdAt).getTime()) / 86400000)
        .filter((d) => Number.isFinite(d) && d >= 0);
      if (durations.length === 0) return 0;
      return Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10;
    };

    // Weekly cohorts: how many follow-ups were raised and closed each week.
    const byWeek = new Map<string, { created: number; completed: number }>();
    for (const f of active) {
      const raised = weekKey(f.createdAt);
      const entry = byWeek.get(raised) ?? { created: 0, completed: 0 };
      entry.created += 1;
      if (f.status === 'integrated') entry.completed += 1;
      byWeek.set(raised, entry);
    }

    return {
      total: active.length,
      pending: active.filter((f) => f.status === 'pending').length,
      contacted: active.filter((f) => f.status === 'contacted').length,
      visited: active.filter((f) => f.status === 'visited').length,
      integrated: integrated.length,
      overdue: active.filter((f) => f.isOverdue).length,
      successRate: active.length > 0 ? Math.round((integrated.length / active.length) * 100) : 0,
      averageDaysToContact: meanDays(active.filter((f) => f.status !== 'pending')),
      averageDaysToVisit: meanDays(active.filter((f) => f.status === 'visited' || f.status === 'integrated')),
      averageDaysToIntegration: meanDays(integrated),
      weeklyTrends: [...byWeek.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .slice(-12)
        .map(([week, v]) => ({
          week,
          new: v.created,
          completed: v.completed,
          successRate: v.created > 0 ? Math.round((v.completed / v.created) * 100) : 0,
        })),
    };
  }, [followUps]);

  const getSuccessMetrics = useCallback(() => {
    const active = followUps.filter((f) => f.status !== 'cancelled');
    const integrated = active.filter((f) => f.status === 'integrated');
    const conversionRate = active.length > 0 ? Math.round((integrated.length / active.length) * 100) : 0;

    // Mean time from creation to completion, in days.
    const durations = integrated
      .map((f) => (new Date(f.updatedAt).getTime() - new Date(f.createdAt).getTime()) / 86400000)
      .filter((d) => Number.isFinite(d) && d >= 0);
    const averageTimeToIntegration =
      durations.length > 0
        ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
        : 0;

    const overdue = active.filter((f) => f.isOverdue).length;
    const followUpEfficiency =
      active.length > 0 ? Math.round(((active.length - overdue) / active.length) * 100) : 100;

    return { conversionRate, averageTimeToIntegration, followUpEfficiency };
  }, [followUps]);

  const saveOffline = useCallback(async () => undefined, []);
  const syncFollowUps = useCallback(async () => {
    await load();
  }, [load]);
  const getPendingChanges = useCallback((): PendingChange[] => [], []);

  const value = useMemo(
    () => ({
      followUps,
      isLoading,
      isOnline,
      lastSyncAt,
      loadError,
      notes,
      loadNotes,
      createFollowUp,
      updateFollowUp,
      updateFollowUpStatus,
      reassignFollowUp,
      deleteFollowUp,
      getFollowUps,
      getFollowUp,
      getAssignedFollowUps,
      getOverdueFollowUps,
      getFollowUpStats,
      getSuccessMetrics,
      saveOffline,
      syncFollowUps,
      getPendingChanges,
      canCreateFollowUp: () => hasPermission('manage_followups'),
      canEditFollowUp: () => hasPermission('manage_followups'),
      canDeleteFollowUp: () => hasPermission('manage_followups'),
      canViewFollowUps: canView,
      canReassignFollowUp: () => hasPermission('assign_followups'),
      canViewAnalytics: canView,
    }),
    [
      followUps, isLoading, isOnline, lastSyncAt, loadError, notes, loadNotes,
      createFollowUp, updateFollowUp, updateFollowUpStatus, reassignFollowUp, deleteFollowUp,
      getFollowUps, getFollowUp, getAssignedFollowUps, getOverdueFollowUps, getFollowUpStats,
      getSuccessMetrics, saveOffline, syncFollowUps, getPendingChanges, hasPermission, canView, user,
    ],
  );

  return (
    <FollowUpsContext.Provider value={value as FollowUpContextType}>
      {children}
    </FollowUpsContext.Provider>
  );
}

/** ISO week label ('2026-W38') used for cohort grouping. */
function weekKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** The API restricts `reason` to a known set; coerce anything unexpected. */
function normaliseReason(reason: string): string {
  const allowed = ['first_timer', 'new_convert', 'absentee', 'visitor', 'prayer_request', 'care', 'other'];
  return allowed.includes(reason) ? reason : 'other';
}

function normaliseContactMethod(method: string): string {
  const allowed = ['call', 'whatsapp', 'sms', 'email', 'visit', 'in_person', 'other'];
  if (allowed.includes(method)) return method;
  // The API distinguishes a phone call from a physical visit.
  if (method === 'phone') return 'call';
  return 'other';
}

export function useFollowUps() {
  const context = useContext(FollowUpsContext);
  if (!context) {
    throw new Error('useFollowUps must be used within a FollowUpsProvider');
  }
  return context;
}
