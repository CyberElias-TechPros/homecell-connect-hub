import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import { api } from '../lib/api';
import { toUiAnnouncement, type ApiAnnouncement } from '../lib/adapters';
import type {
  Announcement,
  AnnouncementContextType,
  AnnouncementFilters,
  AnnouncementReadReceipt,
  AnnouncementStats,
  AnnouncementDelivery,
  PendingChange,
} from '../types';

/**
 * Announcements backed by the real API.
 *
 * Read state is tracked server-side per user, so "unread" is consistent across
 * a person's devices rather than living in one browser's localStorage.
 */
const AnnouncementsContext = createContext<AnnouncementContextType | null>(null);

interface AnnouncementsResponse {
  announcements: ApiAnnouncement[];
}

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isReady } = useAuth();
  const { hasPermission } = usePermissions();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated || !hasPermission('view_announcements')) {
      setAnnouncements([]);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<AnnouncementsResponse>('/api/announcements');
      const rows = data.announcements ?? [];
      setAnnouncements(rows.map(toUiAnnouncement));
      setReadIds(new Set(rows.filter((a) => a.isRead).map((a) => a.id)));
      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load announcements.');
      setAnnouncements([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, hasPermission]);

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

  const createAnnouncement = useCallback(
    async (
      input: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'deliveryStats'>,
    ): Promise<Announcement> => {
      const scope = input.target === 'zones' || input.target === 'areas' || input.target === 'districts'
        ? input.target === 'zones'
          ? 'zone'
          : input.target === 'areas'
            ? 'area'
            : 'district'
        : 'homecell';

      const created = await api.post<{ id: string }>(
        '/api/announcements',
        {
          title: input.title,
          body: input.content,
          category: input.category,
          priority: input.urgency ?? 'normal',
          scope,
          expiresAt: input.expiresAt ?? null,
        },
        user?.homecellId ? { homecellId: user.homecellId } : undefined,
      );
      await load();
      return (
        announcements.find((a) => a.id === created.id) ?? {
          ...input,
          id: created.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deliveryStats: { totalRecipients: 0, delivered: 0, read: 0, failed: 0 },
        } as Announcement
      );
    },
    [load, announcements, user?.homecellId],
  );

  const updateAnnouncement = useCallback(
    async (id: string, updates: Partial<Announcement>): Promise<Announcement> => {
      // The API treats announcements as immutable records with a publish flag;
      // editing is expressed as a delete-and-recreate by the leader instead.
      // Surfacing this limitation honestly beats pretending an edit happened.
      void updates;
      const existing = announcements.find((a) => a.id === id);
      if (!existing) throw new Error('That announcement could not be found.');
      throw new Error(
        'Announcements cannot be edited once published. Publish a new one, or delete it and start again.',
      );
    },
    [announcements],
  );

  const deleteAnnouncement = useCallback(async (id: string): Promise<void> => {
    await api.del(`/api/announcements/${id}`);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const publishAnnouncement = useCallback(
    async (id: string): Promise<void> => {
      // Announcements are published immediately on creation; there is no
      // separate publish step in the API.
      const existing = announcements.find((a) => a.id === id);
      if (!existing) throw new Error('That announcement could not be found.');
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'published' as const } : a)),
      );
    },
    [announcements],
  );

  const scheduleAnnouncement = useCallback(async (id: string, scheduledAt: string): Promise<void> => {
    void id;
    void scheduledAt;
    // Scheduling requires a cron-driven publish step, which is not implemented.
    throw new Error('Scheduling announcements is not available yet. Publish it now instead.');
  }, []);

  const markAsRead = useCallback(async (announcementId: string): Promise<void> => {
    // Optimistic: the badge should clear the instant it is tapped.
    setReadIds((prev) => new Set(prev).add(announcementId));
    try {
      await api.post(`/api/announcements/${announcementId}/read`);
    } catch {
      // Revert so the UI does not claim a read that was not recorded.
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(announcementId);
        return next;
      });
    }
  }, []);

  const getAnnouncements = useCallback(
    (filters?: AnnouncementFilters) => {
      let result = [...announcements];
      if (!filters) return result;

      if (filters.status) result = result.filter((a) => a.status === filters.status);
      if (filters.urgency) result = result.filter((a) => a.urgency === filters.urgency);
      if (filters.target) result = result.filter((a) => a.target === filters.target);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q),
        );
      }
      if (filters.dateRange) {
        const start = new Date(filters.dateRange.start).getTime();
        const end = new Date(filters.dateRange.end).getTime();
        result = result.filter((a) => {
          const at = new Date(a.publishedAt ?? a.createdAt).getTime();
          return at >= start && at <= end;
        });
      }
      return result;
    },
    [announcements],
  );

  const getUnreadCount = useCallback(
    () => announcements.filter((a) => !readIds.has(a.id) && a.status === 'published').length,
    [announcements, readIds],
  );

  const isAnnouncementRead = useCallback(
    (announcementId: string) => readIds.has(announcementId),
    [readIds],
  );

  const getReadReceipts = useCallback(
    (announcementId: string): AnnouncementReadReceipt[] => {
      // Individual read receipts are not exposed by the API; only a count is
      // returned, which surfaces through getDeliveryReport below.
      void announcementId;
      return [];
    },
    [],
  );

  const getAnnouncementStats = useCallback((): AnnouncementStats => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Counts are derived by tallying the real announcements rather than
    // maintaining separate counters that could drift.
    const byUrgency = { low: 0, normal: 0, high: 0, urgent: 0 } as AnnouncementStats['byUrgency'];
    const byChannel = { in_app: 0, push: 0, sms: 0, whatsapp: 0 } as AnnouncementStats['byChannel'];
    const byTarget = {
      all: 0, leaders: 0, providers: 0, zones: 0, areas: 0, districts: 0,
    } as AnnouncementStats['byTarget'];

    let readCount = 0;
    for (const a of announcements) {
      byUrgency[a.urgency] = (byUrgency[a.urgency] ?? 0) + 1;
      for (const channel of a.channels) {
        byChannel[channel] = (byChannel[channel] ?? 0) + 1;
      }
      byTarget[a.target] = (byTarget[a.target] ?? 0) + 1;
      if (a.deliveryStats.read > 0) readCount += 1;
    }

    const total = announcements.length;
    return {
      totalAnnouncements: total,
      publishedThisMonth: announcements.filter(
        (a) => a.status === 'published' && new Date(a.publishedAt ?? a.createdAt) >= startOfMonth,
      ).length,
      averageReadRate: total > 0 ? Math.round((readCount / total) * 100) : 0,
      byUrgency,
      byChannel,
      byTarget,
    };
  }, [announcements]);

  const getDeliveryReport = useCallback(
    (announcementId: string): AnnouncementDelivery[] => {
      void announcementId;
      // Per-recipient delivery is not instrumented; see docs/STATUS.md.
      return [];
    },
    [],
  );

  const saveOffline = useCallback(async () => undefined, []);
  const syncAnnouncements = useCallback(async () => {
    await load();
  }, [load]);
  const getPendingChanges = useCallback((): PendingChange[] => [], []);

  const value = useMemo(
    () => ({
      announcements,
      isLoading,
      isOnline,
      lastSyncAt,
      loadError,
      createAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      publishAnnouncement,
      scheduleAnnouncement,
      getAnnouncements,
      markAsRead,
      getUnreadCount,
      isAnnouncementRead,
      getReadReceipts,
      getAnnouncementStats,
      getDeliveryReport,
      saveOffline,
      syncAnnouncements,
      getPendingChanges,
      canCreateAnnouncement: () => hasPermission('create_announcements'),
      canEditAnnouncement: () => hasPermission('manage_announcements'),
      canDeleteAnnouncement: () => hasPermission('manage_announcements'),
      canViewAnnouncement: () => hasPermission('view_announcements'),
      canPublishAnnouncement: () => hasPermission('create_announcements'),
    }),
    [
      announcements, isLoading, isOnline, lastSyncAt, loadError,
      createAnnouncement, updateAnnouncement, deleteAnnouncement, publishAnnouncement,
      scheduleAnnouncement, getAnnouncements, markAsRead, getUnreadCount, getReadReceipts,
      getAnnouncementStats, getDeliveryReport, saveOffline, syncAnnouncements,
      getPendingChanges, hasPermission,
    ],
  );

  return (
    <AnnouncementsContext.Provider value={value as AnnouncementContextType}>
      {children}
    </AnnouncementsContext.Provider>
  );
}

export function useAnnouncements() {
  const context = useContext(AnnouncementsContext);
  if (!context) {
    throw new Error('useAnnouncements must be used within an AnnouncementsProvider');
  }
  return context;
}

export { AnnouncementsContext };
