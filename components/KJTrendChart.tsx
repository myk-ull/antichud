/**
 * KJTrendChart — last-N-days kJ totals as a polished bar chart.
 * Uses react-native-gifted-charts. Styled to match the editorial
 * "Energy Table" aesthetic: paper background, ink bars, ember
 * highlight on today, dashed ember goal line, JetBrains Mono labels.
 */
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { Text } from './Text';
import { Hairline } from './Hairline';
import { useTheme } from '@/styles/theme';
import { fonts, fontSize, space } from '@/styles/tokens';

export type KJTrendChartProps = {
  data: ReadonlyArray<{ ts: number; kj: number }>;
  goalKJ?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const DOW = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const MIN_BAR_WIDTH = 18;

function dayLabel(ts: number): string {
  return DOW[new Date(ts).getDay()] ?? '';
}

export function KJTrendChart({
  data,
  goalKJ,
  height = 160,
  style,
  testID,
}: KJTrendChartProps): React.ReactElement {
  const { t } = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent): void => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  const maxKJ = useMemo(() => {
    const dataMax = data.reduce((m, p) => Math.max(m, p.kj), 0);
    const goal = goalKJ && goalKJ > 0 ? goalKJ * 1.15 : 0;
    return Math.max(dataMax, goal, 1);
  }, [data, goalKJ]);

  const barData = useMemo(() => {
    if (data.length === 0) return [];
    return data.map((p, idx) => {
      const isToday = idx === data.length - 1;
      return {
        value: p.kj,
        label: dayLabel(p.ts),
        frontColor: isToday ? t.ember : t.ink,
        opacity: p.kj === 0 ? 0.18 : isToday ? 1 : 0.85,
        topLabelComponent:
          isToday && p.kj > 0
            ? () => (
                <Text variant="micro" tone="accent" style={styles.todayMark}>
                  TODAY
                </Text>
              )
            : undefined,
      };
    });
  }, [data, t.ember, t.ink]);

  if (data.length === 0) {
    return (
      <View testID={testID} style={[styles.container, style]}>
        <Text variant="micro" tone="muted">7-DAY TREND</Text>
        <Hairline style={styles.rule} />
        <Text variant="bodySm" tone="muted">Log a meal to start the chart.</Text>
      </View>
    );
  }

  // Spacing math: barWidth + spacing per bar; gifted-charts adds initialSpacing too
  const initialSpacing = 8;
  const slot = width > 0 ? Math.max(0, (width - initialSpacing - 4) / data.length) : 0;
  const barWidth = Math.max(MIN_BAR_WIDTH, Math.floor(slot * 0.55));
  const spacing = Math.max(6, Math.floor(slot - barWidth));

  return (
    <View testID={testID} style={[styles.container, style]} onLayout={onLayout}>
      <View style={styles.headerRow}>
        <Text variant="micro" tone="muted">7-DAY TREND</Text>
        {goalKJ && goalKJ > 0 ? (
          <Text variant="monoSm" tone="muted">
            {`goal ${goalKJ.toLocaleString('en-US')} kJ`}
          </Text>
        ) : null}
      </View>
      <Hairline style={styles.rule} />

      {width > 0 ? (
        <BarChart
          data={barData}
          width={width - initialSpacing - 4}
          height={height}
          maxValue={maxKJ}
          barWidth={barWidth}
          spacing={spacing}
          initialSpacing={initialSpacing}
          endSpacing={0}
          barBorderRadius={0}
          isAnimated
          animationDuration={650}
          // axes
          hideYAxisText
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={t.rule}
          // labels
          xAxisLabelTextStyle={{
            color: t.inkSoft,
            fontFamily: fonts.mono,
            fontSize: 10,
            letterSpacing: 0.6,
          }}
          // gridlines
          rulesType="solid"
          rulesColor={t.rule}
          rulesThickness={0.5}
          noOfSections={4}
          // goal reference line
          showReferenceLine1={!!(goalKJ && goalKJ > 0)}
          referenceLine1Position={goalKJ ?? 0}
          referenceLine1Config={{
            color: t.ember,
            thickness: 1,
            dashWidth: 4,
            dashGap: 4,
            labelText: 'GOAL',
            labelTextStyle: {
              color: t.ember,
              fontFamily: fonts.mono,
              fontSize: 9,
              letterSpacing: 0.8,
            },
          }}
          backgroundColor="transparent"
          disableScroll
        />
      ) : (
        <View style={{ height }} />
      )}
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
  todayMark: {
    marginBottom: 2,
  },
});

export default KJTrendChart;
