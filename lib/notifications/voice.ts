/**
 * Voice library — copy for periodic reminders + one-shot threshold
 * notifications, in three registers:
 *
 *   editorial — dry / scientific / Energy Table register (default)
 *   sharp     — direct, witty, no-nonsense
 *   chud      — irreverent, brand-ironic. Lives up to the app's name.
 *
 * The user picks their voice in Settings. All copy stays under the line of
 * actually mocking the user — even chud mode is theatrical, not cruel.
 */

import type { ThresholdBand, VoiceMode } from '@/types';

export type VoiceCopy = Readonly<{ title: string; body: string }>;

type CopyArgs = Readonly<{
  consumedKJ: number;
  goalKJ: number;
  remainingKJ: number;
  overByKJ: number;
}>;

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// REMINDERS — fire on a schedule. Copy reflects today's state.
// ---------------------------------------------------------------------------

export function reminderCopy(voice: VoiceMode, args: CopyArgs): VoiceCopy {
  const { consumedKJ, goalKJ, remainingKJ, overByKJ } = args;
  const noGoal = goalKJ <= 0;

  switch (voice) {
    case 'sharp':
      if (noGoal) return { title: 'Log a meal', body: `${fmt(consumedKJ)} kJ on the table today. Add what's missing.` };
      if (overByKJ > 0) return { title: 'Over goal', body: `Over by ${fmt(overByKJ)} kJ. Note it. Don't pretend it didn't happen.` };
      return { title: 'Log a meal', body: `${fmt(remainingKJ)} kJ left for today. Spend them well.` };
    case 'chud':
      if (noGoal) return { title: 'Hello chud', body: `${fmt(consumedKJ)} kJ logged. Get on the table. The instrument is watching.` };
      if (overByKJ > 0) return { title: 'Imagine being over goal', body: `Over by ${fmt(overByKJ)} kJ. Do you really want to stay a chungus?` };
      if (remainingKJ <= 1500) return { title: 'Almost there, fatass', body: `Only ${fmt(remainingKJ)} kJ left. Don't blow it on cookies.` };
      return { title: 'Antichud is watching', body: `${fmt(remainingKJ)} kJ remaining. The bag of chips is not the answer.` };
    case 'editorial':
    default:
      if (noGoal) return { title: 'The table is open', body: `${fmt(consumedKJ)} kJ logged today. Calibrate the instrument.` };
      if (overByKJ > 0) return { title: 'Over goal', body: `Over by ${fmt(overByKJ)} kJ. Antichud is measuring, not judging.` };
      return { title: 'The table is open', body: `${fmt(remainingKJ)} kJ remaining today. Tap to log what you ate.` };
  }
}

// ---------------------------------------------------------------------------
// THRESHOLDS — fire once when crossing a band, in real time after a meal log.
// ---------------------------------------------------------------------------

const EDITORIAL: Record<ThresholdBand, (a: CopyArgs) => VoiceCopy> = {
  approach: (a) => ({
    title: 'Approaching goal',
    body: `${fmt(a.remainingKJ)} kJ left. The data does not lie.`,
  }),
  reached: (a) => ({
    title: 'Goal reached',
    body: `${fmt(a.consumedKJ)} kJ on the table. Further input is surplus.`,
  }),
  over: (a) => ({
    title: 'Over goal',
    body: `Over by ${fmt(a.overByKJ)} kJ. Note it. Tomorrow is also a day.`,
  }),
  far_over: (a) => ({
    title: 'Significant surplus',
    body: `${fmt(a.overByKJ)} kJ past the line. The table records it without comment.`,
  }),
};

const SHARP: Record<ThresholdBand, (a: CopyArgs) => VoiceCopy> = {
  approach: (a) => ({
    title: 'Stop soon',
    body: `${fmt(a.remainingKJ)} kJ left. One more bite is a choice.`,
  }),
  reached: (a) => ({
    title: 'You are at the line',
    body: 'Crossing is voluntary. So is closing the kitchen.',
  }),
  over: (a) => ({
    title: 'Over the line',
    body: `Over by ${fmt(a.overByKJ)} kJ. Drink water. Walk it off.`,
  }),
  far_over: (a) => ({
    title: 'Way over',
    body: `${fmt(a.overByKJ)} kJ past goal. Full stop. Reset tomorrow.`,
  }),
};

const CHUD: Record<ThresholdBand, (a: CopyArgs) => VoiceCopy> = {
  approach: (a) => ({
    title: 'Hands off the snack drawer',
    body: `${fmt(a.remainingKJ)} kJ left. Don't even think about it.`,
  }),
  reached: (a) => ({
    title: 'Kitchen closes now',
    body: 'Goal hit. Step away from the fridge, chungus.',
  }),
  over: (a) => ({
    title: 'Over goal, big guy',
    body: `Over by ${fmt(a.overByKJ)} kJ. Do you really want to stay a chungus?`,
  }),
  far_over: (a) => ({
    title: 'Chungus alert: ACTIVATED',
    body: `${fmt(a.overByKJ)} kJ past the line. The instrument is judging. Loudly.`,
  }),
};

export function thresholdCopy(voice: VoiceMode, band: ThresholdBand, args: CopyArgs): VoiceCopy {
  switch (voice) {
    case 'sharp':
      return SHARP[band](args);
    case 'chud':
      return CHUD[band](args);
    case 'editorial':
    default:
      return EDITORIAL[band](args);
  }
}

// ---------------------------------------------------------------------------
// BAND DETECTION — given a percent of goal consumed, return the band that
// just got crossed. Returns null if no band crossed (or no goal).
// ---------------------------------------------------------------------------

const BAND_RULES: ReadonlyArray<{ band: ThresholdBand; minPct: number }> = [
  { band: 'far_over', minPct: 1.3 },
  { band: 'over', minPct: 1.0 },
  { band: 'reached', minPct: 1.0 }, // reached is replaced by "over" when truly over
  { band: 'approach', minPct: 0.85 },
];

/**
 * Highest-priority band the user currently sits in, or null if below
 * the approach threshold. We surface only the strongest signal at a given
 * total — so going from 95% → 105% fires `over`, skipping `reached`.
 */
export function bandFor(consumedKJ: number, goalKJ: number): ThresholdBand | null {
  if (goalKJ <= 0) return null;
  const pct = consumedKJ / goalKJ;
  if (pct >= 1.3) return 'far_over';
  if (pct > 1.0) return 'over';
  if (pct >= 1.0) return 'reached';
  if (pct >= 0.85) return 'approach';
  return null;
}

/** Strict ordering used to compare "have we already fired this or higher today?" */
const BAND_ORDER: Record<ThresholdBand, number> = {
  approach: 0,
  reached: 1,
  over: 2,
  far_over: 3,
};

export function isHigherBand(next: ThresholdBand, prev: ThresholdBand | null): boolean {
  if (prev === null) return true;
  return BAND_ORDER[next] > BAND_ORDER[prev];
}

export function localDayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
