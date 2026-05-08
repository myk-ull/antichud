import { create } from 'zustand';
import type { WeightEntry } from '@/types';
import {
  appendWeight as storageAppendWeight,
  getWeightLog as storageGetWeightLog,
  removeWeight as storageRemoveWeight,
} from '@/lib/storage/weightLog';

export type WeightState = Readonly<{
  entries: ReadonlyArray<WeightEntry>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addEntry: (e: WeightEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
}>;

export const initialWeightState: Pick<WeightState, 'entries' | 'hydrated'> = {
  entries: [],
  hydrated: false,
};

function sortAsc(entries: ReadonlyArray<WeightEntry>): WeightEntry[] {
  return [...entries].sort((a, b) => a.timestamp - b.timestamp);
}

export const useWeight = create<WeightState>((set, get) => ({
  ...initialWeightState,
  hydrate: async () => {
    if (get().hydrated) return;
    const entries = await storageGetWeightLog();
    set({ entries: sortAsc(entries), hydrated: true });
  },
  addEntry: async (e) => {
    await storageAppendWeight(e);
    set({ entries: sortAsc([...get().entries, e]) });
  },
  removeEntry: async (id) => {
    await storageRemoveWeight(id);
    set({ entries: get().entries.filter((entry) => entry.id !== id) });
  },
}));

export function selectLatestWeight(state: WeightState): number | null {
  const entries = state.entries;
  if (entries.length === 0) return null;
  const latest = entries[entries.length - 1];
  return latest ? latest.weight_kg : null;
}

export function selectWeightTrend(days: number) {
  return (state: WeightState): ReadonlyArray<WeightEntry> => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return [...state.entries]
      .filter((entry) => entry.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  };
}
