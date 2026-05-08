/**
 * Theme store — light / dark mode with AsyncStorage persistence.
 * Use `useTheme()` to read mode + the active palette `t`.
 */

import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { colors, colorsDark, type Palette } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'antichud:v1:theme';

type ThemeState = {
  mode: ThemeMode;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  hydrate: () => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  hydrated: false,
  setMode: (mode) => {
    set({ mode });
    void AsyncStorage.setItem(STORAGE_KEY, mode);
  },
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ mode: stored, hydrated: true });
        return;
      }
    } catch {
      // fall through
    }
    set({ hydrated: true });
  },
}));

const palettes: Record<'light' | 'dark', Palette> = {
  light: colors,
  dark: colorsDark,
};

/**
 * Resolves the active palette for the current mode.
 * `t` is short for "tokens" — components read `const { t } = useTheme();`
 * then `t.ink`, `t.ember`, etc.
 */
export function useTheme(): {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  t: Palette;
  setMode: (mode: ThemeMode) => void;
} {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const system = useColorScheme();
  const resolved: 'light' | 'dark' = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  return { mode, resolved, t: palettes[resolved], setMode };
}

/**
 * Hook to load the persisted theme on mount. Call once at the root of the app.
 */
export function useHydrateTheme(): boolean {
  const hydrated = useThemeStore((s) => s.hydrated);
  const hydrate = useThemeStore((s) => s.hydrate);
  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);
  return hydrated;
}
