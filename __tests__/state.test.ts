import type { FoodEntry, Profile, Settings, WeightEntry } from '@/types';
import { bmrKJ } from '@/lib/calc';

// ---- in-memory storage mocks ----
// Names must be prefixed with `mock` to be allowed inside `jest.mock` factory
// hoisted closures. See: https://jestjs.io/docs/jest-object#jestmockmodulename-factory-options

let mockProfileStore: Profile | null = null;
let mockFoodLogStore: FoodEntry[] = [];
let mockWeightLogStore: WeightEntry[] = [];
let mockSettingsStore: Settings | null = null;

const DEFAULT_SETTINGS: Settings = {
  reminder_interval_min: 240,
  reminders_enabled: false,
  show_kcal_helper: true,
  voice: 'editorial',
  thresholds_fired: {},
};
const mockDefaultSettings: Settings = DEFAULT_SETTINGS;

jest.mock('@/lib/storage/profile', () => ({
  getProfile: jest.fn(async () => mockProfileStore),
  setProfile: jest.fn(async (p: Profile) => {
    mockProfileStore = p;
  }),
  clearProfile: jest.fn(async () => {
    mockProfileStore = null;
  }),
}));

jest.mock('@/lib/storage/foodLog', () => ({
  getFoodLog: jest.fn(async () => [...mockFoodLogStore]),
  appendFood: jest.fn(async (e: FoodEntry) => {
    mockFoodLogStore.push(e);
  }),
  removeFood: jest.fn(async (id: string) => {
    mockFoodLogStore = mockFoodLogStore.filter((entry) => entry.id !== id);
  }),
  replaceFood: jest.fn(async (e: FoodEntry) => {
    mockFoodLogStore = mockFoodLogStore.map((entry) =>
      entry.id === e.id ? e : entry,
    );
  }),
  getFoodForDate: jest.fn(async () => []),
}));

jest.mock('@/lib/storage/weightLog', () => ({
  getWeightLog: jest.fn(async () =>
    [...mockWeightLogStore].sort((a, b) => a.timestamp - b.timestamp),
  ),
  appendWeight: jest.fn(async (e: WeightEntry) => {
    mockWeightLogStore.push(e);
  }),
  removeWeight: jest.fn(async (id: string) => {
    mockWeightLogStore = mockWeightLogStore.filter((entry) => entry.id !== id);
  }),
}));

jest.mock('@/lib/storage/settings', () => ({
  DEFAULT_SETTINGS: mockDefaultSettings,
  getSettings: jest.fn(async () =>
    mockSettingsStore ? { ...mockDefaultSettings, ...mockSettingsStore } : mockDefaultSettings,
  ),
  setSettings: jest.fn(async (s: Settings) => {
    mockSettingsStore = s;
  }),
  patchSettings: jest.fn(async (p: Partial<Settings>) => {
    const current = mockSettingsStore
      ? { ...mockDefaultSettings, ...mockSettingsStore }
      : mockDefaultSettings;
    const next: Settings = { ...current, ...p };
    mockSettingsStore = next;
    return next;
  }),
}));

// Imports must come after jest.mock calls.
import {
  hydrateAll,
  selectBMI,
  selectBMICategory,
  selectBMR,
  selectDailyGoalKJ,
  selectLatestWeight,
  selectRemainingKJ,
  selectTDEE,
  selectTodayEntries,
  selectTodayKJTotal,
  selectWeightTrend,
  useLog,
  useProfile,
  useSettings,
  useWeight,
} from '@/lib/state';
import { initialLogState } from '@/lib/state/log';
import { initialProfileState } from '@/lib/state/profile';
import { initialSettingsState } from '@/lib/state/settings';
import { initialWeightState } from '@/lib/state/weight';

function resetAll(): void {
  mockProfileStore = null;
  mockFoodLogStore = [];
  mockWeightLogStore = [];
  mockSettingsStore = null;

  // Clear call history of mocked storage fns so per-test counters are accurate.
  jest.clearAllMocks();

  // Reset zustand stores to initial state, preserving action functions.
  useProfile.setState(initialProfileState);
  useLog.setState(initialLogState);
  useWeight.setState(initialWeightState);
  useSettings.setState(initialSettingsState);
}

beforeEach(() => {
  resetAll();
});

const sampleProfile: Profile = {
  weight_kg: 80,
  target_weight_kg: 75,
  height_cm: 180,
  age: 30,
  sex: 'male',
  activity_level: 'moderate',
  deficit_mode: 'cut',
  created_at: 1_700_000_000_000,
  updated_at: 1_700_000_000_000,
};

