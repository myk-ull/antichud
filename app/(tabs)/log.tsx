import React, { useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { endOfDay, startOfDay } from 'date-fns';

import {
  Button,
  Card,
  Hairline,
  Pressable,
  Screen,
  Tag,
  Text,
  cardEntry,
} from '@/components';
import { useTheme } from '@/styles/theme';
import { borders, fonts, fontSize, lineHeight, radii, space } from '@/styles/tokens';
import { type } from '@/styles/typography';
import { estimateFoodKJ, type EstimateResult, type EstimateUserContext } from '@/lib/openrouter';
import {
  evaluateThreshold,
  fireOneShot,
  recordThresholdFired,
} from '@/lib/notifications';
import { selectDailyGoalKJ, useLog, useProfile, useSettings } from '@/lib/state';
import type { Confidence, FoodEntry, FoodEntryItem, Macros } from '@/types';

type Captured = {
  base64: string;
  uri: string;
  mimeType: string;
};

type EditableEstimate = {
  name: string;
  kj: string;
  confidence: Confidence;
  items: ReadonlyArray<FoodEntryItem>;
  macros?: Macros;
  macros_check?: 'ok' | 'disagree' | 'unknown';
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'HIGH CONFIDENCE',
  med: 'MEDIUM CONFIDENCE',
  low: 'LOW CONFIDENCE',
};

const MIME_DEFAULT = 'image/jpeg';

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function pickerMime(asset: ImagePicker.ImagePickerAsset): string {
  const t = asset.mimeType ?? '';
  if (t.length > 0) return t;
  const uri = asset.uri.toLowerCase();
  if (uri.endsWith('.png')) return 'image/png';
  if (uri.endsWith('.webp')) return 'image/webp';
  return MIME_DEFAULT;
}

function MacroChip({ label, grams }: { label: string; grams: number }): React.ReactElement {
  const { t } = useTheme();
  return (
    <View style={[macroChipStyles.chip, { borderColor: t.rule }]}>
      <Text variant="micro" tone="muted">{label}</Text>
      <Text variant="monoSm" style={{ color: t.ink }}>{`${grams}g`}</Text>
    </View>
  );
}

const macroChipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
});

const DISMISS_BAR_ID = 'antichud-log-dismiss';

