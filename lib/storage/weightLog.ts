import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeightEntry } from '@/types';
import { K_SCHEMA_VERSION, K_WEIGHT_LOG, SCHEMA_VERSION } from './keys';

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

async function readAll(): Promise<WeightEntry[]> {
  await ensureSchemaVersion();
  const raw = await AsyncStorage.getItem(K_WEIGHT_LOG);
  if (raw == null) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WeightEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(entries: WeightEntry[]): Promise<void> {
  await AsyncStorage.setItem(K_WEIGHT_LOG, JSON.stringify(entries));
  await writeSchemaVersion();
}

export async function getWeightLog(): Promise<WeightEntry[]> {
  const entries = await readAll();
  return [...entries].sort((a, b) => a.timestamp - b.timestamp);
}

export async function appendWeight(e: WeightEntry): Promise<void> {
  const entries = await readAll();
  entries.push(e);
  await writeAll(entries);
}

export async function removeWeight(id: string): Promise<void> {
  const entries = await readAll();
  const next = entries.filter((entry) => entry.id !== id);
  await writeAll(next);
}
