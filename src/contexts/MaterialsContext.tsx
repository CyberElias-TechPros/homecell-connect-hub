import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { api } from '../lib/api';
import { toUiMaterial, type ApiMaterial } from '../lib/adapters';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import type { Material } from '../types';

interface MaterialsContextType {
  materials: Material[];
  isLoading: boolean;
  isOnline: boolean;
  lastSyncAt: string;
  loadError: string | null;

  uploadMaterial: (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Material>;
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<Material>;
  deleteMaterial: (id: string) => Promise<void>;
  publishMaterial: (id: string) => Promise<void>;
  scheduleMaterial: (id: string, scheduledAt: string) => Promise<void>;

  getAccessibleMaterials: () => Material[];
  getCurrentWeekMaterials: () => Material[];
  getMaterialsByAudience: (audience: Material['targetAudience']) => Material[];

  downloadMaterial: (id: string) => Promise<void>;
  getDownloadedMaterials: () => Material[];
  acknowledgeMaterial: (id: string) => Promise<void>;
  isMaterialAcknowledged: (id: string) => boolean;

  syncMaterials: () => Promise<void>;
  getPendingChanges: () => unknown[];

  canUploadMaterials: () => boolean;
  canManageMaterials: () => boolean;
  canViewMaterials: () => boolean;
  canDownloadMaterials: () => boolean;
  canAcknowledgeMaterials: () => boolean;
}

/**
 * Study materials, backed by the real API.
 *
 * The materials module stores links and metadata. Ministry content must not be
 * re-hosted without authorisation, so official resources are referenced by URL
 * rather than copied onto this platform.
 *
 * Acknowledgements are persisted server-side, which means a provider's
 * acknowledgement of this week's outline is visible to the leader — the main
 * reason this needs a database rather than localStorage.
 */
const MaterialsContext = createContext<MaterialsContextType | null>(null);

interface MaterialsResponse {
  materials: ApiMaterial[];
}

export function MaterialsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();
  const { hasPermission } = usePermissions();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const canViewMaterials = useCallback(() => hasPermission('view_materials'), [hasPermission]);

