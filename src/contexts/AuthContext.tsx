import { createContext, useContext, useState, ReactNode } from 'react';
import {
  UserRole,
  User,
  Permission,
  District,
  Area,
  Zone,
  Homecell,
  RBACContextType
} from '../types';

// Permissions Matrix based on the architecture plan
const PERMISSIONS_MATRIX: Record<UserRole, string[]> = {
  member: [
    'view_own_profile',
    'edit_own_profile',
    'view_homecell_members',
    'view_homecell_reports',
    'view_materials'
  ],
  leader: [
    'view_own_profile',
    'edit_own_profile',
    'view_homecell_members',
    'add_homecell_members',
    'edit_homecell_members',
    'mark_attendance',
    'view_homecell_reports',
    'submit_homecell_reports',
    'view_materials',
    'download_materials',
    'view_materials_archive'
  ],
  assistant: [
    'view_own_profile',
    'edit_own_profile',
    'view_homecell_members',
    'add_homecell_members',
    'edit_homecell_members',
    'mark_attendance',
    'view_homecell_reports',
    'submit_homecell_reports',
    'view_materials',
    'download_materials',
    'view_materials_archive'
  ],
  provider: [
    'view_own_profile',
    'edit_own_profile',
    'view_homecell_members',
    'add_homecell_members',
    'edit_homecell_members',
    'mark_attendance',
    'view_homecell_reports',
    'submit_homecell_reports',
    'view_current_week_materials',
    'acknowledge_materials',
    'download_current_week_materials'
  ],
  zonal: [
    'view_own_profile',
    'edit_own_profile',
    'view_homecell_members',
    'add_homecell_members',
    'edit_homecell_members',
    'mark_attendance',
    'view_homecell_reports',
    'submit_homecell_reports',
    'approve_homecell_reports',
    'view_zone_data',
    'manage_zone_data',
    'create_announcements',
    'view_materials',
    'download_materials',
    'view_materials_archive'
  ],
  area: [
    'view_own_profile',
    'edit_own_profile',
    'view_homecell_members',
    'add_homecell_members',
    'edit_homecell_members',
    'mark_attendance',
    'view_homecell_reports',
    'submit_homecell_reports',
    'approve_homecell_reports',
    'view_zone_data',
    'manage_zone_data',
    'view_area_data',
    'manage_area_data',
    'create_announcements',
    'view_materials',
    'download_materials',
    'view_materials_archive'
  ],
  district: [
    'view_own_profile',
    'edit_own_profile',
    'view_homecell_members',
    'add_homecell_members',
    'edit_homecell_members',
    'mark_attendance',
    'view_homecell_reports',
    'submit_homecell_reports',
    'approve_homecell_reports',
    'view_zone_data',
    'manage_zone_data',
    'view_area_data',
    'manage_area_data',
    'view_district_data',
    'manage_district_data',
    'create_announcements',
    'view_materials',
    'download_materials',
    'view_materials_archive'
  ],
  admin: [
    'view_own_profile',
    'edit_own_profile',
    'view_homecell_members',
    'add_homecell_members',
    'edit_homecell_members',
    'mark_attendance',
    'view_homecell_reports',
    'submit_homecell_reports',
    'approve_homecell_reports',
    'view_zone_data',
    'manage_zone_data',
    'view_area_data',
    'manage_area_data',
    'view_district_data',
    'manage_district_data',
    'create_announcements',
    'manage_announcements',
    'system_admin',
    'upload_materials',
    'manage_materials',
    'schedule_materials',
    'view_all_materials',
    'delete_materials'
  ],
  super_admin: [
    'view_own_profile',
    'edit_own_profile',
    'view_homecell_members',
    'add_homecell_members',
    'edit_homecell_members',
    'mark_attendance',
    'view_homecell_reports',
    'submit_homecell_reports',
    'approve_homecell_reports',
    'view_zone_data',
    'manage_zone_data',
    'view_area_data',
    'manage_area_data',
    'view_district_data',
    'manage_district_data',
    'create_announcements',
    'manage_announcements',
    'system_admin',
    'super_admin',
    'upload_materials',
    'manage_materials',
    'schedule_materials',
    'view_all_materials',
    'delete_materials'
  ]
};

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  permissions: Permission[];
  districts: District[];
  areas: Area[];
  zones: Zone[];
  homecells: Homecell[];
  isLoading: boolean;
}

interface AuthContextType extends AuthState, Omit<RBACContextType, 'user' | 'permissions'> {
  login: (phone: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<boolean>;
  selectRole: (role: UserRole) => void;
  updateProfile: (data: Partial<User>) => void;
  logout: () => void;
  getCurrentUserHierarchy: () => {
    district?: District;
    area?: Area;
    zone?: Zone;
    homecell?: Homecell;
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    permissions: [],
    districts: [],
    areas: [],
    zones: [],
    homecells: [],
    isLoading: false,
  });

  const login = async (phone: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    const role: UserRole = 'leader'; // Default for demo
    const permissions = PERMISSIONS_MATRIX[role].map(name => ({ id: name, name, description: '' }));
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      isLoading: false,
      user: {
        id: '1',
        name: '',
        phone,
        role,
        permissions,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      permissions
    }));
  };

  const verifyOTP = async (otp: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Accept any 6-digit OTP for demo
    const isValid = otp.length === 6;
    setState(prev => ({ ...prev, isLoading: false }));
    return isValid;
  };

  const selectRole = (role: UserRole) => {
    const permissions = PERMISSIONS_MATRIX[role].map(name => ({ id: name, name, description: '' }));
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, role, permissions } : null,
      permissions
    }));
  };

  const updateProfile = (data: Partial<User>) => {
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      user: prev.user ? { ...prev.user, ...data } : null,
    }));
  };

  const hasPermission = (permission: string): boolean => {
    return state.permissions.some(p => p.name === permission);
  };

  const hasRole = (role: UserRole): boolean => {
    return state.user?.role === role;
  };

  const canAccessResource = (resourceType: string, resourceId: string): boolean => {
    // Placeholder implementation - in real app, check based on hierarchy
    return true;
  };

  const getCurrentUserHierarchy = () => {
    if (!state.user) return {};
    const { districtId, areaId, zoneId, homecellId } = state.user;
    return {
      district: districtId ? state.districts.find(d => d.id === districtId) : undefined,
      area: areaId ? state.areas.find(a => a.id === areaId) : undefined,
      zone: zoneId ? state.zones.find(z => z.id === zoneId) : undefined,
      homecell: homecellId ? state.homecells.find(h => h.id === homecellId) : undefined,
    };
  };

  const logout = () => {
    setState({
      isAuthenticated: false,
      user: null,
      permissions: [],
      districts: [],
      areas: [],
      zones: [],
      homecells: [],
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      verifyOTP,
      selectRole,
      updateProfile,
      logout,
      hasPermission,
      hasRole,
      canAccessResource,
      getCurrentUserHierarchy
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
