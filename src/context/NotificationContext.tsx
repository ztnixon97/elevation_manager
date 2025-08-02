// src/context/NotificationContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettings } from './SettingsContext';
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
  refreshNotifications: () => Promise<void>; // Manual refresh function
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
  refreshNotifications: async () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationWithTargets[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useContext(AuthContext);
  const { settings } = useSettings();
  const [pollingStarted, setPollingStarted] = useState<boolean>(false);

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
        console.log('Viewing request:', actionData);
        // You could navigate to a request details page here
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
    
    // Auto-dismiss if dismissible
    if (notif.notification.dismissible && !notif.dismissed) {
      dismissNotification(notif.notification.id);
    }
  };

  // Start backend polling when authenticated
  useEffect(() => {
    if (isAuthenticated && !pollingStarted && settings.notifications.enabled) {
      // Initialize polling with settings-based interval
      invoke('start_notification_polling')
        .then(() => {
          console.log('Notification polling started');
          setPollingStarted(true);
        })
        .catch(err => {
          console.error('Failed to start notification polling:', err);
        });
      
      return () => {
        // Clean up polling on unmount or when auth state changes
        if (pollingStarted) {
          invoke('stop_notification_polling')
            .then(() => console.log('Notification polling stopped'))
            .catch(err => console.error('Failed to stop notification polling:', err));
        }
      };
    }
  }, [isAuthenticated, pollingStarted, settings.notifications.enabled, settings.notifications.pollingInterval]);

  // Manual refresh function that calls backend refresh
  const refreshNotifications = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await invoke('manual_refresh_notifications');
      // The events emitted from the backend will update our state
    } catch (err) {
      console.error('Error manually refreshing notifications:', err);
      setError(typeof err === 'string' ? err : 'Failed to refresh notifications');
    } finally {
      setLoading(false);
    }
  };

  // Set up event listeners for notification updates
  useEffect(() => {
    if (!isAuthenticated) return;

    // Listen for count updates
    const unlistenCount = listen<number>('notification_count_updated', (event) => {
      console.log('Notification count updated:', event.payload);
      setUnreadCount(event.payload);
    });
    
    // Listen for new notifications
    const unlistenNew = listen<NotificationWithTargets>('new_notification', (event) => {
      console.log('New notification received:', event.payload);
      setNotifications(prev => [event.payload, ...prev]);
    });
    
    // Listen for full refresh events
    const unlistenRefresh = listen<NotificationWithTargets[]>('notifications_refreshed', (event) => {
      console.log('Notifications refreshed:', event.payload);
      setNotifications(event.payload);
    });
    
    // Initial data fetch
    fetchNotifications();
    fetchNotificationCount();
    
    // Cleanup listeners
    return () => {
      unlistenCount.then(fn => fn());
      unlistenNew.then(fn => fn());
      unlistenRefresh.then(fn => fn());
    };
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
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