  const load = useCallback(async () => {
    if (!isAuthenticated || !canViewMaterials()) {
      setMaterials([]);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<MaterialsResponse>('/api/materials');
      setMaterials((data.materials ?? []).map((m) => toUiMaterial(m, m.acknowledged ? ['me'] : [])));
      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load materials.');
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, canViewMaterials]);

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

  const uploadMaterial = useCallback(
    async (input: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<Material> => {
      if (!input.url) {
        throw new Error('A link is required. File uploads are not enabled on this deployment yet.');
      }
      const created = await api.post<{ id: string }>('/api/materials', {
        title: input.title,
        description: input.description || undefined,
        category: input.type,
        // Map the UI's format onto the API's material_type vocabulary.
        materialType:
          input.format === 'audio' ? 'audio' : input.format === 'text' ? 'document' : 'document',
        url: input.url,
      });
      await load();
      return (
        materials.find((m) => m.id === created.id) ?? { ...input, id: created.id }
      );
    },
    [load, materials],
  );

  const updateMaterial = useCallback(async (id: string, updates: Partial<Material>): Promise<Material> => {
    const existing = materials.find((m) => m.id === id);
    if (!existing) throw new Error('That material could not be found.');
    if (updates.url && updates.url !== existing.url) {
      throw new Error('Materials cannot be edited after publishing. Publish a corrected version instead.');
    }
    // Metadata-only changes are not supported by the API yet.
    throw new Error('Editing published materials is not supported yet. Publish a corrected version instead.');
  }, [materials]);

  const deleteMaterial = useCallback(async (id: string): Promise<void> => {
    void id;
    // There is no delete endpoint: removing study material would silently
    // change what members see, so it is a deliberate omission for now.
    throw new Error('Deleting materials is not supported yet.');
  }, []);

  const publishMaterial = useCallback(async (id: string): Promise<void> => {
    // Materials publish immediately on creation.
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, isPublished: true } : m)));
  }, []);

  const scheduleMaterial = useCallback(async (id: string, scheduledAt: string): Promise<void> => {
    void id;
    void scheduledAt;
    throw new Error('Scheduling materials is not available yet. Publish it now instead.');
  }, []);

  const getAccessibleMaterials = useCallback(() => materials, [materials]);

  const getCurrentWeekMaterials = useCallback(() => {
    const now = Date.now();
    return materials.filter((m) => now - new Date(m.publishedAt).getTime() < 7 * 86400000);
  }, [materials]);

  const getMaterialsByAudience = useCallback(
    (audience: Material['targetAudience']) => materials.filter((m) => m.targetAudience === audience),
    [materials],
  );

  /**
   * Record a download.
   *
   * The file is fetched by the browser from its own URL; what is persisted is
   * the acknowledgement that this person has taken the material, which is what
   * the leader actually needs to see.
   */
  const downloadMaterial = useCallback(async (id: string): Promise<void> => {
    const material = materials.find((m) => m.id === id);
    if (!material) throw new Error('That material could not be found.');

    if (material.url) {
      window.open(material.url, '_blank', 'noopener,noreferrer');
    }

    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, downloaded: true, downloadedAt: new Date().toISOString() } : m)),
    );
    try {
      await api.post(`/api/materials/${id}/ack`, { type: 'downloaded' });
    } catch {
      // A failed acknowledgement must not block the member from reading.
    }
  }, [materials]);

  const getDownloadedMaterials = useCallback(
    () => materials.filter((m) => m.downloaded),
    [materials],
  );

  const acknowledgeMaterial = useCallback(async (id: string): Promise<void> => {
    await api.post(`/api/materials/${id}/ack`, { type: 'acknowledged' });
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, acknowledgedBy: [...(m.acknowledgedBy ?? []), 'me'] } : m)),
    );
  }, []);

  const isMaterialAcknowledged = useCallback(
    (id: string) => {
      const material = materials.find((m) => m.id === id);
      return Boolean(material?.acknowledgedBy?.includes('me'));
    },
    [materials],
  );

  const syncMaterials = useCallback(async () => {
    await load();
  }, [load]);

  const getPendingChanges = useCallback((): unknown[] => [], []);

  const value = useMemo(
    () => ({
      materials,
      isLoading,
      isOnline,
      lastSyncAt,
      loadError,
      uploadMaterial,
      updateMaterial,
      deleteMaterial,
      publishMaterial,
      scheduleMaterial,
      getAccessibleMaterials,
      getCurrentWeekMaterials,
      getMaterialsByAudience,
      downloadMaterial,
      getDownloadedMaterials,
      acknowledgeMaterial,
      isMaterialAcknowledged,
      syncMaterials,
      getPendingChanges,
      canUploadMaterials: () => hasPermission('upload_materials'),
      canManageMaterials: () => hasPermission('manage_materials'),
      canViewMaterials,
      canDownloadMaterials: () => hasPermission('download_materials'),
      canAcknowledgeMaterials: () => hasPermission('view_materials'),
    }),
    [
      materials, isLoading, isOnline, lastSyncAt, loadError,
      uploadMaterial, updateMaterial, deleteMaterial, publishMaterial, scheduleMaterial,
      getAccessibleMaterials, getCurrentWeekMaterials, getMaterialsByAudience,
      downloadMaterial, getDownloadedMaterials, acknowledgeMaterial, isMaterialAcknowledged,
      syncMaterials, getPendingChanges, hasPermission, canViewMaterials,
    ],
  );

  return <MaterialsContext.Provider value={value}>{children}</MaterialsContext.Provider>;
}

export function useMaterials() {
  const context = useContext(MaterialsContext);
  if (!context) {
    throw new Error('useMaterials must be used within a MaterialsProvider');
  }
  return context;
}
