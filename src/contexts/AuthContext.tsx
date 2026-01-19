import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 
  | 'member' 
  | 'leader' 
  | 'assistant' 
  | 'provider' 
  | 'zonal' 
  | 'area' 
  | 'district' 
  | 'admin' 
  | 'superadmin';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  homecellId?: string;
  homecellName?: string;
  zoneId?: string;
  zoneName?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (phone: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<boolean>;
  selectRole: (role: UserRole) => void;
  updateProfile: (data: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: false,
  });

  const login = async (phone: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setState(prev => ({ 
      ...prev, 
      isLoading: false,
      user: { id: '1', name: '', phone, role: 'leader' }
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
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, role } : null,
    }));
  };

  const updateProfile = (data: Partial<User>) => {
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      user: prev.user ? { ...prev.user, ...data } : null,
    }));
  };

  const logout = () => {
    setState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, verifyOTP, selectRole, updateProfile, logout }}>
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
