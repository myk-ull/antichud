import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Settings } from '@/types';
import { K_SCHEMA_VERSION, K_SETTINGS, SCHEMA_VERSION } from './keys';

export const DEFAULT_SETTINGS: Settings = {
  reminder_interval_min: 240,
  reminders_enabled: false,
  show_kcal_helper: true,
  voice: 'editorial',
  thresholds_fired: {},
};

async function ensureSchemaVersion(): Promise<void> {
  const raw = await AsyncStorage.getItem(K_SCHEMA_VERSION);
  if (raw == null) return;
  const stored = Number.parseInt(raw, 10);
  if (Number.isFinite(stored) && stored < SCHEMA_VERSION) {
    await AsyncStorage.setItem(K_SCHEMA_VERSION, String(SCHEMA_VERSION));
  }
}

async function writeSchemaVersion(): Promise<void> {
  await AsyncStorage.setItem(K_SCHEMA_VERSION, String(SCHEMA_VERSION));
}

export async function getSettings(): Promise<Settings> {
  await ensureSchemaVersion();
  const raw = await AsyncStorage.getItem(K_SETTINGS);
  if (raw == null) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setSettings(s: Settings): Promise<void> {
  await AsyncStorage.setItem(K_SETTINGS, JSON.stringify(s));
  await writeSchemaVersion();
}

export async function patchSettings(p: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...p };
  await setSettings(next);
  return next;
}
