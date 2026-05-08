/**
 * Antichud — shared TypeScript types.
 *
 * Conventions:
 * - All energy values are in kilojoules (kJ), integer-valued. Never kcal.
 * - IDs are uuid-v4-like strings.
 * - Timestamps are epoch milliseconds (number).
 */

export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type DeficitMode = 'cut' | 'maintain' | 'bulk';

export type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export type Confidence = 'low' | 'med' | 'high';

export type Profile = Readonly<{
  weight_kg: number;
  target_weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
  deficit_mode: DeficitMode;
  kj_goal_override?: number;
  created_at: number;
  updated_at: number;
}>;

export type Macros = Readonly<{
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
}>;

export type FoodEntryItem = Readonly<{
  name: string;
  kj: number;
  qty?: number;
}>;

export type AIMeta = Readonly<{
  model?: string;
  raw?: string;
  prompt_hint?: string;
}>;

export type FoodEntry = Readonly<{
  id: string;
  timestamp: number;
  name: string;
  kj: number;
  macros?: Macros;
  photo_uri?: string;
  confidence?: Confidence;
  items?: ReadonlyArray<FoodEntryItem>;
  ai_meta?: AIMeta;
}>;

export type WeightEntry = Readonly<{
  id: string;
  timestamp: number;
  weight_kg: number;
}>;

/**
 * Notification voice presets:
 *   editorial — dry / scientific / Energy Table register (default)
 *   sharp    — direct, witty, no-nonsense
 *   chud     — irreverent brand-ironic mode. The user chose Antichud for a
 *              reason; this lets them feel it. Opt-in only.
 */
export type VoiceMode = 'editorial' | 'sharp' | 'chud';

/** Bands the threshold-notification system fires on (once per band per day). */
export type ThresholdBand = 'approach' | 'reached' | 'over' | 'far_over';

export type Settings = Readonly<{
  reminder_interval_min: number;
  reminders_enabled: boolean;
  last_reminder_at?: number;
  show_kcal_helper: boolean;
  /** Voice used for both periodic reminders and threshold notifications. */
  voice: VoiceMode;
  /**
   * Map of `<YYYY-MM-DD>:<band>` → epoch ms when that band last fired today.
   * Lets us avoid re-spamming the same threshold within the same local day.
   */
  thresholds_fired?: Record<string, number>;
}>;

export type EnergyEstimate = Readonly<{
  name: string;
  kj: number;
  confidence: Confidence;
  items: ReadonlyArray<FoodEntryItem>;
  macros?: Macros;
}>;
