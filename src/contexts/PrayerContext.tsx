import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import { api } from '../lib/api';
import { toUiPrayerRequest, type ApiPrayerRequest, type UiPrayerRequest } from '../lib/adapters';

/**
 * Prayer requests, backed by the real API.
 *
 * Privacy is enforced by the server: a `private` request is never returned to
 * anyone but its author, whatever this client asks for. This context therefore
 * renders whatever it is given rather than filtering for safety.
 */

export interface PrayerSummary {
  total: number;
  open: number;
  praying: number;
  answered: number;
  urgent: number;
}

interface PrayerContextType {
  prayerRequests: UiPrayerRequest[];
  summary: PrayerSummary;
  isLoading: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  submitRequest: (input: {
    title?: string;
    body: string;
    category?: string;
    urgency?: 'low' | 'normal' | 'high' | 'urgent';
    visibility?: 'private' | 'leadership' | 'cell';
    isAnonymous?: boolean;
  }) => Promise<void>;
  updateRequest: (
    id: string,
    input: { status?: UiPrayerRequest['status']; answeredNote?: string; assignedTo?: string | null },
  ) => Promise<void>;
  canManage: boolean;
}

const PrayerContext = createContext<PrayerContextType | null>(null);

interface PrayerResponse {
  prayerRequests: ApiPrayerRequest[];
  summary: PrayerSummary;
}

export function PrayerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady, user } = useAuth();
  const { hasPermission } = usePermissions();

  const [prayerRequests, setPrayerRequests] = useState<UiPrayerRequest[]>([]);
  const [summary, setSummary] = useState<PrayerSummary>({
    total: 0, open: 0, praying: 0, answered: 0, urgent: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.homecellId || !hasPermission('view_prayer_requests')) {
      setPrayerRequests([]);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<PrayerResponse>('/api/prayer');
      setPrayerRequests((data.prayerRequests ?? []).map(toUiPrayerRequest));
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load prayer requests.');
      setPrayerRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.homecellId, hasPermission]);

  useEffect(() => {
    if (!isReady) return;
    void refresh();
  }, [isReady, refresh]);

  const submitRequest = useCallback<PrayerContextType['submitRequest']>(
    async (input) => {
      await api.post('/api/prayer', {
        title: input.title || undefined,
        body: input.body,
        category: input.category,
        urgency: input.urgency ?? 'normal',
        visibility: input.visibility ?? 'leadership',
        isAnonymous: input.isAnonymous ?? false,
      });
      await refresh();
    },
    [refresh],
  );

  const updateRequest = useCallback<PrayerContextType['updateRequest']>(
    async (id, input) => {
      await api.patch(`/api/prayer/${id}`, input);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      prayerRequests,
      summary,
      isLoading,
      loadError,
      refresh,
      submitRequest,
      updateRequest,
      canManage: hasPermission('manage_prayer_requests'),
    }),
    [prayerRequests, summary, isLoading, loadError, refresh, submitRequest, updateRequest, hasPermission],
  );

  return <PrayerContext.Provider value={value}>{children}</PrayerContext.Provider>;
}

export function usePrayer() {
  const context = useContext(PrayerContext);
  if (!context) throw new Error('usePrayer must be used within a PrayerProvider');
  return context;
}
