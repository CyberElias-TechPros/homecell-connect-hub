import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import {
  Member,
  MemberContextType,
  MemberFilters,
  PendingChange,
  MemberStats
} from '../types';
import { mockMembers } from '../data/mockData';

const MemberContext = createContext<MemberContextType | null>(null);

// Storage keys
const STORAGE_KEYS = {
  MEMBERS: 'homecell_members',
  PENDING_CHANGES: 'homecell_member_pending_changes',
  LAST_SYNC: 'homecell_member_last_sync'
};

// Helper functions
const generateId = () => Math.random().toString(36).substr(2, 9);

export function MemberProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const [members, setMembers] = useState<Member[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState<string>('');

  // Load data from localStorage on mount
  useEffect(() => {
    const loadStoredData = () => {
      try {
        const storedMembers = localStorage.getItem(STORAGE_KEYS.MEMBERS);
        const storedPending = localStorage.getItem(STORAGE_KEYS.PENDING_CHANGES);
        const storedLastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

        if (storedMembers) {
          setMembers(JSON.parse(storedMembers));
        } else {
          setMembers(mockMembers);
        }
        if (storedPending) {
          setPendingChanges(JSON.parse(storedPending));
        }
        if (storedLastSync) {
          setLastSyncAt(storedLastSync);
        }
      } catch (error) {
        console.error('Error loading member data:', error);
        setMembers(mockMembers);
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
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(pendingChanges));
  }, [pendingChanges]);

  const addMember = async (memberData: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>): Promise<Member> => {
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    try {
      // Check for duplicate phone
      const existing = members.find(m => m.phone === memberData.phone);
      if (existing) {
        throw new Error('A member with this phone number already exists');
      }

      const newMember: Member = {
        ...memberData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setMembers(prev => [...prev, newMember]);

      // Add to pending changes if offline
      if (!isOnline) {
        const change: PendingChange = {
          id: generateId(),
          type: 'create',
          entityType: 'member',
          entityId: newMember.id,
          data: newMember,
          timestamp: new Date().toISOString(),
          retryCount: 0
        };
        setPendingChanges(prev => [...prev, change]);
      }

      return newMember;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMember = async (id: string, updates: Partial<Member>): Promise<Member> => {
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    try {
      const existing = members.find(m => m.id === id);
      if (!existing) throw new Error('Member not found');

      // Check duplicate phone if phone is being updated
      if (updates.phone && updates.phone !== existing.phone) {
        const duplicate = members.find(m => m.id !== id && m.phone === updates.phone);
        if (duplicate) throw new Error('A member with this phone number already exists');
      }

      const updatedMember: Member = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      setMembers(prev => prev.map(m => m.id === id ? updatedMember : m));

      // Add to pending changes if offline
      if (!isOnline) {
        const change: PendingChange = {
          id: generateId(),
          type: 'update',
          entityType: 'member',
          entityId: id,
          data: updates,
          timestamp: new Date().toISOString(),
          retryCount: 0
        };
        setPendingChanges(prev => [...prev, change]);
      }

      return updatedMember;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMember = async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    try {
      const existing = members.find(m => m.id === id);
      if (!existing) throw new Error('Member not found');

      setMembers(prev => prev.filter(m => m.id !== id));

      // Add to pending changes if offline
      if (!isOnline) {
        const change: PendingChange = {
          id: generateId(),
          type: 'delete',
          entityType: 'member',
          entityId: id,
          data: {},
          timestamp: new Date().toISOString(),
          retryCount: 0
        };
        setPendingChanges(prev => [...prev, change]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getMember = (id: string): Member | undefined => {
    return members.find(m => m.id === id);
  };

  const searchMembers = (query: string): Member[] => {
    const lowerQuery = query.toLowerCase();
    return members.filter(m =>
      m.fullName.toLowerCase().includes(lowerQuery) ||
      m.phone.includes(query)
    );
  };

  const filterMembers = (filters: MemberFilters): Member[] => {
    return members.filter(m => {
      if (filters.serviceUnit && m.serviceUnit !== filters.serviceUnit) return false;
      if (filters.membershipType && m.membershipType !== filters.membershipType) return false;
      if (filters.tag && m.tag !== filters.tag) return false;
      if (filters.gender && m.gender !== filters.gender) return false;
      if (filters.maritalStatus && m.maritalStatus !== filters.maritalStatus) return false;
      if (filters.isActive !== undefined && m.isActive !== filters.isActive) return false;
      if (filters.ageRange) {
        const age = new Date().getFullYear() - new Date(m.birthday).getFullYear();
        if (age < filters.ageRange.min || age > filters.ageRange.max) return false;
      }
      return true;
    });
  };

  const getMemberStats = (): MemberStats => {
    const activeMembers = members.filter(m => m.isActive);
    const adults = activeMembers.filter(m => m.tag === 'adult');
    const children = activeMembers.filter(m => m.tag === 'child');
    const males = activeMembers.filter(m => m.gender === 'male');
    const females = activeMembers.filter(m => m.gender === 'female');
    const byMaritalStatus = {
      single: activeMembers.filter(m => m.maritalStatus === 'single').length,
      married: activeMembers.filter(m => m.maritalStatus === 'married').length,
      divorced: activeMembers.filter(m => m.maritalStatus === 'divorced').length,
      widowed: activeMembers.filter(m => m.maritalStatus === 'widowed').length,
    };
    const byMembershipType = {
      regular: activeMembers.filter(m => m.membershipType === 'regular').length,
      visitor: activeMembers.filter(m => m.membershipType === 'visitor').length,
      first_timer: activeMembers.filter(m => m.membershipType === 'first_timer').length,
      inactive: activeMembers.filter(m => m.membershipType === 'inactive').length,
    };
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAdditions = activeMembers.filter(m => new Date(m.joinedAt) > thirtyDaysAgo).length;
    const growthRate = members.length > 0 ? (recentAdditions / members.length) * 100 : 0;

    return {
      totalMembers: members.length,
      activeMembers: activeMembers.length,
      adults: adults.length,
      children: children.length,
      males: males.length,
      females: females.length,
      byMaritalStatus,
      byMembershipType,
      recentAdditions,
      growthRate
    };
  };

  const saveOffline = async (): Promise<void> => {
    // Already saved to localStorage
  };

  const syncMembers = async (): Promise<void> => {
    if (!isOnline || pendingChanges.length === 0) return;

    setIsLoading(true);
    try {
      // Simulate API sync
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clear pending changes
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

  const canAddMember = (): boolean => {
    return hasPermission('add_member');
  };

  const canEditMember = (): boolean => {
    return hasPermission('edit_member');
  };

  const canDeleteMember = (): boolean => {
    return hasPermission('delete_member');
  };

  const canViewMembers = (): boolean => {
    return hasPermission('view_members');
  };

  const canViewStats = (): boolean => {
    return hasPermission('view_member_stats');
  };

  return (
    <MemberContext.Provider value={{
      members,
      isLoading,
      isOnline,
      lastSyncAt,
      addMember,
      updateMember,
      deleteMember,
      getMember,
      searchMembers,
      filterMembers,
      getMemberStats,
      saveOffline,
      syncMembers,
      getPendingChanges,
      canAddMember,
      canEditMember,
      canDeleteMember,
      canViewMembers,
      canViewStats
    }}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMembers() {
  const context = useContext(MemberContext);
  if (!context) {
    throw new Error('useMembers must be used within a MemberProvider');
  }
  return context;
}