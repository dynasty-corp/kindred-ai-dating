'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';

export type KindredTheme = 'nocturne' | 'alabaster';

const STORAGE_KEY = 'kindred_theme_v3';
const THEME_EVENT = 'kindred-theme-change';

function readStoredTheme(): KindredTheme {
  if (typeof window === 'undefined') return 'nocturne';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'alabaster' ? 'alabaster' : 'nocturne';
  } catch {
    return 'nocturne';
  }
}

function subscribeTheme(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('storage', handler);
  window.addEventListener(THEME_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(THEME_EVENT, handler);
  };
}

interface ThemeContextValue {
  theme: KindredTheme;
  setTheme: (next: KindredTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'nocturne',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function KindredThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<KindredTheme>(
    subscribeTheme,
    readStoredTheme,
    () => 'nocturne',
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: KindredTheme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage quota or privacy mode errors
    }
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    const current = readStoredTheme();
    setTheme(current === 'nocturne' ? 'alabaster' : 'nocturne');
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useKindredTheme() {
  return useContext(ThemeContext);
}
