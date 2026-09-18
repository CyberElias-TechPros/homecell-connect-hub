import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionsContext';
import { api, ApiError } from '../lib/api';
import { toUiMember, toApiMemberStatus, type ApiMember } from '../lib/adapters';
import type { Member, MemberContextType, MemberFilters, PendingChange, MemberStats } from '../types';

/**
 * Member roster, backed by the real API.
 *
 * There is no offline write queue yet: writes go straight to the server and
 * fail loudly if they cannot be delivered, rather than being queued locally
 * and silently lost. `saveOffline`/`getPendingChanges` are therefore honest
 * no-ops that report "nothing pending" instead of pretending to sync.
 */
const MemberContext = createContext<MemberContextType | null>(null);

interface MembersResponse {
  members: ApiMember[];
  total: number;
  includesPrivateNotes: boolean;
}

export function MemberProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isReady } = useAuth();
  const { hasPermission } = usePermissions();

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const canViewMembers = useCallback(
    () => hasPermission('view_homecell_members'),
    [hasPermission],
  );

  const load = useCallback(async () => {
    if (!isAuthenticated || !canViewMembers()) {
      setMembers([]);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<MembersResponse>('/api/members', { limit: 500 });
      setMembers(data.members.map((m) => toUiMember(m)));
      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      // Surface the failure rather than falling back to invented data.
      setLoadError(err instanceof ApiError ? err.message : 'Could not load members.');
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, canViewMembers]);

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

  const addMember = useCallback(
    async (memberData: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>): Promise<Member> => {
      const created = await api.post<{ member: ApiMember }>('/api/members', {
        name: memberData.fullName,
        phone: memberData.phone || undefined,
        email: memberData.email || undefined,
        gender: memberData.gender,
        dateOfBirth: memberData.birthday || undefined,
        isFirstTimer: memberData.membershipType === 'first_timer',
        memberStatus: toApiMemberStatus(memberData.membershipType),
        city: memberData.address || undefined,
      });
      const mapped = toUiMember(created.member);
      setMembers((prev) => [...prev, mapped].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      return mapped;
    },
    [],
  );

  const updateMember = useCallback(async (id: string, updates: Partial<Member>): Promise<Member> => {
    const payload: Record<string, unknown> = {};
    if (updates.fullName !== undefined) payload.name = updates.fullName;
    if (updates.phone !== undefined) payload.phone = updates.phone || null;
    if (updates.email !== undefined) payload.email = updates.email || null;
    if (updates.gender !== undefined) payload.gender = updates.gender;
    if (updates.birthday !== undefined) payload.dateOfBirth = updates.birthday || null;
    if (updates.address !== undefined) payload.city = updates.address || null;
    if (updates.membershipType !== undefined) {
      payload.memberStatus = toApiMemberStatus(updates.membershipType);
      payload.isFirstTimer = updates.membershipType === 'first_timer';
    }

    const result = await api.patch<{ member: ApiMember | null }>(`/api/members/${id}`, payload);
    const mapped = result.member ? toUiMember(result.member) : null;
    if (mapped) {
      setMembers((prev) => prev.map((m) => (m.id === id ? mapped : m)));
      return mapped;
    }
    throw new Error('The server did not return the updated member.');
  }, []);

  /**
   * Archive a person rather than hard-deleting them.
   *
   * Attendance, reports and follow-up history must survive, so the record is
   * retained and marked archived — this is a deliberate product decision, not
   * a workaround.
   */
  const deleteMember = useCallback(async (id: string): Promise<void> => {
    await api.patch(`/api/members/${id}`, { memberStatus: 'archived' });
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const getMember = useCallback((id: string) => members.find((m) => m.id === id), [members]);

  const searchMembers = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return members;
      return members.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          (m.email ?? '').toLowerCase().includes(q),
      );
    },
    [members],
  );

  const filterMembers = useCallback(
    (filters: MemberFilters) =>
      members.filter((m) => {
        if (filters.serviceUnit && m.serviceUnit !== filters.serviceUnit) return false;
        if (filters.membershipType && m.membershipType !== filters.membershipType) return false;
        if (filters.tag && m.tag !== filters.tag) return false;
        if (filters.gender && m.gender !== filters.gender) return false;
        if (filters.maritalStatus && m.maritalStatus !== filters.maritalStatus) return false;
        if (filters.isActive !== undefined && m.isActive !== filters.isActive) return false;
        return true;
      }),
    [members],
  );

  const getMemberStats = useCallback((): MemberStats => {
    const active = members.filter((m) => m.isActive);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentAdditions = members.filter((m) => {
      const joined = new Date(m.joinedAt).getTime();
      return !Number.isNaN(joined) && joined >= thirtyDaysAgo;
    }).length;
    const adults = active.filter((m) => m.tag === 'adult');
    const children = active.filter((m) => m.tag === 'child');
    return {
      totalMembers: members.length,
      activeMembers: active.length,
      adults: adults.length,
      children: children.length,
      males: active.filter((m) => m.gender === 'male').length,
      females: active.filter((m) => m.gender === 'female').length,
      byMaritalStatus: {
        single: active.filter((m) => m.maritalStatus === 'single').length,
        married: active.filter((m) => m.maritalStatus === 'married').length,
        divorced: active.filter((m) => m.maritalStatus === 'divorced').length,
        widowed: active.filter((m) => m.maritalStatus === 'widowed').length,
      },
      byMembershipType: {
        regular: active.filter((m) => m.membershipType === 'regular').length,
        visitor: active.filter((m) => m.membershipType === 'visitor').length,
        first_timer: active.filter((m) => m.membershipType === 'first_timer').length,
        inactive: members.filter((m) => m.membershipType === 'inactive').length,
      },
      recentAdditions: recentAdditions,
      // Growth over the last 30 days, as a percentage of the roster at the
      // start of that window. 0 when there is no basis for comparison.
      growthRate:
        members.length - recentAdditions > 0
          ? Math.round((recentAdditions / (members.length - recentAdditions)) * 1000) / 10
          : recentAdditions > 0
            ? 100
            : 0,
    };
  }, [members]);

  /** Placeholder kept for interface compatibility — see the module comment. */
  const saveOffline = useCallback(async () => {
    return;
  }, []);

  const syncMembers = useCallback(async () => {
    await load();
  }, [load]);

  const getPendingChanges = useCallback((): PendingChange[] => [], []);

  const value = useMemo(
    () => ({
      members,
      isLoading,
      isOnline,
      lastSyncAt,
      loadError,
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
      canAddMember: () => hasPermission('add_homecell_members'),
      canEditMember: () => hasPermission('edit_homecell_members'),
      canDeleteMember: () => hasPermission('edit_homecell_members'),
      canViewMembers,
      canViewStats: () => hasPermission('view_homecell_members'),
    }),
    [
      members, isLoading, isOnline, lastSyncAt, loadError,
      addMember, updateMember, deleteMember, getMember, searchMembers,
      filterMembers, getMemberStats, saveOffline, syncMembers, getPendingChanges,
      hasPermission, canViewMembers, user,
    ],
  );

  return <MemberContext.Provider value={value as MemberContextType}>{children}</MemberContext.Provider>;
}

export function useMembers() {
  const context = useContext(MemberContext);
  if (!context) {
    throw new Error('useMembers must be used within a MemberProvider');
  }
  return context;
}
