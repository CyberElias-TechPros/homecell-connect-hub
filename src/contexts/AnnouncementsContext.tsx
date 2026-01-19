import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import {
  Announcement,
  AnnouncementContextType,
  AnnouncementFilters,
  AnnouncementReadReceipt,
  AnnouncementDelivery,
  AnnouncementStats,
  PendingChange
} from '../types';
import { mockAnnouncements } from '../data/mockData';

// Storage keys
const STORAGE_KEYS = {
  ANNOUNCEMENTS: 'homecell_announcements',
  READ_RECEIPTS: 'homecell_read_receipts',
  PENDING_CHANGES: 'homecell_pending_announcement_changes',
  LAST_SYNC: 'homecell_last_announcement_sync'
};

// Helper functions
const generateId = () => Math.random().toString(36).substr(2, 9);

const getCurrentUserTarget = (userRole: string): string[] => {
  const roleTargets: Record<string, string[]> = {
    'member': ['all'],
    'leader': ['all', 'leaders'],
    'assistant': ['all', 'leaders'],
    'provider': ['all', 'providers'],
    'zonal': ['all', 'leaders', 'providers', 'zones'],
    'area': ['all', 'leaders', 'providers', 'zones', 'areas'],
    'district': ['all', 'leaders', 'providers', 'zones', 'areas', 'districts'],
    'admin': ['all', 'leaders', 'providers', 'zones', 'areas', 'districts'],
    'super_admin': ['all', 'leaders', 'providers', 'zones', 'areas', 'districts']
  };
  return roleTargets[userRole] || ['all'];
};

