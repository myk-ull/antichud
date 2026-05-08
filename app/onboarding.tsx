import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { Button, Card, Hairline, KJReadout, Pressable, Screen, Text } from '@/components';
import { useTheme } from '@/styles/theme';
import { fonts, fontSize, lineHeight, space, borders, radii } from '@/styles/tokens';
import { type } from '@/styles/typography';
import {
  bmi,
  bmiCategory,
  bmrKJ,
  dailyGoalKJ,
  tdeeKJ,
} from '@/lib/calc';
import { useProfile } from '@/lib/state';
import type { ActivityLevel, DeficitMode, Profile, Sex } from '@/types';

const ACTIVITY_OPTIONS: ReadonlyArray<{ value: ActivityLevel; label: string; sub: string }> = [
  { value: 'sedentary', label: 'Sedentary', sub: 'desk · little movement' },
  { value: 'light', label: 'Light', sub: 'walks · 1–3 sessions' },
  { value: 'moderate', label: 'Moderate', sub: 'training 3–5×' },
  { value: 'active', label: 'Active', sub: 'training 6–7×' },
  { value: 'very_active', label: 'Very active', sub: 'physical job · 2-a-days' },
];

const DEFICIT_OPTIONS: ReadonlyArray<{ value: DeficitMode; label: string; sub: string }> = [
  { value: 'cut', label: 'Cut', sub: '−2,000 kJ' },
  { value: 'maintain', label: 'Maintain', sub: '0 kJ' },
  { value: 'bulk', label: 'Bulk', sub: '+1,500 kJ' },
];

function inRange(n: number, lo: number, hi: number): boolean {
  return Number.isFinite(n) && n >= lo && n <= hi;
}

