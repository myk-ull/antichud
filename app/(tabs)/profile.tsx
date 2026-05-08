import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';

import {
  Button,
  Card,
  Hairline,
  Pressable,
  Screen,
  Text,
  cardEntry,
} from '@/components';
import { useTheme, type ThemeMode } from '@/styles/theme';
import { borders, radii, space } from '@/styles/tokens';
import {
  selectBMI,
  selectBMICategory,
  selectBMR,
  selectDailyGoalKJ,
  selectTDEE,
  useProfile,
  useSettings,
} from '@/lib/state';
import {
  cancelAllReminders,
  composeReminderBody,
  requestPermission,
  scheduleReminder,
} from '@/lib/notifications';
import { useLog } from '@/lib/state';
import { startOfDay, endOfDay } from 'date-fns';
import type { ActivityLevel, Sex, VoiceMode } from '@/types';

const SEX_LABEL: Record<Sex, string> = { male: 'Male', female: 'Female' };
const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Light',
  moderate: 'Moderate',
  active: 'Active',
  very_active: 'Very active',
};

const REMINDER_INTERVALS: ReadonlyArray<number> = [60, 120, 180, 240, 360];
const THEME_MODES: ReadonlyArray<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
const VOICE_OPTIONS: ReadonlyArray<{ value: VoiceMode; label: string; sub: string }> = [
  { value: 'editorial', label: 'Editorial', sub: 'Dry, scientific, restrained.' },
  { value: 'sharp', label: 'Sharp', sub: 'Direct, witty, no-nonsense.' },
  { value: 'chud', label: 'Chud', sub: 'Irreverent. Lean into the brand.' },
];

