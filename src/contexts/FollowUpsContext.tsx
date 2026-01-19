import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FollowUp, FollowUpContextType, FollowUpStats, FollowUpFilters, FollowUpHistoryEntry } from '@/types';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import { mockFollowUps } from '@/data/mockData';

const FollowUpsContext = createContext<FollowUpContextType | undefined>(undefined);

export function FollowUpsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState<string>(new Date().toISOString());

  // Initialize with mock data and enhance with additional fields
  useEffect(() => {
    const enhancedFollowUps: FollowUp[] = mockFollowUps.map(followUp => ({
      ...followUp,
      address: undefined,
      assignedBy: user?.id || 'admin1',
      assignedByName: user?.name || 'Admin User',
      priority: 'normal' as const,
      followUpHistory: [],
      nextFollowUpDate: undefined,
      lastContactDate: followUp.updatedAt,
      createdBy: user?.id || 'admin1',
      updatedBy: user?.id || 'admin1',
      isOverdue: false,
      overdueDays: 0,
      tags: [],
    }));

    // Calculate overdue status
    const now = new Date();
    const updatedFollowUps = enhancedFollowUps.map(followUp => {
      const createdDate = new Date(followUp.createdAt);
      const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      let isOverdue = false;
      let overdueDays = 0;

      if (followUp.status === 'pending' && daysSinceCreation > 3) {
        isOverdue = true;
        overdueDays = daysSinceCreation - 3;
      } else if (followUp.status === 'contacted' && daysSinceCreation > 7) {
        isOverdue = true;
        overdueDays = daysSinceCreation - 7;
      } else if (followUp.status === 'visited' && daysSinceCreation > 14) {
        isOverdue = true;
        overdueDays = daysSinceCreation - 14;
      }

      return {
        ...followUp,
        isOverdue,
        overdueDays,
      };
    });

    setFollowUps(updatedFollowUps);
  }, [user]);

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

  const createFollowUp = useCallback(async (followUpData: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt' | 'followUpHistory' | 'isOverdue' | 'overdueDays'>): Promise<FollowUp> => {
    if (!canCreateFollowUp()) {
      throw new Error('Insufficient permissions to create follow-up');
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const newFollowUp: FollowUp = {
        ...followUpData,
        id: `fu-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
        followUpHistory: [],
        isOverdue: false,
        overdueDays: 0,
      };

      setFollowUps(prev => [...prev, newFollowUp]);
      setLastSyncAt(now);
      return newFollowUp;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateFollowUp = useCallback(async (id: string, updates: Partial<FollowUp>): Promise<FollowUp> => {
    const followUp = followUps.find(f => f.id === id);
    if (!followUp || !canEditFollowUp(followUp)) {
      throw new Error('Insufficient permissions to update follow-up');
    }

    setIsLoading(true);
    try {
      const updatedFollowUp: FollowUp = {
        ...followUp,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.id || 'unknown',
      };

      setFollowUps(prev => prev.map(f => f.id === id ? updatedFollowUp : f));
      setLastSyncAt(updatedFollowUp.updatedAt);
      return updatedFollowUp;
    } finally {
      setIsLoading(false);
    }
  }, [followUps, user]);

  const updateFollowUpStatus = useCallback(async (
    id: string,
    status: FollowUp['status'],
    notes?: string,
    contactMethod?: FollowUpHistoryEntry['contactMethod']
  ): Promise<FollowUp> => {
    const followUp = followUps.find(f => f.id === id);
    if (!followUp || !canEditFollowUp(followUp)) {
      throw new Error('Insufficient permissions to update follow-up status');
    }

    const now = new Date().toISOString();
    const historyEntry: FollowUpHistoryEntry = {
      id: `h-${Date.now()}`,
      status,
      notes: notes || `Status updated to ${status}`,
      contactMethod,
      contactDate: now,
      updatedBy: user?.id || 'unknown',
      updatedByName: user?.name || 'Unknown User',
      createdAt: now,
    };

    const updatedFollowUp: FollowUp = {
      ...followUp,
      status,
      notes: notes || followUp.notes,
      followUpHistory: [...followUp.followUpHistory, historyEntry],
      lastContactDate: now,
      updatedAt: now,
      updatedBy: user?.id || 'unknown',
    };

    // Recalculate overdue status
    const createdDate = new Date(followUp.createdAt);
    const daysSinceCreation = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    let isOverdue = false;
    let overdueDays = 0;

    if (status === 'pending' && daysSinceCreation > 3) {
      isOverdue = true;
      overdueDays = daysSinceCreation - 3;
    } else if (status === 'contacted' && daysSinceCreation > 7) {
      isOverdue = true;
      overdueDays = daysSinceCreation - 7;
    } else if (status === 'visited' && daysSinceCreation > 14) {
      isOverdue = true;
      overdueDays = daysSinceCreation - 14;
    }

    updatedFollowUp.isOverdue = isOverdue;
    updatedFollowUp.overdueDays = overdueDays;

    setFollowUps(prev => prev.map(f => f.id === id ? updatedFollowUp : f));
    setLastSyncAt(now);
    return updatedFollowUp;
  }, [followUps, user]);

  const reassignFollowUp = useCallback(async (id: string, newAssigneeId: string, reason?: string): Promise<FollowUp> => {
    const followUp = followUps.find(f => f.id === id);
    if (!followUp || !canReassignFollowUp(followUp)) {
      throw new Error('Insufficient permissions to reassign follow-up');
    }

    // Mock user lookup - in real app, this would come from user context
    const mockUsers = [
      { id: 'm1', name: 'Adebayo Johnson' },
      { id: 'm2', name: 'Chidinma Okafor' },
      { id: 'm3', name: 'Emmanuel Nwachukwu' },
    ];

    const newAssignee = mockUsers.find(u => u.id === newAssigneeId);
    if (!newAssignee) {
      throw new Error('Assignee not found');
    }

    const now = new Date().toISOString();
    const historyEntry: FollowUpHistoryEntry = {
      id: `h-${Date.now()}`,
      status: followUp.status,
      notes: `Reassigned to ${newAssignee.name}${reason ? `: ${reason}` : ''}`,
      contactDate: now,
      updatedBy: user?.id || 'unknown',
      updatedByName: user?.name || 'Unknown User',
      createdAt: now,
    };

    const updatedFollowUp: FollowUp = {
      ...followUp,
      assignedTo: newAssigneeId,
      assignedToName: newAssignee.name,
      followUpHistory: [...followUp.followUpHistory, historyEntry],
      updatedAt: now,
      updatedBy: user?.id || 'unknown',
    };

    setFollowUps(prev => prev.map(f => f.id === id ? updatedFollowUp : f));
    setLastSyncAt(now);
    return updatedFollowUp;
  }, [followUps, user]);

  const deleteFollowUp = useCallback(async (id: string): Promise<void> => {
    const followUp = followUps.find(f => f.id === id);
    if (!followUp || !canDeleteFollowUp(followUp)) {
      throw new Error('Insufficient permissions to delete follow-up');
    }

    setFollowUps(prev => prev.filter(f => f.id !== id));
  }, [followUps]);

  const getFollowUps = useCallback((filters?: FollowUpFilters): FollowUp[] => {
    let filtered = followUps;

    if (filters) {
      if (filters.status) {
        filtered = filtered.filter(f => f.status === filters.status);
      }
      if (filters.assignedTo) {
        filtered = filtered.filter(f => f.assignedTo === filters.assignedTo);
      }
      if (filters.priority) {
        filtered = filtered.filter(f => f.priority === filters.priority);
      }
      if (filters.isOverdue !== undefined) {
        filtered = filtered.filter(f => f.isOverdue === filters.isOverdue);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(f =>
          f.memberName.toLowerCase().includes(searchLower) ||
          f.phone.includes(searchLower) ||
          f.notes.toLowerCase().includes(searchLower)
        );
      }
      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(f =>
          f.tags?.some(tag => filters.tags!.includes(tag))
        );
      }
    }

    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [followUps]);

  const getFollowUp = useCallback((id: string): FollowUp | undefined => {
    return followUps.find(f => f.id === id);
  }, [followUps]);

  const getAssignedFollowUps = useCallback((userId: string): FollowUp[] => {
    return followUps.filter(f => f.assignedTo === userId);
  }, [followUps]);

  const getOverdueFollowUps = useCallback((): FollowUp[] => {
    return followUps.filter(f => f.isOverdue);
  }, [followUps]);

  const getFollowUpStats = useCallback((): FollowUpStats => {
    const total = followUps.length;
    const pending = followUps.filter(f => f.status === 'pending').length;
    const contacted = followUps.filter(f => f.status === 'contacted').length;
    const visited = followUps.filter(f => f.status === 'visited').length;
    const integrated = followUps.filter(f => f.status === 'integrated').length;
    const overdue = followUps.filter(f => f.isOverdue).length;

    const successRate = total > 0 ? (integrated / total) * 100 : 0;

    // Calculate averages (simplified)
    const averageDaysToContact = contacted > 0 ? 2 : 0; // Mock calculation
    const averageDaysToVisit = visited > 0 ? 5 : 0;
    const averageDaysToIntegration = integrated > 0 ? 12 : 0;

    // Mock weekly trends
    const weeklyTrends = [
      { week: 'Week 1', new: 2, completed: 1, successRate: 50 },
      { week: 'Week 2', new: 3, completed: 2, successRate: 67 },
      { week: 'Week 3', new: 1, completed: 1, successRate: 100 },
      { week: 'Week 4', new: 2, completed: 0, successRate: 0 },
    ];

    return {
      total,
      pending,
      contacted,
      visited,
      integrated,
      overdue,
      successRate,
      averageDaysToContact,
      averageDaysToVisit,
      averageDaysToIntegration,
      weeklyTrends,
    };
  }, [followUps]);

  const getSuccessMetrics = useCallback(() => {
    const stats = getFollowUpStats();
    return {
      conversionRate: stats.successRate,
      averageTimeToIntegration: stats.averageDaysToIntegration,
      followUpEfficiency: stats.total > 0 ? ((stats.contacted + stats.visited + stats.integrated) / stats.total) * 100 : 0,
    };
  }, [getFollowUpStats]);

  const saveOffline = useCallback(async (): Promise<void> => {
    // Mock offline save
    localStorage.setItem('followUps', JSON.stringify(followUps));
  }, [followUps]);

  const syncFollowUps = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Mock sync - in real app, this would sync with server
      setLastSyncAt(new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPendingChanges = useCallback(() => {
    // Mock pending changes - in real app, this would track unsynced changes
    return [];
  }, []);

  // Permission checks
  const canCreateFollowUp = useCallback((): boolean => {
    return hasPermission('followup.create') || user?.role === 'leader' || user?.role === 'admin';
  }, [hasPermission, user]);

  const canEditFollowUp = useCallback((followUp: FollowUp): boolean => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'leader') return true;
    if (user?.role === 'assistant') return followUp.assignedTo === user.id;
    return false;
  }, [user]);

  const canDeleteFollowUp = useCallback((followUp: FollowUp): boolean => {
    return user?.role === 'admin' || (user?.role === 'leader' && followUp.assignedTo === user.id);
  }, [user]);

  const canViewFollowUps = useCallback((): boolean => {
    return hasPermission('followup.view') || ['leader', 'assistant', 'provider', 'admin'].includes(user?.role || '');
  }, [hasPermission, user]);

  const canReassignFollowUp = useCallback((followUp: FollowUp): boolean => {
    return user?.role === 'admin' || user?.role === 'leader';
  }, [user]);

  const canViewAnalytics = useCallback((): boolean => {
    return user?.role === 'admin' || user?.role === 'leader';
  }, [user]);

  const contextValue: FollowUpContextType = {
    followUps,
    isLoading,
    isOnline,
    lastSyncAt,
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
    canCreateFollowUp,
    canEditFollowUp,
    canDeleteFollowUp,
    canViewFollowUps,
    canReassignFollowUp,
    canViewAnalytics,
  };

  return (
    <FollowUpsContext.Provider value={contextValue}>
      {children}
    </FollowUpsContext.Provider>
  );
}

export function useFollowUps(): FollowUpContextType {
  const context = useContext(FollowUpsContext);
  if (context === undefined) {
    throw new Error('useFollowUps must be used within a FollowUpsProvider');
  }
  return context;
}