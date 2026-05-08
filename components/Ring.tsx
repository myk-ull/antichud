import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { space } from '@/styles/tokens';
import { useTheme } from '@/styles/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type RingProps = {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  children?: React.ReactNode;
  trackTone?: 'paperDeep' | 'rule';
  fillTone?: 'ember' | 'signal' | 'ink';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const DEFAULT_SIZE = 240;
const DEFAULT_STROKE = 12;
const ANIM_MS = 700;

export function Ring({
  value,
  max,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE,
  label,
  children,
  trackTone = 'paperDeep',
  fillTone = 'ember',
  style,
  testID,
}: RingProps): React.ReactElement {
  const { t } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeMax = max > 0 ? max : 1;
  const target = Math.max(0, Math.min(value / safeMax, 1));

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(target, {
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [target, progress]);

  const animatedProps = useAnimatedProps(() => {
    const dashOffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset: dashOffset,
    };
  });

  const trackColor = trackTone === 'rule' ? t.rule : t.paperDeep;
  const fillColor = fillTone === 'signal' ? t.signal : fillTone === 'ink' ? t.ink : t.ember;

  return (
    <View testID={testID} style={[styles.root, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {/* Rotate so the stroke starts at 12 o'clock and sweeps clockwise. */}
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>

      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.center]}>
        {label ? (
          <Text variant="micro" tone="muted" style={styles.label}>
            {label}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginBottom: space.xs,
  },
});

export default Ring;
