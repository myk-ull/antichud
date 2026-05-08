import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { borders, fonts, fontSize, lineHeight, motion, space } from '@/styles/tokens';
import { useTheme } from '@/styles/theme';
import { kjToKcal } from '@/lib/calc';

export type KJReadoutSize = 'hero' | 'lg' | 'md';

export type KJReadoutProps = {
  kj: number;
  goalKJ?: number;
  unitLabel?: string;
  kcalHelper?: boolean;
  size?: KJReadoutSize;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const SIZES: Record<KJReadoutSize, { fontSize: number; unitFontSize: number }> = {
  hero: { fontSize: fontSize.hero, unitFontSize: fontSize.displaySm },
  lg: { fontSize: fontSize.display, unitFontSize: fontSize.headline },
  md: { fontSize: fontSize.displaySm, unitFontSize: fontSize.body },
};

function formatThousands(n: number): string {
  // Negatives are allowed (over-budget). Sign rendered separately so digits roll cleanly.
  return Math.abs(Math.round(n)).toLocaleString('en-US');
}

type DigitProps = {
  char: string;
  delayMs: number;
  fontSize: number;
  color: string;
  resetKey: number;
};

function Digit({ char, delayMs, fontSize: fs, color, resetKey }: DigitProps): React.ReactElement {
  const translateY = useSharedValue(8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = 8;
    opacity.value = 0;
    const easing = Easing.bezier(
      motion.easingPrecise[0],
      motion.easingPrecise[1],
      motion.easingPrecise[2],
      motion.easingPrecise[3],
    );
    translateY.value = withDelay(
      delayMs,
      withTiming(0, { duration: motion.digitDurationMs, easing }),
    );
    opacity.value = withDelay(
      delayMs,
      withTiming(1, { duration: motion.digitDurationMs, easing }),
    );
    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, [translateY, opacity, delayMs, char, resetKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text
      style={[
        {
          fontFamily: fonts.monoBold,
          fontSize: fs,
          lineHeight: fs * lineHeight.mono,
          color,
          // Tabular figures so each digit occupies the same advance width.
          fontVariant: ['tabular-nums'],
        },
        animatedStyle,
      ]}
    >
      {char}
    </Animated.Text>
  );
}

export function KJReadout({
  kj,
  goalKJ,
  unitLabel = 'kJ',
  kcalHelper = false,
  size = 'hero',
  underline = true,
  align = 'left',
  style,
  testID,
}: KJReadoutProps): React.ReactElement {
  const { t } = useTheme();
  const sizing = SIZES[size];

  const formatted = useMemo(() => formatThousands(kj), [kj]);
  const isNegative = Math.round(kj) < 0;
  const chars = useMemo(() => formatted.split(''), [formatted]);

  // Re-trigger digit roll when the displayed string changes.
  const resetKeyRef = useRef(0);
  const prevFormatted = useRef(formatted);
  if (prevFormatted.current !== formatted) {
    resetKeyRef.current += 1;
    prevFormatted.current = formatted;
  }

  const overGoal = typeof goalKJ === 'number' && kj > goalKJ;

  const alignStyle: ViewStyle = {
    alignSelf: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
    alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
  };

  return (
    <View testID={testID} style={[alignStyle, style]}>
      <View style={styles.row}>
        {isNegative ? (
          <Text
            variant="hero"
            tone={overGoal ? 'accent' : 'primary'}
            style={{ fontSize: sizing.fontSize, lineHeight: sizing.fontSize * lineHeight.mono }}
          >
            −
          </Text>
        ) : null}
        {chars.map((char, idx) => (
          <Digit
            key={`${idx}-${char}`}
            char={char}
            delayMs={idx * motion.digitStaggerMs}
            fontSize={sizing.fontSize}
            color={overGoal ? t.ember : t.ink}
            resetKey={resetKeyRef.current}
          />
        ))}
        <Text
          variant="displayItalic"
          tone={overGoal ? 'accent' : 'primary'}
          style={[
            styles.unit,
            { fontSize: sizing.unitFontSize, lineHeight: sizing.unitFontSize * lineHeight.display },
          ]}
        >
          {unitLabel}
        </Text>
      </View>

      {underline ? (
        <View
          style={[
            styles.underline,
            {
              backgroundColor: t.ember,
              height: borders.accent,
            },
          ]}
        />
      ) : null}

      {kcalHelper ? (
        <Text variant="monoSm" tone="muted" style={styles.helper}>
          {`${kjToKcal(kj).toLocaleString('en-US')} kcal`}
          {typeof goalKJ === 'number' ? `  ·  goal ${formatThousands(goalKJ)} kJ` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  unit: {
    marginLeft: space.sm,
  },
  underline: {
    marginTop: space.xs,
    alignSelf: 'stretch',
  },
  helper: {
    marginTop: space.xs,
  },
});

export default KJReadout;
