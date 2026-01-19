import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Material } from '../types';
import { mockMaterials } from '../data/mockData';
import { useAuth } from './AuthContext';

interface MaterialsContextType {
  // State
  materials: Material[];
  isLoading: boolean;
  isOnline: boolean;
  lastSyncAt: string;

  // CRUD Operations
  uploadMaterial: (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Material>;
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<Material>;
  deleteMaterial: (id: string) => Promise<void>;
  publishMaterial: (id: string) => Promise<void>;
  scheduleMaterial: (id: string, scheduledAt: string) => Promise<void>;

  // Access Control
  getAccessibleMaterials: () => Material[];
  getCurrentWeekMaterials: () => Material[];
  getMaterialsByAudience: (audience: Material['targetAudience']) => Material[];

  // Offline Support
  downloadMaterial: (id: string) => Promise<void>;
  getDownloadedMaterials: () => Material[];
  acknowledgeMaterial: (id: string) => Promise<void>;
  isMaterialAcknowledged: (id: string) => boolean;

  // Sync
  syncMaterials: () => Promise<void>;
  getPendingChanges: () => any[];

  // Permissions
  canUploadMaterials: () => boolean;
  canManageMaterials: () => boolean;
  canViewMaterials: () => boolean;
  canDownloadMaterials: () => boolean;
  canAcknowledgeMaterials: () => boolean;
}

const MaterialsContext = createContext<MaterialsContextType | null>(null);

export function MaterialsProvider({ children }: { children: ReactNode }) {
  const { user, hasPermission } = useAuth();
  const [materials, setMaterials] = useState<Material[]>(mockMaterials);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState(new Date().toISOString());

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load downloaded materials from localStorage
  useEffect(() => {
    const downloadedMaterials = localStorage.getItem('downloadedMaterials');
    if (downloadedMaterials) {
      const downloaded = JSON.parse(downloadedMaterials);
      setMaterials(prev => prev.map(material =>
        downloaded.includes(material.id)
          ? { ...material, downloaded: true, downloadedAt: material.downloadedAt || new Date().toISOString() }
          : material
      ));
    }

    const acknowledgedMaterials = localStorage.getItem('acknowledgedMaterials');
    if (acknowledgedMaterials) {
      const acknowledged = JSON.parse(acknowledgedMaterials);
      setMaterials(prev => prev.map(material =>
        acknowledged[material.id]
          ? { ...material, acknowledgedBy: acknowledged[material.id] }
          : material
      ));
    }
  }, []);

  const uploadMaterial = async (materialData: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<Material> => {
    if (!canUploadMaterials()) {
      throw new Error('Insufficient permissions to upload materials');
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newMaterial: Material = {
        ...materialData,
        id: `mat${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };

      setMaterials(prev => [...prev, newMaterial]);
      return newMaterial;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMaterial = async (id: string, updates: Partial<Material>): Promise<Material> => {
    if (!canManageMaterials()) {
      throw new Error('Insufficient permissions to update materials');
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedMaterials = materials.map(material =>
        material.id === id
          ? { ...material, ...updates, updatedAt: new Date().toISOString() }
          : material
      );

      setMaterials(updatedMaterials);
      return updatedMaterials.find(m => m.id === id)!;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMaterial = async (id: string): Promise<void> => {
    if (!canManageMaterials()) {
      throw new Error('Insufficient permissions to delete materials');
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setMaterials(prev => prev.filter(material => material.id !== id));
    } finally {
      setIsLoading(false);
    }
  };

  const publishMaterial = async (id: string): Promise<void> => {
    await updateMaterial(id, { isPublished: true, publishedAt: new Date().toISOString() });
  };

  const scheduleMaterial = async (id: string, scheduledAt: string): Promise<void> => {
    await updateMaterial(id, { scheduledAt });
  };

  const getAccessibleMaterials = (): Material[] => {
    if (!user) return [];

    const userRole = user.role;
    const now = new Date();

    return materials.filter(material => {
      // Check if material is published or scheduled
      if (!material.isPublished && (!material.scheduledAt || new Date(material.scheduledAt) > now)) {
        return false;
      }

      // Role-based access
      switch (userRole) {
        case 'admin':
        case 'super_admin':
          return true; // Can see all materials
        case 'leader':
        case 'assistant':
        case 'zonal':
        case 'area':
        case 'district':
          return material.targetAudience === 'all' ||
                 material.targetAudience === 'leaders' ||
                 material.targetAudience === 'assistants';
        case 'provider':
          return material.targetAudience === 'all' || material.targetAudience === 'providers';
        case 'member':
          return material.targetAudience === 'all';
        default:
          return false;
      }
    });
  };

  const getCurrentWeekMaterials = (): Material[] => {
    const accessibleMaterials = getAccessibleMaterials();
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);

    return accessibleMaterials.filter(material => {
      const publishedDate = new Date(material.publishedAt);
      return publishedDate >= startOfWeek && publishedDate <= endOfWeek && material.type === 'weekly';
    });
  };

  const getMaterialsByAudience = (audience: Material['targetAudience']): Material[] => {
    return materials.filter(material => material.targetAudience === audience);
  };

  const downloadMaterial = async (id: string): Promise<void> => {
    if (!canDownloadMaterials()) {
      throw new Error('Insufficient permissions to download materials');
    }

    const material = materials.find(m => m.id === id);
    if (!material) {
      throw new Error('Material not found');
    }

    // Simulate download
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const updatedMaterials = materials.map(m =>
        m.id === id
          ? { ...m, downloaded: true, downloadedAt: new Date().toISOString(), localPath: `/downloads/${m.id}.${m.format}` }
          : m
      );

      setMaterials(updatedMaterials);

      // Save to localStorage
      const downloaded = updatedMaterials.filter(m => m.downloaded).map(m => m.id);
      localStorage.setItem('downloadedMaterials', JSON.stringify(downloaded));
    } finally {
      setIsLoading(false);
    }
  };

  const getDownloadedMaterials = (): Material[] => {
    return materials.filter(material => material.downloaded);
  };

  const acknowledgeMaterial = async (id: string): Promise<void> => {
    if (!canAcknowledgeMaterials()) {
      throw new Error('Insufficient permissions to acknowledge materials');
    }

    if (!user) return;

    const material = materials.find(m => m.id === id);
    if (!material || !material.requiresAcknowledgment) {
      return;
    }

    const updatedMaterials = materials.map(m =>
      m.id === id
        ? {
            ...m,
            acknowledgedBy: [...(m.acknowledgedBy || []), user.id]
          }
        : m
    );

    setMaterials(updatedMaterials);

    // Save to localStorage
    const acknowledged: Record<string, string[]> = {};
    updatedMaterials.forEach(m => {
      if (m.acknowledgedBy?.length) {
        acknowledged[m.id] = m.acknowledgedBy;
      }
    });
    localStorage.setItem('acknowledgedMaterials', JSON.stringify(acknowledged));
  };

  const isMaterialAcknowledged = (id: string): boolean => {
    if (!user) return false;
    const material = materials.find(m => m.id === id);
    return material?.acknowledgedBy?.includes(user.id) || false;
  };

  const syncMaterials = async (): Promise<void> => {
    if (!isOnline) return;

    setIsLoading(true);
    try {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastSyncAt(new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  };

  const getPendingChanges = (): any[] => {
    // Placeholder for pending changes
    return [];
  };

  // Permission checks
  const canUploadMaterials = (): boolean => hasPermission('upload_materials');
  const canManageMaterials = (): boolean => hasPermission('manage_materials');
  const canViewMaterials = (): boolean => hasPermission('view_materials') || hasPermission('view_current_week_materials');
  const canDownloadMaterials = (): boolean => hasPermission('download_materials') || hasPermission('download_current_week_materials');
  const canAcknowledgeMaterials = (): boolean => hasPermission('acknowledge_materials');

  return (
    <MaterialsContext.Provider value={{
      materials,
      isLoading,
      isOnline,
      lastSyncAt,
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
      canUploadMaterials,
      canManageMaterials,
      canViewMaterials,
      canDownloadMaterials,
      canAcknowledgeMaterials
    }}>
      {children}
    </MaterialsContext.Provider>
  );
}

export function useMaterials() {
  const context = useContext(MaterialsContext);
  if (!context) {
    throw new Error('useMaterials must be used within a MaterialsProvider');
  }
  return context;
}