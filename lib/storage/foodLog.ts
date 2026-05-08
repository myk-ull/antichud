import AsyncStorage from '@react-native-async-storage/async-storage';
import { endOfDay, startOfDay } from 'date-fns';
import type { FoodEntry } from '@/types';
import { K_FOOD_LOG, K_SCHEMA_VERSION, SCHEMA_VERSION } from './keys';

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

async function readAll(): Promise<FoodEntry[]> {
  await ensureSchemaVersion();
  const raw = await AsyncStorage.getItem(K_FOOD_LOG);
  if (raw == null) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FoodEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(entries: FoodEntry[]): Promise<void> {
  await AsyncStorage.setItem(K_FOOD_LOG, JSON.stringify(entries));
  await writeSchemaVersion();
}

export async function getFoodLog(): Promise<FoodEntry[]> {
  return readAll();
}

export async function appendFood(e: FoodEntry): Promise<void> {
  const entries = await readAll();
  entries.push(e);
  await writeAll(entries);
}

export async function removeFood(id: string): Promise<void> {
  const entries = await readAll();
  const next = entries.filter((entry) => entry.id !== id);
  await writeAll(next);
}

export async function replaceFood(e: FoodEntry): Promise<void> {
  const entries = await readAll();
  const next = entries.map((entry) => (entry.id === e.id ? e : entry));
  await writeAll(next);
}

export async function getFoodForDate(date: Date): Promise<FoodEntry[]> {
  const entries = await readAll();
  const start = startOfDay(date).getTime();
  const end = endOfDay(date).getTime();
  return entries.filter((entry) => entry.timestamp >= start && entry.timestamp <= end);
}
