jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
      getAllKeys: jest.fn(async () => Array.from(store.keys())),
      multiGet: jest.fn(async (keys: string[]) =>
        keys.map((k) => [k, store.has(k) ? store.get(k)! : null]),
      ),
      __reset: () => {
        store.clear();
      },
      __dump: () => Object.fromEntries(store.entries()),
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoodEntry, Profile, WeightEntry } from '@/types';
import {
  K_FOOD_LOG,
  K_PROFILE,
  K_SCHEMA_VERSION,
  K_SETTINGS,
  K_WEIGHT_LOG,
  KEY_PREFIX,
  SCHEMA_VERSION,
  appendFood,
  appendWeight,
  clearProfile,
  getFoodForDate,
  getFoodLog,
  getProfile,
  getSettings,
  getWeightLog,
  patchSettings,
  removeFood,
  removeWeight,
  replaceFood,
  setProfile,
  setSettings,
} from '@/lib/storage';

type MockableAsyncStorage = typeof AsyncStorage & { __reset: () => void };

const mockAS = AsyncStorage as MockableAsyncStorage;

beforeEach(() => {
  mockAS.__reset();
  jest.clearAllMocks();
});

describe('keys', () => {
  it('uses the antichud:v1: prefix on every key', () => {
    expect(K_PROFILE.startsWith(KEY_PREFIX)).toBe(true);
    expect(K_FOOD_LOG.startsWith(KEY_PREFIX)).toBe(true);
    expect(K_WEIGHT_LOG.startsWith(KEY_PREFIX)).toBe(true);
    expect(K_SETTINGS.startsWith(KEY_PREFIX)).toBe(true);
    expect(K_SCHEMA_VERSION.startsWith(KEY_PREFIX)).toBe(true);
    expect(KEY_PREFIX).toBe('antichud:v1:');
    expect(SCHEMA_VERSION).toBe(1);
  });
});

describe('profile storage', () => {
  const profile: Profile = {
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

  it('returns null on empty store', async () => {
    expect(await getProfile()).toBeNull();
  });

  it('round-trips a profile', async () => {
    await setProfile(profile);
    const loaded = await getProfile();
    expect(loaded).toEqual(profile);
  });

  it('writes the schema version after a successful set', async () => {
    await setProfile(profile);
    expect(await AsyncStorage.getItem(K_SCHEMA_VERSION)).toBe(String(SCHEMA_VERSION));
  });

  it('clears the profile', async () => {
    await setProfile(profile);
    await clearProfile();
    expect(await getProfile()).toBeNull();
  });

  it('returns null on malformed JSON', async () => {
    await AsyncStorage.setItem(K_PROFILE, '{not json');
    expect(await getProfile()).toBeNull();
  });
});

describe('foodLog storage', () => {
  const mkEntry = (id: string, timestamp: number, kj: number, name = 'Apple'): FoodEntry => ({
    id,
    timestamp,
    name,
    kj,
  });

  it('starts empty', async () => {
    expect(await getFoodLog()).toEqual([]);
  });

  it('appends entries in order', async () => {
    const a = mkEntry('a', 1000, 500);
    const b = mkEntry('b', 2000, 800);
    await appendFood(a);
    await appendFood(b);
    expect(await getFoodLog()).toEqual([a, b]);
  });

  it('removes by id', async () => {
    const a = mkEntry('a', 1000, 500);
    const b = mkEntry('b', 2000, 800);
    await appendFood(a);
    await appendFood(b);
    await removeFood('a');
    expect(await getFoodLog()).toEqual([b]);
  });

  it('replaces by id, preserving order', async () => {
    const a = mkEntry('a', 1000, 500, 'Apple');
    const b = mkEntry('b', 2000, 800, 'Banana');
    await appendFood(a);
    await appendFood(b);
    const aPrime = mkEntry('a', 1500, 1000, 'Big Apple');
    await replaceFood(aPrime);
    expect(await getFoodLog()).toEqual([aPrime, b]);
  });

  it('filters entries to a single local day, even when neighbors cross midnight', async () => {
    const day = new Date(2025, 4, 7, 12, 0, 0); // local noon
    const justBeforeMidnight = new Date(2025, 4, 6, 23, 59, 59, 500).getTime();
    const justAfterMidnight = new Date(2025, 4, 7, 0, 0, 0, 500).getTime();
    const lateInDay = new Date(2025, 4, 7, 23, 30, 0).getTime();
    const nextDay = new Date(2025, 4, 8, 0, 0, 0, 500).getTime();

    const before = mkEntry('before', justBeforeMidnight, 100);
    const earlyMorning = mkEntry('early', justAfterMidnight, 200);
    const evening = mkEntry('evening', lateInDay, 300);
    const tomorrow = mkEntry('tomorrow', nextDay, 400);

    await appendFood(before);
    await appendFood(earlyMorning);
    await appendFood(evening);
    await appendFood(tomorrow);

    const today = await getFoodForDate(day);
    const ids = today.map((e) => e.id).sort();
    expect(ids).toEqual(['early', 'evening']);
  });
});

describe('weightLog storage', () => {
  const mkEntry = (id: string, timestamp: number, weight_kg: number): WeightEntry => ({
    id,
    timestamp,
    weight_kg,
  });

  it('starts empty', async () => {
    expect(await getWeightLog()).toEqual([]);
  });

  it('appends and reads back sorted ascending by timestamp', async () => {
    const later = mkEntry('b', 2000, 78);
    const earlier = mkEntry('a', 1000, 80);
    const middle = mkEntry('c', 1500, 79);
    await appendWeight(later);
    await appendWeight(earlier);
    await appendWeight(middle);
    const list = await getWeightLog();
    expect(list.map((e) => e.id)).toEqual(['a', 'c', 'b']);
  });

  it('removes by id', async () => {
    await appendWeight(mkEntry('a', 1000, 80));
    await appendWeight(mkEntry('b', 2000, 79));
    await removeWeight('a');
    const list = await getWeightLog();
    expect(list.map((e) => e.id)).toEqual(['b']);
  });
});

describe('settings storage', () => {
  it('returns sane defaults on an empty store', async () => {
    const s = await getSettings();
    expect(s).toEqual({
      reminder_interval_min: 240,
      reminders_enabled: false,
      show_kcal_helper: true,
    });
  });

  it('round-trips full settings', async () => {
    await setSettings({
      reminder_interval_min: 90,
      reminders_enabled: true,
      show_kcal_helper: false,
      voice: 'chud',
      last_reminder_at: 1_700_000_000_000,
    });
    const loaded = await getSettings();
    expect(loaded).toEqual({
      reminder_interval_min: 90,
      reminders_enabled: true,
      show_kcal_helper: false,
      last_reminder_at: 1_700_000_000_000,
    });
  });

  it('patchSettings merges partials onto current state', async () => {
    const merged = await patchSettings({ reminders_enabled: true });
    expect(merged).toEqual({
      reminder_interval_min: 240,
      reminders_enabled: true,
      show_kcal_helper: true,
    });

    const merged2 = await patchSettings({ reminder_interval_min: 60, show_kcal_helper: false });
    expect(merged2).toEqual({
      reminder_interval_min: 60,
      reminders_enabled: true,
      show_kcal_helper: false,
    });

    expect(await getSettings()).toEqual(merged2);
  });

  it('falls back to defaults when stored JSON is malformed', async () => {
    await AsyncStorage.setItem(K_SETTINGS, '{not json');
    const s = await getSettings();
    expect(s).toEqual({
      reminder_interval_min: 240,
      reminders_enabled: false,
      show_kcal_helper: true,
    });
  });
});