export default function Onboarding(): React.ReactElement {
  const { t } = useTheme();
  const existing = useProfile((s) => s.profile);
  const setProfile = useProfile((s) => s.setProfile);
  const isEdit = existing !== null;

  const [weightKg, setWeightKg] = useState<string>(existing ? String(existing.weight_kg) : '');
  const [targetKg, setTargetKg] = useState<string>(existing ? String(existing.target_weight_kg) : '');
  const [heightCm, setHeightCm] = useState<string>(existing ? String(existing.height_cm) : '');
  const [age, setAge] = useState<string>(existing ? String(existing.age) : '');
  const [sex, setSex] = useState<Sex>(existing?.sex ?? 'male');
  const [activity, setActivity] = useState<ActivityLevel>(existing?.activity_level ?? 'moderate');
  const [deficit, setDeficit] = useState<DeficitMode>(existing?.deficit_mode ?? 'cut');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wNum = Number(weightKg);
  const tNum = Number(targetKg);
  const hNum = Number(heightCm);
  const aNum = Number(age);

  const valid =
    inRange(wNum, 30, 300) &&
    inRange(tNum, 30, 300) &&
    inRange(hNum, 80, 250) &&
    inRange(aNum, 5, 120);

  const preview = useMemo(() => {
    if (!valid) return null;
    const bmrV = bmrKJ({ sex, weight_kg: wNum, height_cm: hNum, age: aNum });
    const tdeeV = tdeeKJ({ bmr_kj: bmrV, activity_level: activity });
    const goalV = dailyGoalKJ({ tdee_kj: tdeeV, deficit_mode: deficit });
    const bmiV = bmi({ weight_kg: wNum, height_cm: hNum });
    return { bmr: bmrV, tdee: tdeeV, goal: goalV, bmi: bmiV, cat: bmiCategory(bmiV) };
  }, [valid, sex, wNum, hNum, aNum, activity, deficit]);

  const onSubmit = async (): Promise<void> => {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      const now = Date.now();
      const next: Profile = {
        weight_kg: wNum,
        target_weight_kg: tNum,
        height_cm: hNum,
        age: aNum,
        sex,
        activity_level: activity,
        deficit_mode: deficit,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      await setProfile(next);
      if (isEdit) router.back();
      else router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="micro" tone="muted">ANTICHUD · ONBOARDING</Text>
      <Text variant="display" style={styles.headline}>
        Begin the table.
      </Text>
      <Text variant="bodySm" tone="muted" style={styles.lede}>
        Antichud measures, it doesn{'’'}t motivate. Calibrate the instrument.
      </Text>
      <Hairline style={styles.dividerTop} />

      <Section label="01 — Body">
        <Field
          label="Current weight"
          unit="kg"
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="72"
        />
        <Field
          label="Target weight"
          unit="kg"
          value={targetKg}
          onChangeText={setTargetKg}
          placeholder="68"
        />
        <Field
          label="Height"
          unit="cm"
          value={heightCm}
          onChangeText={setHeightCm}
          placeholder="178"
        />
        <Field
          label="Age"
          unit="yrs"
          value={age}
          onChangeText={setAge}
          placeholder="30"
        />
      </Section>

      <Section label="02 — Sex">
        <Segment
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]}
          value={sex}
          onChange={setSex}
        />
      </Section>

      <Section label="03 — Activity level">
        <View style={styles.activityCol}>
          {ACTIVITY_OPTIONS.map((opt) => {
            const active = activity === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setActivity(opt.value)}
                style={[
                  styles.activityRow,
                  {
                    borderColor: active ? t.ember : t.rule,
                    borderWidth: active ? borders.accent : borders.hairline,
                    backgroundColor: active ? t.emberSoft : 'transparent',
                  },
                ]}
              >
                <View style={styles.activityRowText}>
                  <Text variant="label" tone={active ? 'accent' : 'primary'}>
                    {opt.label}
                  </Text>
                  <Text variant="bodySm" tone="muted">
                    {opt.sub}
                  </Text>
                </View>
                <Text variant="monoSm" tone="muted">
                  {`×${ACTIVITY_MULT[opt.value]}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section label="04 — Deficit mode">
        <Segment
          options={DEFICIT_OPTIONS.map((o) => ({ value: o.value, label: `${o.label}\n${o.sub}` }))}
          value={deficit}
          onChange={setDeficit}
          tall
        />
      </Section>

      <Section label="05 — Preview">
        <Card variant="outlined">
          {preview ? (
            <>
              <View style={styles.previewRow}>
                <Text variant="micro" tone="muted">DAILY GOAL</Text>
                <KJReadout
                  kj={preview.goal}
                  size="md"
                  underline={false}
                  align="right"
                />
              </View>
              <Hairline style={styles.previewRule} />
              <PreviewLine label="BMR" value={`${preview.bmr.toLocaleString('en-US')} kJ`} />
              <PreviewLine label="TDEE" value={`${preview.tdee.toLocaleString('en-US')} kJ`} />
              <PreviewLine label="BMI" value={`${preview.bmi.toFixed(1)}  ·  ${preview.cat}`} />
            </>
          ) : (
            <Text variant="bodySm" tone="muted">
              Fill in body, sex, activity & mode to see the readout.
            </Text>
          )}
        </Card>
      </Section>

      {error ? (
        <Card variant="outlined" style={styles.errorCard}>
          <Text variant="bodySm" tone="accent">{error}</Text>
        </Card>
      ) : null}

      <View style={styles.submitRow}>
        <Button
          label={isEdit ? 'Save profile' : 'Begin tracking'}
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={!valid}
          onPress={onSubmit}
          fullWidth
        />
      </View>

    </Screen>
  );
}

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function Section({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <View style={styles.section}>
      <Text variant="micro" tone="muted">{label}</Text>
      <Hairline style={styles.sectionRule} />
      {children}
    </View>
  );
}

function Field({
  label,
  unit,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  unit: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
}): React.ReactElement {
  const { t } = useTheme();
  return (
    <View style={styles.fieldRow}>
      <Text variant="label" style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldInputWrap, { borderColor: t.rule }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.inkSoft}
          keyboardType="decimal-pad"
          style={[
            type.mono,
            styles.fieldInput,
            { color: t.ink },
          ]}
        />
        <Text variant="monoSm" tone="muted">{unit}</Text>
      </View>
    </View>
  );
}

function Segment<V extends string>({
  options,
  value,
  onChange,
  tall,
}: {
  options: ReadonlyArray<{ value: V; label: string }>;
  value: V;
  onChange: (v: V) => void;
  tall?: boolean;
}): React.ReactElement {
  const { t } = useTheme();
  return (
    <View style={styles.segmentRow}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segmentItem,
              tall && styles.segmentItemTall,
              {
                borderColor: active ? t.ember : t.rule,
                borderWidth: active ? borders.accent : borders.hairline,
                backgroundColor: active ? t.ember : 'transparent',
              },
            ]}
          >
            <Text
              variant="bodySm"
              tone={active ? 'inverse' : 'primary'}
              align="center"
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.previewLine}>
      <Text variant="micro" tone="muted">{label}</Text>
      <Text variant="mono">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    marginTop: space.xs,
  },
  lede: {
    marginTop: space.sm,
    marginBottom: space.lg,
  },
  dividerTop: {
    marginBottom: space.xl,
  },
  section: {
    marginBottom: space.xl,
  },
  sectionRule: {
    marginTop: space.xs,
    marginBottom: space.base,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  fieldLabel: {
    flex: 1,
  },
  fieldInputWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderBottomWidth: borders.thin,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    minWidth: 110,
    justifyContent: 'flex-end',
    gap: space.xs,
  },
  fieldInput: {
    fontFamily: fonts.monoMedium,
    fontSize: fontSize.label,
    lineHeight: fontSize.label * lineHeight.mono,
    minWidth: 70,
    textAlign: 'right',
    paddingVertical: 0,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemTall: {
    minHeight: 64,
  },
  activityCol: {
    gap: space.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
    paddingHorizontal: space.base,
    borderRadius: radii.xs,
  },
  activityRowText: {
    flex: 1,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewRule: {
    marginVertical: space.md,
  },
  previewLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
  },
  errorCard: {
    marginBottom: space.base,
  },
  submitRow: {
    marginTop: space.sm,
    marginBottom: space.xl,
  },
});
