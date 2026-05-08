import type { ActivityLevel, DeficitMode, Sex } from '@/types';

export const KCAL_TO_KJ = 4.184;

export const ACTIVITY_MULTIPLIERS: Readonly<Record<ActivityLevel, number>> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const DEFAULT_CUT_DEFICIT_KJ = 2000;
export const DEFAULT_BULK_SURPLUS_KJ = 1500;

export function kcalToKJ(kcal: number): number {
  return Math.round(kcal * KCAL_TO_KJ);
}

export function kjToKcal(kj: number): number {
  return Math.round(kj / KCAL_TO_KJ);
}

export type BmrInput = Readonly<{
  sex: Sex;
  weight_kg: number;
  height_cm: number;
  age: number;
}>;

export function bmrKJ({ sex, weight_kg, height_cm, age }: BmrInput): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  const kcal = sex === 'male' ? base + 5 : base - 161;
  return kcalToKJ(kcal);
}

export type TdeeInput = Readonly<{
  bmr_kj: number;
  activity_level: ActivityLevel;
}>;

export function tdeeKJ({ bmr_kj, activity_level }: TdeeInput): number {
  return Math.round(bmr_kj * ACTIVITY_MULTIPLIERS[activity_level]);
}

export type DailyGoalInput = Readonly<{
  tdee_kj: number;
  deficit_mode: DeficitMode;
  override_kj?: number;
}>;

export function dailyGoalKJ({
  tdee_kj,
  deficit_mode,
  override_kj,
}: DailyGoalInput): number {
  if (typeof override_kj === 'number') return Math.round(override_kj);
  switch (deficit_mode) {
    case 'cut':
      return tdee_kj - DEFAULT_CUT_DEFICIT_KJ;
    case 'bulk':
      return tdee_kj + DEFAULT_BULK_SURPLUS_KJ;
    case 'maintain':
      return tdee_kj;
  }
}

export type RemainingInput = Readonly<{
  goal_kj: number;
  consumed_kj: number;
}>;

export function remainingKJ({ goal_kj, consumed_kj }: RemainingInput): number {
  return goal_kj - consumed_kj;
}