export default function LogScreen(): React.ReactElement {
  const { t } = useTheme();
  const allEntries = useLog((s) => s.entries);
  const addEntry = useLog((s) => s.addEntry);
  const removeEntry = useLog((s) => s.removeEntry);
  const profile = useProfile((s) => s.profile);
  const dailyGoalKJ = useProfile(selectDailyGoalKJ);
  const settings = useSettings((s) => s.settings);
  const patchSettings = useSettings((s) => s.patch);

  const todayEntries = useMemo(() => {
    const start = startOfDay(new Date()).getTime();
    const end = endOfDay(new Date()).getTime();
    return allEntries.filter((e) => e.timestamp >= start && e.timestamp <= end);
  }, [allEntries]);

  const [captured, setCaptured] = useState<Captured | null>(null);
  const [description, setDescription] = useState('');
  const [portion, setPortion] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<EditableEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sortedToday = useMemo<ReadonlyArray<FoodEntry>>(
    () => [...todayEntries].sort((a, b) => b.timestamp - a.timestamp),
    [todayEntries],
  );

  const consumedTodayKJ = useMemo(
    () => todayEntries.reduce((sum, e) => sum + e.kj, 0),
    [todayEntries],
  );

  const userContext = useMemo<EstimateUserContext | undefined>(() => {
    if (!profile) return undefined;
    return {
      weight_kg: profile.weight_kg,
      target_weight_kg: profile.target_weight_kg,
      age: profile.age,
      sex: profile.sex,
      activity_level: profile.activity_level,
      daily_goal_kj: dailyGoalKJ ?? undefined,
      consumed_today_kj: consumedTodayKJ,
    };
  }, [profile, dailyGoalKJ, consumedTodayKJ]);

  const reset = (): void => {
    setCaptured(null);
    setDescription('');
    setPortion('');
    setEstimate(null);
    setError(null);
  };

  const handleAsset = (asset: ImagePicker.ImagePickerAsset | undefined): void => {
    if (!asset || !asset.base64) {
      setError('Could not read the photo. Try again.');
      return;
    }
    setError(null);
    setEstimate(null);
    setCaptured({
      base64: asset.base64,
      uri: asset.uri,
      mimeType: pickerMime(asset),
    });
  };

  const onTakePhoto = async (): Promise<void> => {
    setError(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Camera permission denied. Enable it in Settings.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        allowsEditing: false,
        quality: 0.6,
      });
      if (!result.canceled) handleAsset(result.assets[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera failed.');
    }
  };

  const onPickPhoto = async (): Promise<void> => {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        base64: true,
        allowsEditing: false,
        quality: 0.6,
      });
      if (!result.canceled) handleAsset(result.assets[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open photo library.');
    }
  };

  const onEstimate = async (): Promise<void> => {
    if (!captured) return;
    setEstimating(true);
    setError(null);
    try {
      const result: EstimateResult = await estimateFoodKJ({
        imageBase64: captured.base64,
        mimeType: captured.mimeType,
        description: description.trim() || undefined,
        portion: portion.trim() || undefined,
        userContext,
      });
      setEstimate({
        name: result.name,
        kj: String(result.kj),
        confidence: result.confidence,
        macros_check: result.macros_check,
        items: result.items,
        macros: result.macros,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Estimate failed.');
    } finally {
      setEstimating(false);
    }
  };

  const onSave = async (): Promise<void> => {
    if (!captured || !estimate) return;
    const kjNum = Math.max(0, Math.round(Number(estimate.kj) || 0));
    const name = estimate.name.trim() || 'Untitled meal';
    setSaving(true);
    setError(null);
    try {
      const entry: FoodEntry = {
        id: newId(),
        timestamp: Date.now(),
        name,
        kj: kjNum,
        macros: estimate.macros,
        photo_uri: captured.uri,
        confidence: estimate.confidence,
        items: estimate.items,
        ai_meta: {
          model: process.env.EXPO_PUBLIC_OPENROUTER_MODEL ?? 'google/gemini-3-flash-preview',
          raw: JSON.stringify({
            name,
            kj: kjNum,
            confidence: estimate.confidence,
            items: estimate.items,
          }),
          prompt_hint:
            [description.trim(), portion.trim()].filter((s) => s.length > 0).join(' · ') ||
            undefined,
        },
      };
      await addEntry(entry);
      // After saving, evaluate threshold notifications (approach / reached /
      // over / far_over). Fire once per band per day, in the user's voice.
      if (settings.reminders_enabled && (dailyGoalKJ ?? 0) > 0) {
        try {
          const consumedAfter = consumedTodayKJ + kjNum;
          const result = evaluateThreshold({
            consumedKJ: consumedAfter,
            goalKJ: dailyGoalKJ ?? 0,
            voice: settings.voice,
            thresholdsFired: settings.thresholds_fired,
          });
          if (result) {
            const fired = await fireOneShot(result.copy.title, result.copy.body);
            if (fired) {
              await patchSettings({
                thresholds_fired: recordThresholdFired(
                  settings.thresholds_fired,
                  result.band,
                ),
              });
            }
          }
        } catch {
          // Threshold notifications are best-effort; never block the save flow.
        }
      }
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save entry.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string): Promise<void> => {
    try {
      await removeEntry(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete entry.');
    }
  };

  const showCamera = Platform.OS !== 'web';
  const todayKJ = sortedToday.reduce((sum, e) => sum + e.kj, 0);

  return (
    <Screen scroll>
      <Text variant="micro" tone="muted">FIELD NOTES · TODAY</Text>
      <Text variant="display" style={styles.headline}>log.</Text>
      <Hairline style={styles.headlineRule} />

      <View style={styles.pickerRow}>
        {showCamera ? (
          <Button label="Take photo" variant="primary" onPress={onTakePhoto} fullWidth />
        ) : null}
        <Button
          label="Pick photo"
          variant={showCamera ? 'secondary' : 'primary'}
          onPress={onPickPhoto}
          fullWidth
        />
      </View>

      {error ? (
        <Card variant="outlined" style={styles.errorCard}>
          <Text variant="bodySm" tone="accent">{error}</Text>
          <View style={styles.dismissRow}>
            <Button label="Dismiss" variant="ghost" size="sm" onPress={() => setError(null)} />
          </View>
        </Card>
      ) : null}

      {captured ? (
        <Card variant="recessed" style={styles.confirmCard}>
          <Text variant="micro" tone="muted">CAPTURED</Text>
          <View style={[styles.previewWrap, { borderColor: t.rule }]}>
            <Image
              source={{ uri: captured.uri }}
              style={styles.preview}
              resizeMode="cover"
            />
          </View>

          {!estimate ? (
            <>
              <Text variant="micro" tone="muted" style={styles.fieldEyebrow}>
                DESCRIPTION (OPTIONAL)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. oat porridge with banana and almond butter"
                placeholderTextColor={t.inkSoft}
                multiline
                inputAccessoryViewID={DISMISS_BAR_ID}
                style={[
                  type.body,
                  styles.hintInput,
                  { color: t.ink, borderColor: t.rule },
                ]}
              />

              <Text variant="micro" tone="muted" style={styles.fieldEyebrow}>
                PORTION (OPTIONAL)
              </Text>
              <TextInput
                value={portion}
                onChangeText={setPortion}
                placeholder="e.g. half my usual bowl, ~120 g"
                placeholderTextColor={t.inkSoft}
                inputAccessoryViewID={DISMISS_BAR_ID}
                returnKeyType="done"
                style={[
                  type.body,
                  styles.portionInput,
                  { color: t.ink, borderColor: t.rule },
                ]}
              />

              {profile ? (
                <View style={styles.contextHint}>
                  <Text variant="micro" tone="muted">
                    {`USING YOUR CONTEXT · ${profile.weight_kg} kg, goal ${(dailyGoalKJ ?? 0).toLocaleString('en-US')} kJ, ${consumedTodayKJ.toLocaleString('en-US')} kJ already today.`}
                  </Text>
                </View>
              ) : null}

              <View style={styles.confirmActions}>
                <Button
                  label="Estimate kJ"
                  variant="primary"
                  size="lg"
                  loading={estimating}
                  onPress={onEstimate}
                  fullWidth
                />
                <Button label="Cancel" variant="ghost" onPress={reset} />
              </View>
            </>
          ) : (
            <>
              <Text variant="micro" tone="muted" style={styles.fieldEyebrow}>NAME</Text>
              <TextInput
                value={estimate.name}
                onChangeText={(name) => setEstimate({ ...estimate, name })}
                inputAccessoryViewID={DISMISS_BAR_ID}
                returnKeyType="done"
                style={[type.label, styles.nameInput, { color: t.ink, borderColor: t.rule }]}
              />

              <View style={styles.kjEditRow}>
                <View style={styles.kjEditCol}>
                  <Text variant="micro" tone="muted">KILOJOULES</Text>
                  <TextInput
                    value={estimate.kj}
                    onChangeText={(kj) => setEstimate({ ...estimate, kj })}
                    keyboardType="number-pad"
                    inputAccessoryViewID={DISMISS_BAR_ID}
                    style={[
                      styles.kjInput,
                      { color: t.ink, borderColor: t.rule },
                    ]}
                  />
                </View>
                <View style={styles.tagsCol}>
                  <Tag
                    label={CONFIDENCE_LABEL[estimate.confidence]}
                    tone={estimate.confidence === 'high' ? 'good' : estimate.confidence === 'low' ? 'warn' : 'neutral'}
                  />
                  {estimate.macros_check === 'disagree' ? (
                    <Tag label="MACROS DISAGREE" tone="bad" size="sm" />
                  ) : null}
                </View>
              </View>

              {estimate.macros_check === 'disagree' ? (
                <Text variant="bodySm" tone="muted" style={styles.macroNote}>
                  Macros and total kJ disagree by &gt; 20%. Verify before saving.
                </Text>
              ) : null}

              {estimate.items.length > 0 ? (
                <View style={styles.itemsBlock}>
                  <Text variant="micro" tone="muted">BREAKDOWN</Text>
                  <Hairline style={styles.itemsRule} />
                  {estimate.items.map((it, idx) => (
                    <View key={`${idx}-${it.name}`} style={styles.itemLine}>
                      <Text variant="body" numberOfLines={1} style={styles.itemName}>
                        {it.name}
                        {typeof it.qty === 'number' ? ` · ×${it.qty}` : ''}
                      </Text>
                      <Text variant="mono">{`${it.kj.toLocaleString('en-US')} kJ`}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.confirmActions}>
                <Button
                  label="Save entry"
                  variant="primary"
                  size="lg"
                  loading={saving}
                  onPress={onSave}
                  fullWidth
                />
                <Button label="Discard" variant="ghost" onPress={reset} />
              </View>
            </>
          )}
        </Card>
      ) : null}

      <View style={styles.listHeader}>
        <Text variant="micro" tone="muted">TODAY · LEDGER</Text>
        <Text variant="monoSm" tone="muted">{`${todayKJ.toLocaleString('en-US')} kJ`}</Text>
      </View>
      <Hairline style={styles.listRule} />

      {sortedToday.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text variant="bodySm" tone="muted" align="center">
            No entries yet.
          </Text>
        </View>
      ) : (
        sortedToday.map((entry, idx) => (
          <Animated.View key={entry.id} entering={cardEntry(idx)}>
          <Card variant="recessed" style={styles.entryCard}>
            <View style={styles.entryHead}>
              <View style={styles.entryHeadLeft}>
                <Text variant="label" numberOfLines={1}>{entry.name}</Text>
                <Text variant="bodySm" tone="muted">{formatTime(entry.timestamp)}</Text>
              </View>
              <View style={styles.entryHeadRight}>
                <Text variant="mono">{`${entry.kj.toLocaleString('en-US')} kJ`}</Text>
                {entry.confidence ? (
                  <Tag
                    label={CONFIDENCE_LABEL[entry.confidence]}
                    tone={entry.confidence === 'high' ? 'good' : entry.confidence === 'low' ? 'warn' : 'neutral'}
                  />
                ) : null}
              </View>
            </View>

            {entry.photo_uri ? (
              <View style={[styles.entryThumbWrap, { borderColor: t.rule }]}>
                <Image
                  source={{ uri: entry.photo_uri }}
                  style={styles.entryThumb}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            {entry.items && entry.items.length > 0 ? (
              <View style={styles.entryItems}>
                {entry.items.map((it, idx) => (
                  <View key={`${idx}-${it.name}`} style={styles.itemLine}>
                    <Text variant="bodySm" tone="muted" numberOfLines={1} style={styles.itemName}>
                      {it.name}
                      {typeof it.qty === 'number' ? ` · ×${it.qty}` : ''}
                    </Text>
                    <Text variant="monoSm" tone="muted">{`${it.kj.toLocaleString('en-US')} kJ`}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {entry.macros ? (
              <View style={styles.entryMacros}>
                <Text variant="micro" tone="muted">MACROS</Text>
                <View style={styles.macroRow}>
                  <MacroChip label="P" grams={entry.macros.protein_g} />
                  <MacroChip label="C" grams={entry.macros.carbs_g} />
                  <MacroChip label="F" grams={entry.macros.fat_g} />
                  {entry.macros.fiber_g && entry.macros.fiber_g > 0 ? (
                    <MacroChip label="FIB" grams={entry.macros.fiber_g} />
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={styles.entryFoot}>
              <Pressable onPress={() => void onDelete(entry.id)}>
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
  pickerRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.lg,
  },
  errorCard: {
    marginBottom: space.lg,
  },
  dismissRow: {
    marginTop: space.sm,
    alignSelf: 'flex-start',
  },
  confirmCard: {
    marginBottom: space.xl,
  },
  previewWrap: {
    marginTop: space.sm,
    marginBottom: space.base,
    borderWidth: borders.hairline,
    overflow: 'hidden',
    borderRadius: radii.xs,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  entryMacros: {
    marginTop: space.sm,
  },
  macroRow: {
    flexDirection: 'row',
    gap: space.xs,
    marginTop: space.xs,
    flexWrap: 'wrap',
  },
  fieldEyebrow: {
    marginBottom: space.xs,
  },
  hintInput: {
    minHeight: 64,
    borderWidth: borders.hairline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.xs,
    marginBottom: space.base,
  },
  portionInput: {
    borderWidth: borders.hairline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.xs,
    marginBottom: space.sm,
  },
  contextHint: {
    marginBottom: space.base,
  },
  tagsCol: {
    alignItems: 'flex-end',
    gap: space.xs,
  },
  macroNote: {
    marginTop: -space.xs,
    marginBottom: space.base,
  },
  nameInput: {
    borderWidth: borders.hairline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.xs,
    marginBottom: space.base,
  },
  kjEditRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: space.base,
    gap: space.md,
  },
  kjEditCol: {
    flex: 1,
  },
  kjInput: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.headline,
    lineHeight: fontSize.headline * lineHeight.mono,
    borderBottomWidth: borders.accent,
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
    marginTop: space.xs,
  },
  itemsBlock: {
    marginBottom: space.base,
  },
  itemsRule: {
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  itemLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
  },
  itemName: {
    flex: 1,
    paddingRight: space.md,
  },
  confirmActions: {
    gap: space.sm,
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
  entryHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  entryHeadLeft: {
    flex: 1,
    paddingRight: space.md,
  },
  entryHeadRight: {
    alignItems: 'flex-end',
    gap: space.xs,
  },
  entryThumbWrap: {
    marginTop: space.md,
    borderWidth: borders.hairline,
    overflow: 'hidden',
    borderRadius: radii.xs,
  },
  entryThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  entryItems: {
    marginTop: space.sm,
  },
  entryFoot: {
    marginTop: space.md,
    alignSelf: 'flex-start',
  },
});
