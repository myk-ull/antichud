/**
 * WeightTrendChart — polished line+area chart of weight entries over time.
 * Uses react-native-gifted-charts. Editorial aesthetic:
 * paper-deep frame, ember curve, soft ember area, dashed target reference.
 */
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { Text } from './Text';
import { Hairline } from './Hairline';
import { useTheme } from '@/styles/theme';
import { borders, fonts, space } from '@/styles/tokens';
import type { WeightEntry } from '@/types';

export type WeightTrendChartProps = {
  data: ReadonlyArray<WeightEntry>;
  targetKg?: number;
  height?: number;
  daysShown?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const POINT_LABEL_EVERY = 4;

function shortDay(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function WeightTrendChart({
  data,
  targetKg,
  height = 180,
  daysShown,
  style,
  testID,
}: WeightTrendChartProps): React.ReactElement {
  const { t } = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent): void => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  const sorted = useMemo(
    () => [...data].sort((a, b) => a.timestamp - b.timestamp),
    [data],
  );

  const { minW, maxW, points } = useMemo(() => {
    if (sorted.length === 0) {
      return { minW: 0, maxW: 0, points: [] as Array<{ value: number; label?: string; ts: number }> };
    }
    const ws = sorted.map((e) => e.weight_kg);
    let lo = Math.min(...ws);
    let hi = Math.max(...ws);
    if (typeof targetKg === 'number') {
      lo = Math.min(lo, targetKg);
      hi = Math.max(hi, targetKg);
    }
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    // Pad axis a touch so endpoints don't kiss the frame
    const pad = (hi - lo) * 0.08;
    lo -= pad;
    hi += pad;
    const labelStride = Math.max(1, Math.floor(sorted.length / POINT_LABEL_EVERY));
    const pts = sorted.map((e, i) => {
      const showLabel = i === 0 || i === sorted.length - 1 || i % labelStride === 0;
      return {
        value: e.weight_kg,
        ts: e.timestamp,
        label: showLabel ? shortDay(e.timestamp) : undefined,
      };
    });
    return { minW: lo, maxW: hi, points: pts };
  }, [sorted, targetKg]);

  if (sorted.length === 0) {
    return (
      <View testID={testID} style={[styles.container, style]}>
        <Text variant="micro" tone="muted">TREND</Text>
        <Hairline style={styles.rule} />
        <View
          style={[
            styles.emptyFrame,
            { borderColor: t.rule, backgroundColor: t.paperDeep, height },
          ]}
        >
          <Text variant="bodySm" tone="muted" align="center">
            The trend line draws itself once you record a weight.
          </Text>
        </View>
      </View>
    );
  }

  const range = maxW - minW;
  const stepValue = range / 4;

  return (
    <View testID={testID} style={[styles.container, style]} onLayout={onLayout}>
      <View style={styles.headerRow}>
        <Text variant="micro" tone="muted">TREND</Text>
        <Text variant="monoSm" tone="muted">
          {daysShown ? `LAST ${daysShown} DAYS` : `${sorted.length} POINTS`}
        </Text>
      </View>
      <Hairline style={styles.rule} />

      <View
        style={[
          styles.frame,
          { borderColor: t.rule, backgroundColor: t.paperDeep },
        ]}
      >
        {width > 0 ? (
          <LineChart
            data={points.map((p) => ({
              value: p.value,
              label: p.label,
              dataPointColor: t.ember,
              dataPointRadius: 2.5,
            }))}
            width={width - 24}
            height={height}
            // axes / range
            yAxisOffset={minW}
            maxValue={range}
            stepValue={stepValue}
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={t.rule}
            hideYAxisText
            // grid
            rulesType="solid"
            rulesColor={t.rule}
            rulesThickness={0.5}
            // line
            color={t.ember}
            thickness={1.5}
            curved
            curvature={0.18}
            isAnimated
            animationDuration={700}
            // area
            areaChart
            startFillColor={t.ember}
            endFillColor={t.ember}
            startOpacity={0.22}
            endOpacity={0.02}
            // points
            hideDataPoints={sorted.length > 30}
            dataPointsColor={t.ember}
            // x labels
            xAxisLabelTextStyle={{
              color: t.inkSoft,
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: 0.4,
            }}
            // target reference line
            showReferenceLine1={typeof targetKg === 'number'}
            referenceLine1Position={
              typeof targetKg === 'number' ? targetKg - minW : 0
            }
            referenceLine1Config={{
              color: t.signal,
              thickness: 1,
              dashWidth: 4,
              dashGap: 4,
              labelText: 'TARGET',
              labelTextStyle: {
                color: t.signal,
                fontFamily: fonts.mono,
                fontSize: 9,
                letterSpacing: 0.8,
              },
            }}
            initialSpacing={12}
            endSpacing={12}
            backgroundColor="transparent"
            disableScroll
          />
        ) : (
          <View style={{ height }} />
        )}
      </View>

      <View style={styles.scaleRow}>
        <Text variant="monoSm" tone="muted">{`min ${minW.toFixed(1)} kg`}</Text>
        <Text variant="monoSm" tone="muted">{`max ${maxW.toFixed(1)} kg`}</Text>
      </View>
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
  frame: {
    borderWidth: borders.hairline,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
  },
  emptyFrame: {
    borderWidth: borders.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
});

export default WeightTrendChart;
