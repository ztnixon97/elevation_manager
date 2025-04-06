import React, { createContext, useContext, useState, useCallback } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

// Types for the notification
interface Notification {
  id?: number;
  title: string;
  body: string;
  icon?: string;
}

// Context type
interface NotificationContextType {
  sendAppNotification: (notification: Notification) => Promise<void>;
  checkNotificationPermission: () => Promise<boolean>;
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Notification Provider Component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Send notification function
  const sendAppNotification = useCallback(async (notification: Notification) => {
    try {
      // Check if permission is granted
      const permissionGranted = await isPermissionGranted();
      
      if (!permissionGranted) {
        const permission = await requestPermission();
        if (!permission) {
          console.error('Notification permission denied');
          return;
        }
      }

      // Send the notification
      await sendNotification({
        title: notification.title,
        body: notification.body,
        icon: notification.icon
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, []);

  // Check notification permission
  const checkNotificationPermission = useCallback(async () => {
    return await isPermissionGranted();
  }, []);

  // Provide context value
  const contextValue = {
    sendAppNotification,
    checkNotificationPermission
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notifications
export const useNotification = () => {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
};

// Example usage component
export const NotificationExample: React.FC = () => {
  const { sendAppNotification, checkNotificationPermission } = useNotification();

  const handleSendNotification = async () => {
    try {
      // Check permission first
      const hasPermission = await checkNotificationPermission();
      
      if (hasPermission) {
        // Send a basic notification
        await sendAppNotification({
          title: 'Hello Tauri!',
          body: 'This is a sample notification from your app.'
        });

        // Send a notification with an icon
        await sendAppNotification({
          title: 'Update Available',
          body: 'A new version of the app is ready to install.',
          icon: 'path/to/your/icon.png' // Replace with actual path
        });
      } else {
        console.log('Notification permission not granted');
      }
    } catch (error) {
      console.error('Notification error:', error);
    }
  };

  return (
    <div>
      <button onClick={handleSendNotification}>
        Send Notification
      </button>
    </div>
  );
};

// Optional: Queue-based Notification Manager (advanced usage)
export class NotificationManager {
  private static queue: Notification[] = [];
  private static isProcessing = false;

  static async addNotification(notification: Notification) {
    this.queue.push(notification);
    this.processQueue();
  }

  private static async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const notification = this.queue.shift();
      
      if (notification) {
        try {
          await sendNotification({
            title: notification.title,
            body: notification.body,
            icon: notification.icon
          });
        } catch (error) {
          console.error('Failed to send queued notification:', error);
        }

        // Optional: Add delay between notifications
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessing = false;
  }
}

export default NotificationProvider;