describe('profile store', () => {
  test('hydrate from empty returns null profile and marks hydrated', async () => {
    expect(useProfile.getState().hydrated).toBe(false);
    await useProfile.getState().hydrate();
    expect(useProfile.getState().profile).toBeNull();
    expect(useProfile.getState().hydrated).toBe(true);
  });

  test('setProfile then re-hydrate returns the same profile', async () => {
    await useProfile.getState().setProfile(sampleProfile);
    expect(useProfile.getState().profile).toEqual(sampleProfile);

    // Reset only the in-memory zustand state; the storage mock retains the value.
    useProfile.setState(initialProfileState);
    await useProfile.getState().hydrate();
    expect(useProfile.getState().profile).toEqual(sampleProfile);
  });

  test('hydrate is idempotent — second call does not re-fetch', async () => {
    const storage = jest.requireMock('@/lib/storage/profile');
    await useProfile.getState().hydrate();
    await useProfile.getState().hydrate();
    expect(storage.getProfile).toHaveBeenCalledTimes(1);
  });

  test('clearProfile wipes both store and storage', async () => {
    await useProfile.getState().setProfile(sampleProfile);
    await useProfile.getState().clearProfile();
    expect(useProfile.getState().profile).toBeNull();
    expect(mockProfileStore).toBeNull();
  });

  test('selectors return null when profile is null', () => {
    const state = useProfile.getState();
    expect(selectBMR(state)).toBeNull();
    expect(selectTDEE(state)).toBeNull();
    expect(selectDailyGoalKJ(state)).toBeNull();
    expect(selectBMI(state)).toBeNull();
    expect(selectBMICategory(state)).toBeNull();
  });

  test('selectBMR matches lib/calc bmrKJ for a given profile', async () => {
    await useProfile.getState().setProfile(sampleProfile);
    const expected = bmrKJ({
      sex: sampleProfile.sex,
      weight_kg: sampleProfile.weight_kg,
      height_cm: sampleProfile.height_cm,
      age: sampleProfile.age,
    });
    expect(selectBMR(useProfile.getState())).toBe(expected);
  });

  test('selectTDEE, selectDailyGoalKJ, selectBMI, selectBMICategory derive from profile', async () => {
    await useProfile.getState().setProfile(sampleProfile);
    const state = useProfile.getState();
    expect(selectTDEE(state)).toBeGreaterThan(selectBMR(state)!);
    expect(selectDailyGoalKJ(state)).toBeLessThan(selectTDEE(state)!);
    expect(selectBMI(state)).toBeCloseTo(80 / (1.8 * 1.8), 5);
    expect(selectBMICategory(state)).toBe('normal');
  });
});

describe('log store', () => {
  function makeEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
    return {
      id: 'e' + Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      name: 'Snack',
      kj: 500,
      ...overrides,
    };
  }

  test('hydrate from empty returns empty entries', async () => {
    await useLog.getState().hydrate();
    expect(useLog.getState().entries).toEqual([]);
    expect(useLog.getState().hydrated).toBe(true);
  });

  test('addEntry updates selectTodayKJTotal and writes to storage', async () => {
    const a = makeEntry({ kj: 700 });
    const b = makeEntry({ kj: 1200 });
    await useLog.getState().addEntry(a);
    await useLog.getState().addEntry(b);
    expect(selectTodayKJTotal(useLog.getState())).toBe(1900);
    expect(mockFoodLogStore).toHaveLength(2);
  });

  test('removeEntry decrements selectTodayKJTotal', async () => {
    const a = makeEntry({ kj: 700 });
    const b = makeEntry({ kj: 1200 });
    await useLog.getState().addEntry(a);
    await useLog.getState().addEntry(b);
    await useLog.getState().removeEntry(a.id);
    expect(selectTodayKJTotal(useLog.getState())).toBe(1200);
    expect(mockFoodLogStore).toHaveLength(1);
  });

  test('selectTodayEntries excludes entries from yesterday', async () => {
    const yesterday = Date.now() - 36 * 60 * 60 * 1000;
    await useLog.getState().addEntry(makeEntry({ kj: 999, timestamp: yesterday }));
    await useLog.getState().addEntry(makeEntry({ kj: 100 }));
    expect(selectTodayEntries(useLog.getState())).toHaveLength(1);
    expect(selectTodayKJTotal(useLog.getState())).toBe(100);
  });

  test('replaceEntry swaps the entry in place', async () => {
    const a = makeEntry({ kj: 700, name: 'Apple' });
    await useLog.getState().addEntry(a);
    const updated: FoodEntry = { ...a, kj: 800, name: 'Big Apple' };
    await useLog.getState().replaceEntry(updated);
    expect(useLog.getState().entries[0]).toEqual(updated);
    expect(mockFoodLogStore[0]).toEqual(updated);
  });

  test('selectRemainingKJ returns goal minus today total', async () => {
    await useLog.getState().addEntry(makeEntry({ kj: 3000 }));
    expect(selectRemainingKJ(10000)(useLog.getState())).toBe(7000);
  });
});

