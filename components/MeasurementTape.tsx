import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { Hairline } from './Hairline';
import { borders, motion, space } from '@/styles/tokens';
import { useTheme } from '@/styles/theme';

export type MeasurementTapeProps = {
  value: number;
  max: number;
  /** Domain interval between minor ticks (e.g. 500 kJ, 1 kg). */
  minorTick?: number;
  /** Domain interval between major (labeled) ticks. */
  majorTick?: number;
  /** Number formatter for major-tick labels. */
  formatLabel?: (v: number) => string;
  /** Left-side rail label, e.g. `KILOJOULES`. */
  unitLabel?: string;
  /** Right-side rail value, e.g. the target — already formatted. */
  targetLabel?: string;
  /** Whether the fill should switch to the over-target ember-on-deep variant when value > max. */
  overTone?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const TAPE_HEIGHT = 56;
const MINOR_TICK_HEIGHT = 12;
const MAJOR_TICK_HEIGHT = 24;
const NEEDLE_WIDTH = 2;

export function MeasurementTape({
  value,
  max,
  minorTick = 500,
  majorTick = 2000,
  formatLabel = (v) => v.toLocaleString('en-US'),
  unitLabel,
  targetLabel,
  overTone = false,
  height = TAPE_HEIGHT,
  style,
  testID,
}: MeasurementTapeProps): React.ReactElement {
  const { t } = useTheme();
  const [width, setWidth] = useState(0);
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(value / safeMax, 1));

  const fillProgress = useSharedValue(0);

  useEffect(() => {
    fillProgress.value = withTiming(ratio, {
      duration: motion.tapeDurationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [ratio, fillProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillProgress.value * 100}%`,
  }));

  const needleStyle = useAnimatedStyle(() => ({
    left: `${fillProgress.value * 100}%`,
  }));

  const onLayout = (e: LayoutChangeEvent): void => {
    setWidth(e.nativeEvent.layout.width);
  };

  // Build major + minor tick positions in the value domain.
  const majorPositions: number[] = [];
  const minorPositions: number[] = [];
  for (let v = 0; v <= max; v += minorTick) {
    if (v % majorTick === 0) majorPositions.push(v);
    else minorPositions.push(v);
  }

  return (
    <View testID={testID} style={[styles.root, style]}>
      {(unitLabel || targetLabel) ? (
        <View style={styles.rail}>
          {unitLabel ? (
            <Text variant="micro" tone="muted">
              {unitLabel}
            </Text>
          ) : <View />}
          {targetLabel ? (
            <Text variant="monoSm" tone="muted">
              {targetLabel}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Major-tick number labels above the tape */}
      <View style={[styles.labelRow, { height: 16 }]} onLayout={onLayout}>
        {width > 0 &&
          majorPositions.map((v) => {
            const left = (v / safeMax) * width;
            return (
              <Text
                key={`L-${v}`}
                variant="monoSm"
                tone="muted"
                style={[
                  styles.tickLabel,
                  // Offset by half-width approximation for centering.
                  { left: left - 12 },
                ]}
              >
                {formatLabel(v)}
              </Text>
            );
          })}
      </View>

      <View
        style={[
          styles.tape,
          {
            height,
            backgroundColor: t.paperDeep,
            borderColor: t.rule,
            borderWidth: borders.hairline,
          },
        ]}
      >
        {/* Animated fill */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: t.ember, opacity: overTone ? 1 : 0.92 },
            fillStyle,
          ]}
        />

        {/* Tick marks (1px hairlines descending from top of tape) */}
        {width > 0 && (
          <>
            {minorPositions.map((v) => {
              const left = (v / safeMax) * width;
              return (
                <View
                  key={`m-${v}`}
                  style={[
                    styles.tick,
                    {
                      left,
                      width: borders.hairline,
                      height: MINOR_TICK_HEIGHT,
                      backgroundColor: t.rule,
                    },
                  ]}
                />
              );
            })}
            {majorPositions.map((v) => (
              <View
                key={`M-${v}`}
                style={[
                  styles.tick,
                  {
                    left: (v / safeMax) * width,
                    width: borders.hairline,
                    height: MAJOR_TICK_HEIGHT,
                    backgroundColor: t.rule,
                  },
                ]}
              />
            ))}
          </>
        )}

        {/* Vertical 2px ember needle marking current value */}
        <Animated.View
          style={[
            styles.needle,
            {
              width: NEEDLE_WIDTH,
              backgroundColor: t.ember,
              marginLeft: -NEEDLE_WIDTH / 2,
            },
            needleStyle,
          ]}
        />
      </View>

      <Hairline />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
  },
  rail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  labelRow: {
    position: 'relative',
    marginBottom: space.xs,
  },
  tickLabel: {
    position: 'absolute',
    top: 0,
    width: 48,
    textAlign: 'center',
  },
  tape: {
    position: 'relative',
    overflow: 'hidden',
  },
  tick: {
    position: 'absolute',
    top: 0,
  },
  needle: {
    position: 'absolute',
    top: -4,
    bottom: -4,
  },
});

export default MeasurementTape;
