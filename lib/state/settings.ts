import { create } from 'zustand';
import type { Settings } from '@/types';
import {
  DEFAULT_SETTINGS,
  getSettings as storageGetSettings,
  patchSettings as storagePatchSettings,
  setSettings as storageSetSettings,
} from '@/lib/storage/settings';

export type SettingsState = Readonly<{
  settings: Settings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSettings: (s: Settings) => Promise<void>;
  patch: (p: Partial<Settings>) => Promise<void>;
}>;

export const initialSettingsState: Pick<SettingsState, 'settings' | 'hydrated'> = {
  settings: DEFAULT_SETTINGS,
  hydrated: false,
};

export const useSettings = create<SettingsState>((set, get) => ({
  ...initialSettingsState,
  hydrate: async () => {
    if (get().hydrated) return;
    const settings = await storageGetSettings();
    set({ settings, hydrated: true });
  },
  setSettings: async (s) => {
    await storageSetSettings(s);
    set({ settings: s });
  },
  patch: async (p) => {
    const next = await storagePatchSettings(p);
    set({ settings: next });
  },
}));