describe('weight store', () => {
  function makeWeight(overrides: Partial<WeightEntry> = {}): WeightEntry {
    return {
      id: 'w' + Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      weight_kg: 80,
      ...overrides,
    };
  }

  test('addEntry increases length', async () => {
    await useWeight.getState().addEntry(makeWeight({ weight_kg: 80 }));
    await useWeight.getState().addEntry(makeWeight({ weight_kg: 79 }));
    expect(useWeight.getState().entries).toHaveLength(2);
  });

  test('selectLatestWeight returns the most recent entry by timestamp', async () => {
    const t0 = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const t1 = Date.now() - 1 * 24 * 60 * 60 * 1000;
    const t2 = Date.now();
    await useWeight.getState().addEntry(makeWeight({ timestamp: t1, weight_kg: 79 }));
    await useWeight.getState().addEntry(makeWeight({ timestamp: t0, weight_kg: 81 }));
    await useWeight.getState().addEntry(makeWeight({ timestamp: t2, weight_kg: 78 }));
    expect(selectLatestWeight(useWeight.getState())).toBe(78);
  });

  test('selectLatestWeight returns null when empty', () => {
    expect(selectLatestWeight(useWeight.getState())).toBeNull();
  });

  test('selectWeightTrend returns entries within last N days, ascending', async () => {
    const day = 24 * 60 * 60 * 1000;
    await useWeight.getState().addEntry(makeWeight({ timestamp: Date.now() - 30 * day, weight_kg: 90 }));
    await useWeight.getState().addEntry(makeWeight({ timestamp: Date.now() - 5 * day, weight_kg: 85 }));
    await useWeight.getState().addEntry(makeWeight({ timestamp: Date.now() - 1 * day, weight_kg: 84 }));
    const trend = selectWeightTrend(7)(useWeight.getState());
    expect(trend).toHaveLength(2);
    expect(trend[0]!.weight_kg).toBe(85);
    expect(trend[1]!.weight_kg).toBe(84);
  });

  test('hydrate is idempotent', async () => {
    const storage = jest.requireMock('@/lib/storage/weightLog');
    await useWeight.getState().hydrate();
    await useWeight.getState().hydrate();
    expect(storage.getWeightLog).toHaveBeenCalledTimes(1);
  });

  test('removeEntry drops the entry', async () => {
    const a = makeWeight({ weight_kg: 80 });
    const b = makeWeight({ weight_kg: 79 });
    await useWeight.getState().addEntry(a);
    await useWeight.getState().addEntry(b);
    await useWeight.getState().removeEntry(a.id);
    expect(useWeight.getState().entries).toHaveLength(1);
    expect(useWeight.getState().entries[0]!.id).toBe(b.id);
  });
});

describe('settings store', () => {
  test('hydrate from empty returns defaults', async () => {
    await useSettings.getState().hydrate();
    expect(useSettings.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(useSettings.getState().hydrated).toBe(true);
  });

  test('patch merges partial updates', async () => {
    await useSettings.getState().hydrate();
    await useSettings.getState().patch({ reminders_enabled: true });
    expect(useSettings.getState().settings).toEqual({
      ...DEFAULT_SETTINGS,
      reminders_enabled: true,
    });
    await useSettings.getState().patch({ reminder_interval_min: 60 });
    expect(useSettings.getState().settings).toEqual({
      ...DEFAULT_SETTINGS,
      reminders_enabled: true,
      reminder_interval_min: 60,
    });
  });

  test('setSettings replaces wholesale and persists', async () => {
    const next: Settings = {
      reminder_interval_min: 30,
      reminders_enabled: true,
      show_kcal_helper: false,
      voice: 'sharp',
    };
    await useSettings.getState().setSettings(next);
    expect(useSettings.getState().settings).toEqual(next);
    expect(mockSettingsStore).toEqual(next);
  });
});

describe('hydrateAll', () => {
  test('hydrates every store in parallel', async () => {
    await useProfile.getState().setProfile(sampleProfile);
    await useSettings.getState().setSettings({
      ...DEFAULT_SETTINGS,
      reminders_enabled: true,
    });

    // Reset zustand state without touching storage mocks.
    useProfile.setState(initialProfileState);
    useLog.setState(initialLogState);
    useWeight.setState(initialWeightState);
    useSettings.setState(initialSettingsState);

    await hydrateAll();
    expect(useProfile.getState().hydrated).toBe(true);
    expect(useLog.getState().hydrated).toBe(true);
    expect(useWeight.getState().hydrated).toBe(true);
    expect(useSettings.getState().hydrated).toBe(true);
    expect(useProfile.getState().profile).toEqual(sampleProfile);
    expect(useSettings.getState().settings.reminders_enabled).toBe(true);
  });
});
