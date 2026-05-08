import React, { useCallback } from 'react';
import {
  Platform,
  Pressable as RNPressable,
  type GestureResponderEvent,
  type PressableProps as RNPressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticIntensity = 'light' | 'medium' | 'heavy' | 'none';

export type PressableProps = Omit<RNPressableProps, 'style' | 'children' | 'onPress'> & {
  children?: React.ReactNode | ((state: { pressed: boolean; hovered: boolean }) => React.ReactNode);
  style?:
    | StyleProp<ViewStyle>
    | ((state: { pressed: boolean; hovered: boolean }) => StyleProp<ViewStyle>);
  pressedOpacity?: number;
  hoveredOpacity?: number;
  haptic?: HapticIntensity;
  onPress?: (event: GestureResponderEvent) => void;
  testID?: string;
};

function fireHaptic(intensity: HapticIntensity): void {
  if (intensity === 'none' || Platform.OS === 'web') return;
  try {
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    } as const;
    void Haptics.impactAsync(map[intensity]);
  } catch {
    // haptics unavailable — silent
  }
}

export function Pressable({
  children,
  style,
  pressedOpacity = 0.55,
  hoveredOpacity = 0.85,
  haptic = 'light',
  onPress,
  disabled,
  testID,
  ...rest
}: PressableProps): React.ReactElement {
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) return;
      fireHaptic(haptic);
      onPress?.(event);
    },
    [onPress, haptic, disabled],
  );

  return (
    <RNPressable
      {...rest}
      testID={testID}
      disabled={disabled}
      onPress={handlePress}
      style={(state) => {
        const pressed = state.pressed;
        // RN web exposes `hovered` on the state object; types may not include it.
        const hovered = (state as unknown as { hovered?: boolean }).hovered ?? false;
        const opacity = disabled ? 0.4 : pressed ? pressedOpacity : hovered ? hoveredOpacity : 1;
        const flat = typeof style === 'function' ? style({ pressed, hovered }) : style;
        return [{ opacity }, flat];
      }}
    >
      {(state) => {
        const hovered = (state as unknown as { hovered?: boolean }).hovered ?? false;
        return typeof children === 'function'
          ? children({ pressed: state.pressed, hovered })
          : children;
      }}
    </RNPressable>
  );
}

export default Pressable;
