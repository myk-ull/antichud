import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  Button,
  Card,
  Hairline,
  Pressable,
  Screen,
  Tag,
  Text,
  WeightTrendChart,
  cardEntry,
} from '@/components';
import { useTheme } from '@/styles/theme';
import { borders, fonts, fontSize, lineHeight, radii, space } from '@/styles/tokens';
import { type } from '@/styles/typography';
import { bmi as bmiCalc, bmiCategory } from '@/lib/calc';
import {
  selectLatestWeight,
  useProfile,
  useWeight,
} from '@/lib/state';
import type { WeightEntry } from '@/types';

const TREND_DAYS = 90;
const DISMISS_BAR_ID = 'antichud-weight-dismiss';

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function WeightScreen(): React.ReactElement {
  const { t } = useTheme();
  const profile = useProfile((s) => s.profile);
  const entries = useWeight((s) => s.entries);
  const addEntry = useWeight((s) => s.addEntry);
  const removeEntry = useWeight((s) => s.removeEntry);
  const latest = useWeight(selectLatestWeight);
  const trend = useMemo<ReadonlyArray<WeightEntry>>(() => {
    const cutoff = Date.now() - TREND_DAYS * 86_400_000;
    return entries
      .filter((e) => e.timestamp >= cutoff)
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [entries]);

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sortedDesc = useMemo<ReadonlyArray<WeightEntry>>(
    () => [...entries].sort((a, b) => b.timestamp - a.timestamp),
    [entries],
  );

  const onAdd = async (): Promise<void> => {
    const num = Number(input);
    if (!Number.isFinite(num) || num < 20 || num > 400) {
      setError('Enter a weight between 20 and 400 kg.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addEntry({ id: newId(), timestamp: Date.now(), weight_kg: num });
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save weight.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string): Promise<void> => {
    try {
      await removeEntry(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete weight.');
    }
  };

  // BMI badge based on latest weight + profile height
  let bmiTag: { value: number; cat: string; tone: 'good' | 'warn' } | null = null;
  if (latest !== null && profile) {
    const bmiVal = bmiCalc({ weight_kg: latest, height_cm: profile.height_cm });
    const cat = bmiCategory(bmiVal);
    bmiTag = {
      value: bmiVal,
      cat,
      tone: cat === 'normal' ? 'good' : 'warn',
    };
  }

  const targetKg = profile?.target_weight_kg ?? null;

  return (
    <Screen scroll>
      <Text variant="micro" tone="muted">MASS · KG</Text>
      <Text variant="display" style={styles.headline}>weight.</Text>
      <Hairline style={styles.headlineRule} />

      <Card variant="recessed" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text variant="micro" tone="muted">CURRENT</Text>
            <Text style={[type.hero, styles.heroNum, { color: t.ink }]}>
              {latest !== null ? latest.toFixed(1) : '—'}
            </Text>
            <Text variant="displayItalic" tone="muted">kg</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text variant="micro" tone="muted">TARGET</Text>
            <Text variant="mono" style={styles.targetNum}>
              {targetKg !== null ? `${targetKg.toFixed(1)} kg` : '—'}
            </Text>
            {latest !== null && targetKg !== null ? (
              <Text variant="bodySm" tone="muted">
                {`${(latest - targetKg).toFixed(1)} kg to go`}
              </Text>
            ) : null}
          </View>
        </View>

        {bmiTag ? (
          <View style={styles.bmiRow}>
            <Tag
              label={`BMI ${bmiTag.value.toFixed(1)} · ${bmiTag.cat.toUpperCase()}`}
              tone={bmiTag.tone}
              size="md"
            />
          </View>
        ) : null}
      </Card>

      <Animated.View style={styles.chartCard} entering={cardEntry(0)}>
        <WeightTrendChart
          data={trend}
          targetKg={targetKg ?? undefined}
          daysShown={TREND_DAYS}
        />
      </Animated.View>

      <Card variant="outlined" style={styles.formCard}>
        <Text variant="micro" tone="muted">RECORD WEIGHT</Text>
        <View style={styles.formRow}>
          <TextInput
            value={input}
            onChangeText={(s) => {
              setInput(s);
              if (error) setError(null);
            }}
            placeholder="0.0"
            placeholderTextColor={t.inkSoft}
            keyboardType="decimal-pad"
            inputAccessoryViewID={DISMISS_BAR_ID}
            returnKeyType="done"
            onSubmitEditing={() => void onAdd()}
            style={[
              styles.formInput,
              { color: t.ink, borderColor: t.rule },
            ]}
          />
          <Text variant="displayItalic" tone="muted">kg</Text>
          <View style={styles.formButton}>
            <Button
              label="Record"
              variant="primary"
              loading={submitting}
              onPress={onAdd}
            />
          </View>
        </View>
        {error ? (
          <Text variant="bodySm" tone="accent" style={styles.formError}>{error}</Text>
        ) : null}
      </Card>

      <View style={styles.listHeader}>
        <Text variant="micro" tone="muted">ENTRIES</Text>
        <Text variant="monoSm" tone="muted">{`${entries.length} total`}</Text>
      </View>
      <Hairline style={styles.listRule} />

      {sortedDesc.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text variant="bodySm" tone="muted" align="center">
            No weights recorded yet.
          </Text>
        </View>
      ) : (
        sortedDesc.map((e, idx) => (
          <Animated.View key={e.id} entering={cardEntry(idx)}>
            <Card variant="recessed" style={styles.entryCard}>
              <View style={styles.entryRow}>
                <View>
                  <Text variant="label">{`${e.weight_kg.toFixed(1)} kg`}</Text>
                  <Text variant="bodySm" tone="muted">{formatDay(e.timestamp)}</Text>
                </View>
                <Pressable onPress={() => void onDelete(e.id)}>
                  <Text variant="micro" tone="accent">REMOVE</Text>
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        ))
      )}

    </Screen>
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
  summaryCard: {
    marginBottom: space.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.lg,
  },
  summaryCol: {
    flex: 1,
  },
  heroNum: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.display,
    lineHeight: fontSize.display * lineHeight.mono,
    marginTop: space.xs,
  },
  targetNum: {
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  bmiRow: {
    marginTop: space.base,
  },
  chartCard: {
    marginBottom: space.lg,
  },
  formCard: {
    marginBottom: space.lg,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
    marginTop: space.sm,
  },
  formInput: {
    flex: 1,
    fontFamily: fonts.monoBold,
    fontSize: fontSize.headline,
    lineHeight: fontSize.headline * lineHeight.mono,
    borderBottomWidth: borders.thin,
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
  },
  formButton: {
    marginLeft: space.sm,
  },
  formError: {
    marginTop: space.sm,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: space.md,
  },
  listRule: {
    marginTop: space.xs,
    marginBottom: space.md,
  },
  emptyBlock: {
    paddingVertical: space.xl,
  },
  entryCard: {
    marginBottom: space.sm,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