const AnnouncementsContext = createContext<AnnouncementContextType | null>(null);

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readReceipts, setReadReceipts] = useState<AnnouncementReadReceipt[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState<string>('');

  // Load data from localStorage on mount
  useEffect(() => {
    const loadStoredData = () => {
      try {
        const storedAnnouncements = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
        const storedReadReceipts = localStorage.getItem(STORAGE_KEYS.READ_RECEIPTS);
        const storedPendingChanges = localStorage.getItem(STORAGE_KEYS.PENDING_CHANGES);
        const storedLastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

        if (storedAnnouncements) {
          setAnnouncements(JSON.parse(storedAnnouncements));
        } else {
          // Load mock data if no stored data
          setAnnouncements(mockAnnouncements);
        }
        if (storedReadReceipts) {
          setReadReceipts(JSON.parse(storedReadReceipts));
        }
        if (storedPendingChanges) {
          setPendingChanges(JSON.parse(storedPendingChanges));
        }
        if (storedLastSync) {
          setLastSyncAt(storedLastSync);
        }
      } catch (error) {
        console.error('Error loading announcements data:', error);
        // Fallback to mock data
        setAnnouncements(mockAnnouncements);
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
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.READ_RECEIPTS, JSON.stringify(readReceipts));
  }, [readReceipts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(pendingChanges));
  }, [pendingChanges]);

  const createAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'deliveryStats'>): Promise<Announcement> => {
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    try {
      const newAnnouncement: Announcement = {
        ...announcementData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        createdBy: user.id,
        createdByName: user.name,
        updatedAt: new Date().toISOString(),
        deliveryStats: {
          totalRecipients: 0, // Will be calculated based on target
          delivered: 0,
          read: 0,
          failed: 0
        }
      };

      setAnnouncements(prev => [newAnnouncement, ...prev]);

      // Add to pending changes if offline
      if (!isOnline) {
        const change: PendingChange = {
          id: generateId(),
          type: 'create',
          entityType: 'announcement',
          entityId: newAnnouncement.id,
          data: newAnnouncement,
          timestamp: new Date().toISOString(),
          retryCount: 0
        };
        setPendingChanges(prev => [...prev, change]);
      }

      return newAnnouncement;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAnnouncement = async (id: string, updates: Partial<Announcement>): Promise<Announcement> => {
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    try {
      const updatedAnnouncement = announcements.find(a => a.id === id);
      if (!updatedAnnouncement) throw new Error('Announcement not found');

      const updated: Announcement = {
        ...updatedAnnouncement,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      setAnnouncements(prev => prev.map(a => a.id === id ? updated : a));

      // Add to pending changes if offline
      if (!isOnline) {
        const change: PendingChange = {
          id: generateId(),
          type: 'update',
          entityType: 'announcement',
          entityId: id,
          data: updates,
          timestamp: new Date().toISOString(),
          retryCount: 0
        };
        setPendingChanges(prev => [...prev, change]);
      }

      return updated;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAnnouncement = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      setAnnouncements(prev => prev.filter(a => a.id !== id));

      // Add to pending changes if offline
      if (!isOnline) {
        const change: PendingChange = {
          id: generateId(),
          type: 'delete',
          entityType: 'announcement',
          entityId: id,
          data: null,
          timestamp: new Date().toISOString(),
          retryCount: 0
        };
        setPendingChanges(prev => [...prev, change]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const publishAnnouncement = async (id: string): Promise<void> => {
    await updateAnnouncement(id, {
      status: 'published',
      publishedAt: new Date().toISOString()
    });
  };

  const scheduleAnnouncement = async (id: string, scheduledAt: string): Promise<void> => {
    await updateAnnouncement(id, {
      status: 'scheduled',
      scheduledAt
    });
  };

  const getAnnouncements = (filters?: AnnouncementFilters): Announcement[] => {
    let filtered = announcements;

    if (filters) {
      if (filters.status) {
        filtered = filtered.filter(a => a.status === filters.status);
      }
      if (filters.target) {
        filtered = filtered.filter(a => a.target === filters.target);
      }
      if (filters.urgency) {
        filtered = filtered.filter(a => a.urgency === filters.urgency);
      }
      if (filters.channel && filters.channel.length > 0) {
        filtered = filtered.filter(a => a.channels.some(c => filters.channel!.includes(c)));
      }
      if (filters.dateRange) {
        filtered = filtered.filter(a => {
          const createdAt = new Date(a.createdAt || a.updatedAt);
          const start = new Date(filters.dateRange!.start);
          const end = new Date(filters.dateRange!.end);
          return createdAt >= start && createdAt <= end;
        });
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(a =>
          a.title.toLowerCase().includes(searchLower) ||
          a.content.toLowerCase().includes(searchLower)
        );
      }
      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(a => a.tags?.some(tag => filters.tags!.includes(tag)));
      }
    }

    // Filter by user permissions/targets
    if (user) {
      const userTargets = getCurrentUserTarget(user.role);
      filtered = filtered.filter(a => userTargets.includes(a.target));
    }

    // Sort by creation date (newest first)
    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  };

  const markAsRead = async (announcementId: string): Promise<void> => {
    if (!user) return;

    const existingReceipt = readReceipts.find(r => r.announcementId === announcementId && r.userId === user.id);
    if (existingReceipt) return;

    const receipt: AnnouncementReadReceipt = {
      announcementId,
      userId: user.id,
      readAt: new Date().toISOString(),
      deviceInfo: {
        platform: navigator.platform,
        version: navigator.userAgent
      }
    };

    setReadReceipts(prev => [...prev, receipt]);

    // Update announcement read count
    const announcement = announcements.find(a => a.id === announcementId);
    if (announcement) {
      await updateAnnouncement(announcementId, {
        deliveryStats: {
          ...announcement.deliveryStats,
          read: announcement.deliveryStats.read + 1
        }
      });
    }
  };

  const getUnreadCount = (): number => {
    if (!user) return 0;

    const userTargets = getCurrentUserTarget(user.role);
    const relevantAnnouncements = announcements.filter(a =>
      userTargets.includes(a.target) &&
      a.status === 'published' &&
      !readReceipts.some(r => r.announcementId === a.id && r.userId === user.id)
    );

    return relevantAnnouncements.length;
  };

  const getReadReceipts = (announcementId: string): AnnouncementReadReceipt[] => {
    return readReceipts.filter(r => r.announcementId === announcementId);
  };

  const getAnnouncementStats = (): AnnouncementStats => {
    const published = announcements.filter(a => a.status === 'published');
    const thisMonth = published.filter(a => {
      const publishedAt = new Date(a.publishedAt!);
      const now = new Date();
      return publishedAt.getMonth() === now.getMonth() && publishedAt.getFullYear() === now.getFullYear();
    });

    const totalRead = announcements.reduce((sum, a) => sum + a.deliveryStats.read, 0);
    const totalDelivered = announcements.reduce((sum, a) => sum + a.deliveryStats.delivered, 0);
    const averageReadRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;

    const byUrgency = announcements.reduce((acc, a) => {
      acc[a.urgency] = (acc[a.urgency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byChannel = announcements.reduce((acc, a) => {
      a.channels.forEach(channel => {
        acc[channel] = (acc[channel] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const byTarget = announcements.reduce((acc, a) => {
      acc[a.target] = (acc[a.target] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAnnouncements: announcements.length,
      publishedThisMonth: thisMonth.length,
      averageReadRate,
      byUrgency: byUrgency as Record<string, number>,
      byChannel: byChannel as Record<string, number>,
      byTarget: byTarget as Record<string, number>
    };
  };

  const getDeliveryReport = (announcementId: string): AnnouncementDelivery[] => {
    // Mock delivery data - in real app this would come from backend
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return [];

    // Simulate deliveries based on target
    const mockDeliveries: AnnouncementDelivery[] = [];
    // This would be populated from actual delivery tracking
    return mockDeliveries;
  };

  const saveOffline = async (): Promise<void> => {
    // Already handled by useEffect
  };

  const syncAnnouncements = async (): Promise<void> => {
    if (!isOnline || pendingChanges.length === 0) return;

    setIsLoading(true);
    try {
      // Simulate API sync
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clear pending changes after successful sync
      setPendingChanges([]);
      setLastSyncAt(new Date().toISOString());
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  };

  const getPendingChanges = (): PendingChange[] => {
    return pendingChanges;
  };

  const canCreateAnnouncement = (): boolean => {
    return hasPermission('create_announcements');
  };

  const canEditAnnouncement = (announcement: Announcement): boolean => {
    if (!user) return false;
    return hasPermission('edit_announcements') || announcement.createdBy === user.id;
  };

  const canDeleteAnnouncement = (announcement: Announcement): boolean => {
    if (!user) return false;
    return hasPermission('delete_announcements') || announcement.createdBy === user.id;
  };

  const canViewAnnouncement = (announcement: Announcement): boolean => {
    if (!user) return false;
    const userTargets = getCurrentUserTarget(user.role);
    return userTargets.includes(announcement.target);
  };

  const canPublishAnnouncement = (): boolean => {
    return hasPermission('publish_announcements');
  };

  return (
    <AnnouncementsContext.Provider value={{
      announcements,
      isLoading,
      isOnline,
      lastSyncAt,
      createAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      publishAnnouncement,
      scheduleAnnouncement,
      getAnnouncements,
      markAsRead,
      getUnreadCount,
      getReadReceipts,
      getAnnouncementStats,
      getDeliveryReport,
      saveOffline,
      syncAnnouncements,
      getPendingChanges,
      canCreateAnnouncement,
      canEditAnnouncement,
      canDeleteAnnouncement,
      canViewAnnouncement,
      canPublishAnnouncement
    }}>
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