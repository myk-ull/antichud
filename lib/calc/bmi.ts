import type { BMICategory } from '@/types';

export type BmiInput = Readonly<{
  weight_kg: number;
  height_cm: number;
}>;

export function bmi({ weight_kg, height_cm }: BmiInput): number {
  const height_m = height_cm / 100;
  return weight_kg / (height_m * height_m);
}

export function bmiCategory(value: number): BMICategory {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'normal';
  if (value < 30) return 'overweight';
  return 'obese';
}
