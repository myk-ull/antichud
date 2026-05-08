import { create } from 'zustand';
import type { BMICategory, Profile } from '@/types';
import {
  bmi,
  bmiCategory,
  bmrKJ,
  dailyGoalKJ,
  tdeeKJ,
} from '@/lib/calc';
import {
  clearProfile as storageClearProfile,
  getProfile as storageGetProfile,
  setProfile as storageSetProfile,
} from '@/lib/storage/profile';

export type ProfileState = Readonly<{
  profile: Profile | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setProfile: (p: Profile) => Promise<void>;
  clearProfile: () => Promise<void>;
}>;

export const initialProfileState: Pick<ProfileState, 'profile' | 'hydrated'> = {
  profile: null,
  hydrated: false,
};

export const useProfile = create<ProfileState>((set, get) => ({
  ...initialProfileState,
  hydrate: async () => {
    if (get().hydrated) return;
    const profile = await storageGetProfile();
    set({ profile, hydrated: true });
  },
  setProfile: async (p) => {
    await storageSetProfile(p);
    set({ profile: p });
  },
  clearProfile: async () => {
    await storageClearProfile();
    set({ profile: null });
  },
}));

export function selectBMR(state: ProfileState): number | null {
  const p = state.profile;
  if (!p) return null;
  return bmrKJ({
    sex: p.sex,
    weight_kg: p.weight_kg,
    height_cm: p.height_cm,
    age: p.age,
  });
}

export function selectTDEE(state: ProfileState): number | null {
  const p = state.profile;
  if (!p) return null;
  const bmr = bmrKJ({
    sex: p.sex,
    weight_kg: p.weight_kg,
    height_cm: p.height_cm,
    age: p.age,
  });
  return tdeeKJ({ bmr_kj: bmr, activity_level: p.activity_level });
}

export function selectDailyGoalKJ(state: ProfileState): number | null {
  const p = state.profile;
  if (!p) return null;
  const bmr = bmrKJ({
    sex: p.sex,
    weight_kg: p.weight_kg,
    height_cm: p.height_cm,
    age: p.age,
  });
  const tdee = tdeeKJ({ bmr_kj: bmr, activity_level: p.activity_level });
  return dailyGoalKJ({
    tdee_kj: tdee,
    deficit_mode: p.deficit_mode,
    override_kj: p.kj_goal_override,
  });
}

export function selectBMI(state: ProfileState): number | null {
  const p = state.profile;
  if (!p) return null;
  return bmi({ weight_kg: p.weight_kg, height_cm: p.height_cm });
}

export function selectBMICategory(state: ProfileState): BMICategory | null {
  const value = selectBMI(state);
  if (value == null) return null;
  return bmiCategory(value);
}