export default function ProfileScreen(): React.ReactElement {
  const { t, mode, setMode } = useTheme();
  const profile = useProfile((s) => s.profile);
  const clearProfile = useProfile((s) => s.clearProfile);
  const bmrV = useProfile(selectBMR);
  const tdeeV = useProfile(selectTDEE);
  const goalV = useProfile(selectDailyGoalKJ);
  const bmiV = useProfile(selectBMI);
  const bmiCat = useProfile(selectBMICategory);

  const settings = useSettings((s) => s.settings);
  const patchSettings = useSettings((s) => s.patch);
  const allEntries = useLog((s) => s.entries);

  const todayState = React.useMemo(() => {
    const start = startOfDay(new Date()).getTime();
    const end = endOfDay(new Date()).getTime();
    const today = allEntries.filter((e) => e.timestamp >= start && e.timestamp <= end);
    const consumedKJ = today.reduce((sum, e) => sum + e.kj, 0);
    return { consumedKJ, entriesCount: today.length };
  }, [allEntries]);

  const reminderBody = React.useMemo(
    () =>
      composeReminderBody({
        consumedKJ: todayState.consumedKJ,
        goalKJ: goalV ?? 0,
        entriesCount: todayState.entriesCount,
        voice: settings.voice,
      }),
    [todayState, goalV, settings.voice],
  );

  const onVoiceSelect = async (voice: VoiceMode): Promise<void> => {
    try {
      await patchSettings({ voice });
      // If reminders are running, re-schedule with the new voice immediately.
      if (settings.reminders_enabled) {
        await cancelAllReminders();
        await scheduleReminder(settings.reminder_interval_min, reminderBody);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change voice.');
    }
  };

  const [resetArmed, setResetArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);

  const onIntervalSelect = async (interval: number): Promise<void> => {
    try {
      await patchSettings({ reminder_interval_min: interval });
      if (settings.reminders_enabled) {
        await cancelAllReminders();
        await scheduleReminder(interval, reminderBody);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change interval.');
    }
  };

  const onToggleReminders = async (): Promise<void> => {
    setReminderBusy(true);
    setError(null);
    try {
      if (settings.reminders_enabled) {
        await cancelAllReminders();
        await patchSettings({ reminders_enabled: false });
      } else {
        const granted = await requestPermission();
        if (!granted) {
          setError('Notification permission denied.');
          return;
        }
        await scheduleReminder(settings.reminder_interval_min, reminderBody);
        await patchSettings({ reminders_enabled: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not toggle reminders.');
    } finally {
      setReminderBusy(false);
    }
  };

  const onToggleKcal = async (): Promise<void> => {
    try {
      await patchSettings({ show_kcal_helper: !settings.show_kcal_helper });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change setting.');
    }
  };

  const onResetPress = async (): Promise<void> => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    try {
      await cancelAllReminders().catch(() => undefined);
      await clearProfile();
      setResetArmed(false);
      router.replace('/onboarding');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset profile.');
    }
  };

  if (!profile) {
    return (
      <Screen>
        <Text variant="micro" tone="muted">PROFILE</Text>
        <Text variant="display" style={styles.headline}>missing.</Text>
        <Hairline style={styles.headlineRule} />
        <Text variant="bodySm" tone="muted" style={styles.missingCopy}>
          No profile on record. Set one up to begin.
        </Text>
        <Button
          label="Set up profile"
          variant="primary"
          size="lg"
          onPress={() => router.push('/onboarding')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="micro" tone="muted">CALIBRATION</Text>
      <Text variant="display" style={styles.headline}>profile.</Text>
      <Hairline style={styles.headlineRule} />

      {/* Card 1 — Identity */}
      <Animated.View entering={cardEntry(0)}>
        <Card variant="recessed" style={styles.card}>
          <View style={styles.cardHead}>
            <View>
              <Text variant="micro" tone="muted">SUBJECT</Text>
              <Text variant="displaySm" style={styles.subjectName}>You</Text>
            </View>
            <Button
              label="Edit"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/onboarding')}
            />
          </View>
          <Hairline style={styles.cardRule} />
          <TableRow label="Age" value={`${profile.age} yrs`} />
          <TableRow label="Sex" value={SEX_LABEL[profile.sex]} />
          <TableRow label="Activity" value={ACTIVITY_LABEL[profile.activity_level]} />
          <TableRow label="Mode" value={profile.deficit_mode.toUpperCase()} />
        </Card>
      </Animated.View>

      {/* Card 2 — Energy table */}
      <Animated.View entering={cardEntry(1)}>
        <Card variant="recessed" style={styles.card}>
          <Text variant="micro" tone="muted">ENERGY TABLE</Text>
          <Hairline style={styles.cardRule} />
          <TableRow
            label="BMI"
            value={bmiV !== null ? `${bmiV.toFixed(1)}  ·  ${bmiCat ?? ''}` : '—'}
          />
          <TableRow
            label="BMR"
            value={bmrV !== null ? `${bmrV.toLocaleString('en-US')} kJ` : '—'}
          />
          <TableRow
            label="TDEE"
            value={tdeeV !== null ? `${tdeeV.toLocaleString('en-US')} kJ` : '—'}
          />
          <TableRow
            label="Daily goal"
            value={goalV !== null ? `${goalV.toLocaleString('en-US')} kJ` : '—'}
            accent
          />
        </Card>
      </Animated.View>

      {/* Card 3 — Settings */}
      <Animated.View entering={cardEntry(2)}>
      <Card variant="recessed" style={styles.card}>
        <Text variant="micro" tone="muted">SETTINGS</Text>
        <Hairline style={styles.cardRule} />

        <Text variant="label" style={styles.settingLabel}>Reminder interval</Text>
        <View style={styles.intervalRow}>
          {REMINDER_INTERVALS.map((m) => {
            const active = settings.reminder_interval_min === m;
            return (
              <Pressable
                key={m}
                onPress={() => void onIntervalSelect(m)}
                style={[
                  styles.intervalChip,
                  {
                    backgroundColor: active ? t.ember : 'transparent',
                    borderColor: active ? t.ember : t.rule,
                    borderWidth: active ? borders.accent : borders.hairline,
                  },
                ]}
              >
                <Text
                  variant="monoSm"
                  tone={active ? 'inverse' : 'primary'}
                >
                  {`${m}m`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Hairline style={styles.settingRule} />

        <SwitchRow
          label="Enable reminders"
          sub="Periodic nudges to log a meal."
          on={settings.reminders_enabled}
          loading={reminderBusy}
          onPress={onToggleReminders}
        />

        <Hairline style={styles.settingRule} />

        <SwitchRow
          label="Show kcal helper"
          sub="Small kcal readout below kJ values."
          on={settings.show_kcal_helper}
          onPress={onToggleKcal}
        />

        <Hairline style={styles.settingRule} />

        <Text variant="label" style={styles.settingLabel}>Voice</Text>
        <Text variant="bodySm" tone="muted" style={styles.voiceCaption}>
          Tone for reminders and threshold alerts.
        </Text>
        <View style={styles.voiceCol}>
          {VOICE_OPTIONS.map((opt) => {
            const active = settings.voice === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => void onVoiceSelect(opt.value)}
                style={[
                  styles.voiceRow,
                  {
                    borderColor: active ? t.ember : t.rule,
                    borderWidth: active ? borders.accent : borders.hairline,
                    backgroundColor: active ? t.emberSoft : 'transparent',
                  },
                ]}
              >
                <View style={styles.voiceRowText}>
                  <Text variant="label" tone={active ? 'accent' : 'primary'}>
                    {opt.label}
                  </Text>
                  <Text variant="bodySm" tone="muted">
                    {opt.sub}
                  </Text>
                </View>
                {opt.value === 'chud' && active ? (
                  <Text variant="micro" tone="accent">
                    HEADS UP
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Hairline style={styles.settingRule} />

        <Text variant="label" style={styles.settingLabel}>Theme</Text>
        <View style={styles.intervalRow}>
          {THEME_MODES.map((tm) => {
            const active = mode === tm.value;
            return (
              <Pressable
                key={tm.value}
                onPress={() => setMode(tm.value)}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: active ? t.ember : 'transparent',
                    borderColor: active ? t.ember : t.rule,
                    borderWidth: active ? borders.accent : borders.hairline,
                  },
                ]}
              >
                <Text variant="bodySm" tone={active ? 'inverse' : 'primary'} align="center">
                  {tm.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
      </Animated.View>

      {error ? (
        <Card variant="outlined" style={styles.errorCard}>
          <Text variant="bodySm" tone="accent">{error}</Text>
          <View style={styles.dismissRow}>
            <Button label="Dismiss" variant="ghost" size="sm" onPress={() => setError(null)} />
          </View>
        </Card>
      ) : null}

      {/* Card 4 — Danger */}
      <Animated.View entering={cardEntry(3)}>
        <Card variant="outlined" style={styles.card}>
          <Text variant="micro" tone="accent">DANGER</Text>
          <Hairline style={styles.cardRule} />
          <Text variant="bodySm" tone="muted" style={styles.dangerCopy}>
            Erases your profile and returns the app to onboarding. Logs are kept.
          </Text>
          <Button
            label={resetArmed ? 'Press again to confirm' : 'Reset profile'}
            variant="destructive"
            onPress={onResetPress}
          />
          {resetArmed ? (
            <View style={styles.cancelRow}>
              <Button label="Cancel" variant="ghost" size="sm" onPress={() => setResetArmed(false)} />
            </View>
          ) : null}
        </Card>
      </Animated.View>
    </Screen>
  );
}

function TableRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}): React.ReactElement {
  return (
    <View style={styles.tableRow}>
      <Text variant="body" tone="muted">{label}</Text>
      <Text variant="mono" tone={accent ? 'accent' : 'primary'}>
        {value}
      </Text>
    </View>
  );
}

function SwitchRow({
  label,
  sub,
  on,
  loading,
  onPress,
}: {
  label: string;
  sub?: string;
  on: boolean;
  loading?: boolean;
  onPress: () => Promise<void> | void;
}): React.ReactElement {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={styles.switchRow}
    >
      <View style={styles.switchTextCol}>
        <Text variant="label">{label}</Text>
        {sub ? <Text variant="bodySm" tone="muted">{sub}</Text> : null}
      </View>
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: on ? t.ember : 'transparent',
            borderColor: on ? t.ember : t.rule,
          },
        ]}
      >
        <View
          style={[
            styles.switchKnob,
            {
              backgroundColor: on ? t.paper : t.ink,
              alignSelf: on ? 'flex-end' : 'flex-start',
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headline: {
    marginTop: space.xs,
  },
  headlineRule: {
    marginTop: space.sm,
    marginBottom: space.xl,
  },
  card: {
    marginBottom: space.lg,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardRule: {
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  subjectName: {
    marginTop: space.xs,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
  },
  settingLabel: {
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  intervalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  intervalChip: {
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radii.xs,
    minWidth: 56,
    alignItems: 'center',
  },
  themeChip: {
    flex: 1,
    paddingVertical: space.sm,
    borderRadius: radii.xs,
  },
  voiceCaption: {
    marginTop: -space.xs,
    marginBottom: space.sm,
  },
  voiceCol: {
    gap: space.sm,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
    paddingHorizontal: space.base,
    borderRadius: radii.xs,
  },
  voiceRowText: {
    flex: 1,
  },
  settingRule: {
    marginVertical: space.base,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: space.md,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    padding: 2,
    justifyContent: 'center',
  },
  switchKnob: {
    width: 16,
    height: 16,
    borderRadius: radii.pill,
  },
  errorCard: {
    marginBottom: space.lg,
  },
  dismissRow: {
    marginTop: space.sm,
    alignSelf: 'flex-start',
  },
  dangerCopy: {
    marginTop: space.sm,
    marginBottom: space.base,
  },
  cancelRow: {
    marginTop: space.sm,
    alignSelf: 'flex-start',
  },
  missingCopy: {
    marginBottom: space.lg,
  },
});
