import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import * as nativeImpl from './native';
import * as webImpl from './web';
import {
  bandFor,
  isHigherBand,
  localDayKey,
  reminderCopy,
  thresholdCopy,
  type VoiceCopy,
} from './voice';
import type { Settings, ThresholdBand, VoiceMode } from '@/types';

export { nextFireDelayMs } from './scheduler';
export {
  reminderCopy,
  thresholdCopy,
  bandFor,
  isHigherBand,
  localDayKey,
  type VoiceCopy,
} from './voice';

export interface NotificationsApi {
  requestPermission(): Promise<boolean>;
  scheduleReminder(intervalMin: number, body?: string, title?: string): Promise<string | null>;
  cancelAllReminders(): Promise<void>;
  isPermissionGranted(): Promise<boolean>;
}

const impl: NotificationsApi = Platform.OS === 'web' ? webImpl : nativeImpl;

export const requestPermission = (): Promise<boolean> => impl.requestPermission();

export const scheduleReminder = (
  intervalMin: number,
  body?: string,
  title?: string,
): Promise<string | null> => impl.scheduleReminder(intervalMin, body, title);

export const cancelAllReminders = (): Promise<void> => impl.cancelAllReminders();

export const isPermissionGranted = (): Promise<boolean> => impl.isPermissionGranted();

/**
 * Compose a reminder body string in the user's chosen voice.
 *
 * Backwards-compatible — when called without `voice` it falls back to the
 * editorial register. Existing call sites keep working.
 */
export function composeReminderBody(args: {
  consumedKJ: number;
  goalKJ: number;
  entriesCount: number;
  voice?: VoiceMode;
}): string {
  const remaining = args.goalKJ - args.consumedKJ;
  const overBy = remaining < 0 ? -remaining : 0;
  return reminderCopy(args.voice ?? 'editorial', {
    consumedKJ: args.consumedKJ,
    goalKJ: args.goalKJ,
    remainingKJ: Math.max(0, remaining),
    overByKJ: overBy,
  }).body;
}

/** Same as `composeReminderBody` but returns title + body together. */
export function composeReminder(args: {
  consumedKJ: number;
  goalKJ: number;
  entriesCount: number;
  voice?: VoiceMode;
}): VoiceCopy {
  const remaining = args.goalKJ - args.consumedKJ;
  const overBy = remaining < 0 ? -remaining : 0;
  return reminderCopy(args.voice ?? 'editorial', {
    consumedKJ: args.consumedKJ,
    goalKJ: args.goalKJ,
    remainingKJ: Math.max(0, remaining),
    overByKJ: overBy,
  });
}

/**
 * Determine whether a fresh threshold notification should fire after a
 * meal log. Returns the band + copy if so, else null.
 *
 * Caller is responsible for persisting the result back into Settings via
 * `recordThresholdFired` so the same band doesn't re-fire today.
 */
export function evaluateThreshold(args: {
  consumedKJ: number;
  goalKJ: number;
  voice: VoiceMode;
  thresholdsFired: Settings['thresholds_fired'];
  now?: Date;
}): { band: ThresholdBand; copy: VoiceCopy } | null {
  const now = args.now ?? new Date();
  const band = bandFor(args.consumedKJ, args.goalKJ);
  if (band === null) return null;
  const dayKey = localDayKey(now);
  const lastFiredTs = (args.thresholdsFired ?? {})[dayKey];
  const lastBand = decodeBand(lastFiredTs);
  if (!isHigherBand(band, lastBand)) return null;
  const remaining = args.goalKJ - args.consumedKJ;
  const overBy = remaining < 0 ? -remaining : 0;
  const copy = thresholdCopy(args.voice, band, {
    consumedKJ: args.consumedKJ,
    goalKJ: args.goalKJ,
    remainingKJ: Math.max(0, remaining),
    overByKJ: overBy,
  });
  return { band, copy };
}

/** Build the new `thresholds_fired` map after a successful threshold fire. */
export function recordThresholdFired(
  prev: Settings['thresholds_fired'],
  band: ThresholdBand,
  now: Date = new Date(),
): Record<string, number> {
  const dayKey = localDayKey(now);
  // Prune entries older than 7 days so the map doesn't grow forever.
  const cutoff = now.getTime() - 7 * 86_400_000;
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(prev ?? {})) {
    if (typeof v !== 'number') continue;
    if (v < cutoff) continue;
    next[k] = v;
  }
  // Store the band's order index in the timestamp's "tens" so we can rank;
  // simplest implementation: store the band string directly.
  next[dayKey] = encodeBandTs(band, now.getTime());
  return next;
}

const BAND_TAG: Record<ThresholdBand, number> = {
  approach: 1,
  reached: 2,
  over: 3,
  far_over: 4,
};
const TAG_REVERSE: Record<number, ThresholdBand> = {
  1: 'approach',
  2: 'reached',
  3: 'over',
  4: 'far_over',
};

/**
 * Pack a band into the low digit of an epoch-ms number so we can recover
 * "highest band fired today" from a single number stored in settings.
 * (Last digit of timestamp is essentially noise anyway.)
 */
function encodeBandTs(band: ThresholdBand, ts: number): number {
  return Math.floor(ts / 10) * 10 + BAND_TAG[band];
}

export function decodeBand(ts: number | undefined): ThresholdBand | null {
  if (typeof ts !== 'number') return null;
  return TAG_REVERSE[ts % 10] ?? null;
}

/**
 * Fire a one-shot local notification immediately. No scheduling, no repeat.
 * Used by the threshold system to surface "you crossed N% of goal" alerts.
 */
export async function fireOneShot(title: string, body: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (window.Notification.permission !== 'granted') return false;
    try {
      new window.Notification(title, { body });
      return true;
    } catch {
      return false;
    }
  }
  const granted = await impl.isPermissionGranted();
  if (!granted) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // immediate
    });
    return true;
  } catch {
    return false;
  }
}
