import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '@/types';
import { K_PROFILE, K_SCHEMA_VERSION, SCHEMA_VERSION } from './keys';

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

export async function getProfile(): Promise<Profile | null> {
  await ensureSchemaVersion();
  const raw = await AsyncStorage.getItem(K_PROFILE);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export async function setProfile(p: Profile): Promise<void> {
  await AsyncStorage.setItem(K_PROFILE, JSON.stringify(p));
  await writeSchemaVersion();
}

export async function clearProfile(): Promise<void> {
  await AsyncStorage.removeItem(K_PROFILE);
}
