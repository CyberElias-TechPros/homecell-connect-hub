import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import { toUiTestimony, type ApiTestimony, type UiTestimony } from '../lib/adapters';

/**
 * Testimonies, backed by the real API.
 *
 * A testimony only becomes visible to the cell once a leader approves it. The
 * server enforces that; this context simply reflects the returned state.
 */

export interface TestimonySummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  public: number;
}

interface TestimoniesContextType {
  testimonies: UiTestimony[];
  summary: TestimonySummary;
  isLoading: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  submit: (input: {
    title: string;
    body: string;
    category?: string;
    visibility?: 'leadership' | 'cell' | 'public';
    isAnonymous?: boolean;
    consentToSharePublicly?: boolean;
  }) => Promise<void>;
  review: (id: string, decision: 'approved' | 'rejected', note?: string) => Promise<void>;
  withdraw: (id: string) => Promise<void>;
}

const TestimoniesContext = createContext<TestimoniesContextType | null>(null);

interface TestimoniesResponse {
  testimonies: ApiTestimony[];
  summary: TestimonySummary;
}

export function TestimoniesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady, user } = useAuth();

  const [testimonies, setTestimonies] = useState<UiTestimony[]>([]);
  const [summary, setSummary] = useState<TestimonySummary>({
    total: 0, pending: 0, approved: 0, rejected: 0, public: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.homecellId) {
      setTestimonies([]);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<TestimoniesResponse>('/api/testimonies');
      setTestimonies((data.testimonies ?? []).map(toUiTestimony));
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load testimonies.');
      setTestimonies([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.homecellId]);

  useEffect(() => {
    if (!isReady) return;
    void refresh();
  }, [isReady, refresh]);

  const submit = useCallback<TestimoniesContextType['submit']>(
    async (input) => {
      await api.post('/api/testimonies', {
        title: input.title,
        body: input.body,
        category: input.category,
        visibility: input.visibility ?? 'cell',
        isAnonymous: input.isAnonymous ?? false,
        // Consent is only recorded when the author actually asked to share it.
        consentToSharePublicly: input.visibility === 'public' && Boolean(input.consentToSharePublicly),
      });
      await refresh();
    },
    [refresh],
  );

  const review = useCallback<TestimoniesContextType['review']>(
    async (id, decision, note) => {
      await api.patch(`/api/testimonies/${id}/review`, { decision, note });
      await refresh();
    },
    [refresh],
  );

  const withdraw = useCallback<TestimoniesContextType['withdraw']>(
    async (id) => {
      await api.del(`/api/testimonies/${id}`);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ testimonies, summary, isLoading, loadError, refresh, submit, review, withdraw }),
    [testimonies, summary, isLoading, loadError, refresh, submit, review, withdraw],
  );

  return <TestimoniesContext.Provider value={value}>{children}</TestimoniesContext.Provider>;
}

export function useTestimonies() {
  const context = useContext(TestimoniesContext);
  if (!context) throw new Error('useTestimonies must be used within a TestimoniesProvider');
  return context;
}
