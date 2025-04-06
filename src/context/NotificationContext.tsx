// src/context/NotificationContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { AuthContext } from './AuthContext';

// Define notification types
export interface NotificationTarget {
  id: number;
  notification_id: number;
  scope: string;
  target_id: number;
}

export interface NotificationItem {
  id: number;
  title: string;
  body?: string;
  type: string;
  action_type?: string;
  action_data?: any;
  global: boolean;
  dismissible: boolean;
  created_at: string;
  expires_at?: string;
}

export interface NotificationWithTargets {
  notification: NotificationItem;
  targets: NotificationTarget[];
  dismissed: boolean;
}

interface NotificationContextType {
  notifications: NotificationWithTargets[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  dismissNotification: (id: number) => Promise<void>;
  dismissAllNotifications: () => Promise<void>;
  handleNotificationAction: (notif: NotificationWithTargets) => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  fetchNotifications: async () => {},
  dismissNotification: async () => {},
  dismissAllNotifications: async () => {},
  handleNotificationAction: () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationWithTargets[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useContext(AuthContext);

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await invoke<string>('get_notifications');
      const parsed = JSON.parse(response);
      
      if (parsed.success) {
        setNotifications(parsed.data);
      } else {
        setError(parsed.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(typeof err === 'string' ? err : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch notification count
  const fetchNotificationCount = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await invoke<string>('get_notification_count');
      const parsed = JSON.parse(response);
      
      if (parsed.success) {
        setUnreadCount(parsed.data.unread);
      }
    } catch (err) {
      console.error('Error fetching notification count:', err);
    }
  };

  // Dismiss a notification
  const dismissNotification = async (id: number) => {
    if (!isAuthenticated) return;
    
    try {
      await invoke('dismiss_notification', { notificationId: id });
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.notification.id === id 
          ? { ...n, dismissed: true } 
          : n
        )
      );
      fetchNotificationCount();
    } catch (err) {
      console.error('Error dismissing notification:', err);
      setError(typeof err === 'string' ? err : 'Failed to dismiss notification');
    }
  };

  // Dismiss all notifications
  const dismissAllNotifications = async () => {
    if (!isAuthenticated) return;
    
    try {
      await invoke('dismiss_all_notifications');
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, dismissed: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error dismissing all notifications:', err);
      setError(typeof err === 'string' ? err : 'Failed to dismiss notifications');
    }
  };

  // Handle notification action
  const handleNotificationAction = (notif: NotificationWithTargets) => {
    const actionType = notif.notification.action_type;
    const actionData = notif.notification.action_data;
    
    if (!actionType || !actionData) return;
    
    switch (actionType) {
      case 'view_request':
        // Handle viewing approval request
        // e.g., navigate to request details page with actionData.request_id
        console.log('Viewing request:', actionData);
        break;
      case 'view_task_order':
        // Handle viewing task order
        console.log('Viewing task order:', actionData);
        break;
      case 'view_product':
        // Handle viewing product
        console.log('Viewing product:', actionData);
        break;
      case 'review_product':
        // Handle reviewing product
        console.log('Reviewing product:', actionData);
        break;
      default:
        console.log('Unknown action type:', actionType, actionData);
    }
  };

  // Initial setup and event listeners
  useEffect(() => {
    if (isAuthenticated) {
      // Initial fetch
      fetchNotifications();
      fetchNotificationCount();
      
      // Start background polling
      invoke('start_notification_polling').catch(err => {
        console.error('Failed to start notification polling:', err);
      });
      
      // Listen for count updates
      const unlisten1 = listen<number>('notification_count_updated', (event) => {
        setUnreadCount(event.payload);
      });
      
      // Listen for new notifications
      const unlisten2 = listen<NotificationWithTargets>('new_notification', (event) => {
        setNotifications(prev => [event.payload, ...prev]);
      });
      
      // Cleanup
      return () => {
        unlisten1.then(fn => fn());
        unlisten2.then(fn => fn());
      };
    }
  }, [isAuthenticated]);

  // Refresh notifications every minute
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        fetchNotificationCount();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    dismissNotification,
    dismissAllNotifications,
    handleNotificationAction,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
