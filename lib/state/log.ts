import { create } from 'zustand';
import { endOfDay, startOfDay } from 'date-fns';
import { startOfDay as dayStart } from 'date-fns';
import type { FoodEntry, Macros } from '@/types';
import {
  appendFood as storageAppendFood,
  getFoodLog as storageGetFoodLog,
  removeFood as storageRemoveFood,
  replaceFood as storageReplaceFood,
} from '@/lib/storage/foodLog';

export type LogState = Readonly<{
  entries: ReadonlyArray<FoodEntry>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addEntry: (e: FoodEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  replaceEntry: (e: FoodEntry) => Promise<void>;
}>;

export const initialLogState: Pick<LogState, 'entries' | 'hydrated'> = {
  entries: [],
  hydrated: false,
};

export const useLog = create<LogState>((set, get) => ({
  ...initialLogState,
  hydrate: async () => {
    if (get().hydrated) return;
    const entries = await storageGetFoodLog();
    set({ entries, hydrated: true });
  },
  addEntry: async (e) => {
    await storageAppendFood(e);
    set({ entries: [...get().entries, e] });
  },
  removeEntry: async (id) => {
    await storageRemoveFood(id);
    set({ entries: get().entries.filter((entry) => entry.id !== id) });
  },
  replaceEntry: async (e) => {
    await storageReplaceFood(e);
    set({
      entries: get().entries.map((entry) => (entry.id === e.id ? e : entry)),
    });
  },
}));

function todayBounds(now: Date = new Date()): { start: number; end: number } {
  return { start: startOfDay(now).getTime(), end: endOfDay(now).getTime() };
}

export function selectTodayEntries(state: LogState): ReadonlyArray<FoodEntry> {
  const { start, end } = todayBounds();
  return state.entries.filter(
    (entry) => entry.timestamp >= start && entry.timestamp <= end,
  );
}

export function selectTodayKJTotal(state: LogState): number {
  return selectTodayEntries(state).reduce((sum, entry) => sum + entry.kj, 0);
}

export function selectRemainingKJ(goalKJ: number) {
  return (state: LogState): number => goalKJ - selectTodayKJTotal(state);
}

export function selectTodayMacros(state: LogState): Macros {
  let p = 0;
  let c = 0;
  let f = 0;
  let fi = 0;
  for (const entry of selectTodayEntries(state)) {
    if (!entry.macros) continue;
    p += entry.macros.protein_g;
    c += entry.macros.carbs_g;
    f += entry.macros.fat_g;
    fi += entry.macros.fiber_g ?? 0;
  }
  return { protein_g: p, carbs_g: c, fat_g: f, fiber_g: fi };
}

/**
 * Per-day kJ totals for the last `days` days (oldest first, including today).
 * Returns one bucket per day, kj=0 if nothing logged.
 */
export function selectKJTrend(days: number) {
  return (state: LogState): ReadonlyArray<{ ts: number; kj: number }> => {
    if (days <= 0) return [];
    const todayStart = dayStart(new Date()).getTime();
    const buckets = new Map<number, number>();
    for (let i = days - 1; i >= 0; i--) {
      buckets.set(todayStart - i * 86_400_000, 0);
    }
    for (const entry of state.entries) {
      const ts = dayStart(new Date(entry.timestamp)).getTime();
      if (buckets.has(ts)) buckets.set(ts, (buckets.get(ts) ?? 0) + entry.kj);
    }
    return Array.from(buckets.entries())
      .map(([ts, kj]) => ({ ts, kj }))
      .sort((a, b) => a.ts - b.ts);
  };
}
