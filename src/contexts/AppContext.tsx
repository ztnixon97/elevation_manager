// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface AppContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Global loading states
  loading: {
    products: boolean;
    taskorders: boolean;
    teams: boolean;
  };
  setLoading: (key: keyof AppContextType['loading'], value: boolean) => void;
  
  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoadingState] = useState({
    products: false,
    taskorders: false,
    teams: false,
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000,
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const setLoading = (key: keyof AppContextType['loading'], value: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const value: AppContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    loading,
    setLoading,
    sidebarOpen,
    setSidebarOpen,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};