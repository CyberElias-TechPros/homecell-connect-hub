import { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  currentWeek: string;
  selectedHomecell: string | null;
  setSelectedHomecell: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedHomecell, setSelectedHomecell] = useState<string | null>('hc-001');
  
  // Calculate current week
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  const currentWeek = `Week ${weekNumber}, ${now.getFullYear()}`;

  return (
    <AppContext.Provider value={{ currentWeek, selectedHomecell, setSelectedHomecell }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
