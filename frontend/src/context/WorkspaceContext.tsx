import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { WorkspaceStatusResponse } from '../types';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

interface WorkspaceContextType {
  workspace: WorkspaceStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  currency: string;
  themeMode: ThemeMode;
  effectiveTheme: EffectiveTheme;
  isDark: boolean;
  setCurrency: (c: string) => void;
  setThemeMode: (m: ThemeMode) => void;
  setTheme: (t: 'light' | 'dark') => void;
  refreshWorkspace: () => Promise<void>;
  createSampleWorkspace: () => Promise<void>;
  initNewWorkspace: () => Promise<void>;
  clearCurrentWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const applyThemeToDOM = (theme: EffectiveTheme) => {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspace, setWorkspace] = useState<WorkspaceStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrencyState] = useState<string>(() => localStorage.getItem('retailiq_currency') || '₹');

  // Theme mode: light (default) | dark | system
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('retailiq_theme_mode');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    // Backward compatibility with previous retailiq_theme key
    const old = localStorage.getItem('retailiq_theme');
    if (old === 'dark') return 'dark';
    return 'light'; // Light is the default
  });

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() => {
    const saved = localStorage.getItem('retailiq_theme_mode');
    if (saved === 'dark') return 'dark';
    if (saved === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    localStorage.setItem('retailiq_currency', c);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('retailiq_theme_mode', mode);
  };

  const setTheme = (t: 'light' | 'dark') => {
    setThemeMode(t);
  };

  // Sync theme changes and system preferences
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const resolveTheme = (): EffectiveTheme => {
      if (themeMode === 'dark') return 'dark';
      if (themeMode === 'light') return 'light';
      return mediaQuery.matches ? 'dark' : 'light';
    };

    const current = resolveTheme();
    setEffectiveTheme(current);
    applyThemeToDOM(current);

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        const next: EffectiveTheme = e.matches ? 'dark' : 'light';
        setEffectiveTheme(next);
        applyThemeToDOM(next);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themeMode]);

  const refreshWorkspace = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getCurrentWorkspace();
      setWorkspace(data);
    } catch (err: any) {
      console.warn('Workspace initialization / lookup error:', err);
      try {
        await api.initWorkspace();
        const data = await api.getCurrentWorkspace();
        setWorkspace(data);
      } catch (innerErr: any) {
        setError('Unable to initialize workspace session. Please reload or check server status.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSampleWorkspace = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await api.createSampleWorkspace();
      const data = await api.getCurrentWorkspace();
      setWorkspace(data);
    } catch (err: any) {
      setError('Failed to create sample store workspace. Please retry.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const initNewWorkspace = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await api.initWorkspace(true);
      const data = await api.getCurrentWorkspace();
      setWorkspace(data);
    } catch (err: any) {
      setError('Failed to create fresh workspace.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearCurrentWorkspace = async () => {
    try {
      setIsLoading(true);
      await api.clearWorkspace();
      const data = await api.getCurrentWorkspace();
      setWorkspace(data);
    } catch (err: any) {
      setError('Failed to clear workspace data.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        isLoading,
        error,
        currency,
        themeMode,
        effectiveTheme,
        isDark: effectiveTheme === 'dark',
        setCurrency,
        setThemeMode,
        setTheme,
        refreshWorkspace,
        createSampleWorkspace,
        initNewWorkspace,
        clearCurrentWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
