/**
 * MacrosBar — horizontal stacked bar showing today's protein / carbs / fat split.
 * Editorial / scientific feel: hairline tick marks under labeled gram totals.
 * Tabular figures so the numbers align in a column.
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from './Text';
import { Hairline } from './Hairline';
import { useTheme } from '@/styles/theme';
import { borders, motion, space } from '@/styles/tokens';
import type { Macros } from '@/types';

export type MacrosBarProps = {
  macros: Macros;
  goalKJ?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const KJ_PER_G_PROTEIN = 17;
const KJ_PER_G_CARBS = 17;
const KJ_PER_G_FAT = 37;

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, part / total));
}

export function MacrosBar({ macros, style, testID }: MacrosBarProps): React.ReactElement {
  const { t } = useTheme();
  const { protein_g, carbs_g, fat_g, fiber_g } = macros;
  const proteinKJ = protein_g * KJ_PER_G_PROTEIN;
  const carbsKJ = carbs_g * KJ_PER_G_CARBS;
  const fatKJ = fat_g * KJ_PER_G_FAT;
  const totalKJ = proteinKJ + carbsKJ + fatKJ;

  const pP = pct(proteinKJ, totalKJ);
  const pC = pct(carbsKJ, totalKJ);
  const pF = pct(fatKJ, totalKJ);

  const flexP = useSharedValue(0);
  const flexC = useSharedValue(0);
  const flexF = useSharedValue(0);

  React.useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    flexP.value = withTiming(pP, { duration: motion.tapeDurationMs, easing });
    flexC.value = withTiming(pC, { duration: motion.tapeDurationMs, easing });
    flexF.value = withTiming(pF, { duration: motion.tapeDurationMs, easing });
  }, [pP, pC, pF, flexP, flexC, flexF]);

  const styleP = useAnimatedStyle(() => ({ flex: Math.max(flexP.value, 0.0001) }));
  const styleC = useAnimatedStyle(() => ({ flex: Math.max(flexC.value, 0.0001) }));
  const styleF = useAnimatedStyle(() => ({ flex: Math.max(flexF.value, 0.0001) }));

  if (totalKJ === 0) {
    return (
      <View testID={testID} style={[styles.container, style]}>
        <Text variant="micro" tone="muted">MACROS</Text>
        <Hairline style={styles.rule} />
        <Text variant="bodySm" tone="muted">No macros logged today.</Text>
      </View>
    );
  }

  return (
    <View testID={testID} style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Text variant="micro" tone="muted">MACROS</Text>
        <Text variant="monoSm" tone="muted">
          {`P/C/F  ·  ${Math.round(pP * 100)}/${Math.round(pC * 100)}/${Math.round(pF * 100)}%`}
        </Text>
      </View>
      <Hairline style={styles.rule} />

      <View style={[styles.bar, { borderColor: t.rule }]}>
        <Animated.View style={[styles.seg, { backgroundColor: t.ember }, styleP]} />
        <Animated.View style={[styles.seg, { backgroundColor: t.ink }, styleC]} />
        <Animated.View style={[styles.seg, { backgroundColor: t.signal }, styleF]} />
      </View>

      <View style={styles.legendRow}>
        <Legend swatchColor={t.ember} label="PROTEIN" grams={protein_g} kj={proteinKJ} />
        <Legend swatchColor={t.ink} label="CARBS" grams={carbs_g} kj={carbsKJ} />
        <Legend swatchColor={t.signal} label="FAT" grams={fat_g} kj={fatKJ} />
      </View>

      {fiber_g && fiber_g > 0 ? (
        <Text variant="micro" tone="muted" style={styles.fiber}>
          {`FIBER · ${fiber_g} g`}
        </Text>
      ) : null}
    </View>
  );
}

function Legend({
  swatchColor,
  label,
  grams,
  kj,
}: {
  swatchColor: string;
  label: string;
  grams: number;
  kj: number;
}): React.ReactElement {
  const { t } = useTheme();
  return (
    <View style={styles.legendCell}>
      <View style={styles.legendTop}>
        <View style={[styles.swatch, { backgroundColor: swatchColor }]} />
        <Text variant="micro" tone="muted">{label}</Text>
      </View>
      <Text variant="mono" style={[styles.legendGrams, { color: t.ink }]}>
        {`${grams} g`}
      </Text>
      <Text variant="monoSm" tone="muted">
        {`${kj.toLocaleString('en-US')} kJ`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  rule: {
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  bar: {
    flexDirection: 'row',
    height: 14,
    borderWidth: borders.hairline,
    overflow: 'hidden',
  },
  seg: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    marginTop: space.sm,
    gap: space.md,
  },
  legendCell: {
    flex: 1,
  },
  legendTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginBottom: space.xs,
  },
  swatch: {
    width: 8,
    height: 8,
  },
  legendGrams: {
    marginBottom: 2,
  },
  fiber: {
    marginTop: space.sm,
  },
});

export default MacrosBar;
