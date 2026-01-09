'use client';

/**
 * Settings Context
 * Provides persistent user settings with localStorage
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface NotificationSettings {
  positionAlerts: boolean;
  priceAlerts: boolean;
  yieldChanges: boolean;
  weeklyReport: boolean;
}

interface Settings {
  slippageTolerance: string;
  notifications: NotificationSettings;
}

interface SettingsContextType {
  settings: Settings;
  updateSlippage: (value: string) => void;
  updateNotification: (key: keyof NotificationSettings, value: boolean) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  slippageTolerance: '0.5',
  notifications: {
    positionAlerts: true,
    priceAlerts: false,
    yieldChanges: true,
    weeklyReport: true,
  },
};

const STORAGE_KEY = 'prism-settings';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...parsed.notifications,
          },
        });
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }, [settings, mounted]);

  const updateSlippage = useCallback((value: string) => {
    setSettings((prev) => ({ ...prev, slippageTolerance: value }));
  }, []);

  const updateNotification = useCallback((key: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSlippage,
        updateNotification,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
