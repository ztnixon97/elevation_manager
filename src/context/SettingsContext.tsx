import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
    pollingInterval: number;
  };
  display: {
    density: 'compact' | 'comfortable' | 'spacious';
    fontSize: number;
    showAnimations: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  security: {
    autoLock: boolean;
    lockTimeout: number;
    requirePassword: boolean;
    sessionTimeout: number;
  };
  data: {
    autoSave: boolean;
    saveInterval: number;
    maxHistoryItems: number;
    clearCacheOnExit: boolean;
  };
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  applySettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
  loading: boolean;
}

const defaultSettings: Settings = {
  theme: 'system',
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    pollingInterval: 30,
  },
  display: {
    density: 'comfortable',
    fontSize: 14,
    showAnimations: true,
    autoRefresh: true,
    refreshInterval: 60,
  },
  security: {
    autoLock: false,
    lockTimeout: 30,
    requirePassword: true,
    sessionTimeout: 1440,
  },
  data: {
    autoSave: true,
    saveInterval: 5,
    maxHistoryItems: 100,
    clearCacheOnExit: false,
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Apply settings when they change
  useEffect(() => {
    applySettings();
  }, [settings]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const savedSettings = await invoke<string>('get_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use default settings if loading fails
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      await invoke('save_settings', { settings: JSON.stringify(updatedSettings) });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const applySettings = async () => {
    try {
      // Apply font size
      await invoke('apply_font_size', { font_size: settings.display.fontSize });
      
      // Apply display density
      await invoke('apply_display_density', { density: settings.display.density });
      
      // Apply notification polling
      if (settings.notifications.enabled) {
        await invoke('update_notification_polling', { interval: settings.notifications.pollingInterval });
      }

      // Apply CSS custom properties
      applyCSSVariables();
      
    } catch (error) {
      console.error('Error applying settings:', error);
    }
  };

  const resetSettings = async () => {
    try {
      await invoke('reset_settings');
      setSettings(defaultSettings);
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  const applyCSSVariables = () => {
    const root = document.documentElement;
    
    // Font size
    root.style.setProperty('--app-font-size', `${settings.display.fontSize}px`);
    
    // Display density
    const densitySpacing = {
      compact: '4px',
      comfortable: '8px',
      spacious: '16px',
    };
    root.style.setProperty('--app-spacing', densitySpacing[settings.display.density]);
    
    // Animations
    root.style.setProperty('--app-animations', settings.display.showAnimations ? 'auto' : 'none');
    
    // Auto refresh interval
    if (settings.display.autoRefresh) {
      root.style.setProperty('--app-refresh-interval', `${settings.display.refreshInterval}s`);
    }
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      applySettings,
      resetSettings,
      loading,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}; 