// src/context/RefreshContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface RefreshContextType {
  refreshTriggers: Record<string, number>;
  triggerRefresh: (componentKey: string) => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const RefreshProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [refreshTriggers, setRefreshTriggers] = useState<Record<string, number>>({
    members: 0,
    products: 0,
    taskOrders: 0,
    reviews: 0,
    notifications: 0,
    pendingRequests: 0,
    teamData: 0,
  });

  const triggerRefresh = (componentKey: string) => {
    setRefreshTriggers(prev => ({
      ...prev,
      [componentKey]: prev[componentKey] + 1,
      // When a specific component refreshes, also trigger teamData refresh
      ...(componentKey !== 'teamData' ? { teamData: prev.teamData + 1 } : {})
    }));
  };

  return (
    <RefreshContext.Provider value={{ refreshTriggers, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};
