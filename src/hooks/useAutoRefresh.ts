import { useEffect, useRef, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  interval?: number;
  onRefresh: () => void | Promise<void>;
  showIndicator?: boolean;
}

export const useAutoRefresh = ({
  enabled = true,
  interval = 60,
  onRefresh,
  showIndicator = true,
}: UseAutoRefreshOptions) => {
  const { settings } = useSettings();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);

  // Create refresh indicator
  const createIndicator = useCallback(() => {
    if (!showIndicator) return;

    // Remove existing indicator
    const existing = document.querySelector('.auto-refresh-indicator');
    if (existing) {
      existing.remove();
    }

    // Create new indicator
    const indicator = document.createElement('div');
    indicator.className = 'auto-refresh-indicator';
    indicator.textContent = 'Auto-refreshing...';
    document.body.appendChild(indicator);
    indicatorRef.current = indicator;
  }, [showIndicator]);

  // Show refresh indicator
  const showRefreshIndicator = useCallback(() => {
    if (indicatorRef.current) {
      indicatorRef.current.classList.add('visible');
      setTimeout(() => {
        if (indicatorRef.current) {
          indicatorRef.current.classList.remove('visible');
        }
      }, 2000);
    }
  }, []);

  // Start auto-refresh
  const startAutoRefresh = useCallback(() => {
    if (!enabled || !settings.display.autoRefresh) return;

    const refreshInterval = settings.display.refreshInterval * 1000; // Convert to milliseconds
    
    intervalRef.current = setInterval(async () => {
      try {
        await onRefresh();
        showRefreshIndicator();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, refreshInterval);

    console.log(`Auto-refresh started with ${refreshInterval}ms interval`);
  }, [enabled, settings.display.autoRefresh, settings.display.refreshInterval, onRefresh, showRefreshIndicator]);

  // Stop auto-refresh
  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('Auto-refresh stopped');
    }
  }, []);

  // Manual refresh
  const manualRefresh = useCallback(async () => {
    try {
      await onRefresh();
      showRefreshIndicator();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    }
  }, [onRefresh, showRefreshIndicator]);

  // Effect to manage auto-refresh
  useEffect(() => {
    createIndicator();

    if (enabled && settings.display.autoRefresh) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
      if (indicatorRef.current) {
        indicatorRef.current.remove();
      }
    };
  }, [
    enabled,
    settings.display.autoRefresh,
    settings.display.refreshInterval,
    startAutoRefresh,
    stopAutoRefresh,
    createIndicator,
  ]);

  return {
    isEnabled: enabled && settings.display.autoRefresh,
    interval: settings.display.refreshInterval,
    manualRefresh,
    startAutoRefresh,
    stopAutoRefresh,
  };
}; 