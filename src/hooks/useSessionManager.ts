import { useEffect, useRef, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

interface UseSessionManagerOptions {
  onLock?: () => void;
  onTimeout?: () => void;
}

export const useSessionManager = ({ onLock, onTimeout }: UseSessionManagerOptions = {}) => {
  const { settings } = useSettings();
  const { logout } = useContext(AuthContext);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Update last activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Check if session should be locked
  const checkSessionLock = useCallback(() => {
    if (!settings.security.autoLock) return;

    const now = Date.now();
    const lockTimeout = settings.security.lockTimeout * 60 * 1000; // Convert minutes to milliseconds
    const timeSinceActivity = now - lastActivityRef.current;

    if (timeSinceActivity >= lockTimeout) {
      console.log('Session auto-locked due to inactivity');
      onLock?.();
    }
  }, [settings.security.autoLock, settings.security.lockTimeout, onLock]);

  // Check if session should timeout
  const checkSessionTimeout = useCallback(() => {
    if (!settings.security.sessionTimeout) return;

    const now = Date.now();
    const sessionTimeout = settings.security.sessionTimeout * 60 * 1000; // Convert minutes to milliseconds
    const timeSinceActivity = now - lastActivityRef.current;

    if (timeSinceActivity >= sessionTimeout) {
      console.log('Session timed out');
      onTimeout?.();
      logout();
    }
  }, [settings.security.sessionTimeout, onTimeout, logout]);

  // Start session monitoring
  const startSessionMonitoring = useCallback(() => {
    if (!settings.security.autoLock && !settings.security.sessionTimeout) return;

    // Check every minute
    timeoutRef.current = setInterval(() => {
      checkSessionLock();
      checkSessionTimeout();
    }, 60000); // Check every minute

    console.log('Session monitoring started');
  }, [settings.security.autoLock, settings.security.sessionTimeout, checkSessionLock, checkSessionTimeout]);

  // Stop session monitoring
  const stopSessionMonitoring = useCallback(() => {
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
      timeoutRef.current = null;
      console.log('Session monitoring stopped');
    }
  }, []);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [updateActivity]);

  // Start/stop monitoring based on settings
  useEffect(() => {
    if (settings.security.autoLock || settings.security.sessionTimeout) {
      startSessionMonitoring();
    } else {
      stopSessionMonitoring();
    }

    return () => {
      stopSessionMonitoring();
    };
  }, [
    settings.security.autoLock,
    settings.security.sessionTimeout,
    settings.security.lockTimeout,
    startSessionMonitoring,
    stopSessionMonitoring,
  ]);

  return {
    isMonitoring: settings.security.autoLock || settings.security.sessionTimeout,
    lastActivity: lastActivityRef.current,
    updateActivity,
    startSessionMonitoring,
    stopSessionMonitoring,
  };
}; 