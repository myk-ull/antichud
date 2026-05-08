import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { borders, radii, space, type Palette } from '@/styles/tokens';
import { useTheme } from '@/styles/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type Visual = {
  background: string;
  border: string;
  textTone: 'primary' | 'inverse' | 'accent';
  borderWidth: number;
};

function visualFor(t: Palette, variant: ButtonVariant, pressed: boolean): Visual {
  switch (variant) {
    case 'primary':
      return {
        background: t.ember,
        border: t.ember,
        textTone: 'inverse',
        borderWidth: borders.thin,
      };
    case 'secondary':
      return {
        background: pressed ? t.paperDeep : t.paper,
        border: t.rule,
        textTone: 'primary',
        borderWidth: borders.thin,
      };
    case 'ghost':
      return {
        background: 'transparent',
        border: 'transparent',
        textTone: 'primary',
        borderWidth: 0,
      };
    case 'destructive':
      return {
        background: pressed ? t.ember : t.paper,
        border: t.ember,
        textTone: pressed ? 'inverse' : 'accent',
        borderWidth: borders.thin,
      };
  }
}

const SIZES: Record<ButtonSize, { paddingV: number; paddingH: number; minHeight: number }> = {
  sm: { paddingV: space.sm, paddingH: space.md, minHeight: 32 },
  md: { paddingV: space.md, paddingH: space.lg, minHeight: 44 },
  lg: { paddingV: space.base, paddingH: space.xl, minHeight: 56 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth,
  style,
  testID,
}: ButtonProps): React.ReactElement {
  const { t } = useTheme();
  const sizing = SIZES[size];
  const isDisabled = disabled || loading;

  const labelVariant = size === 'lg' ? 'label' : 'body';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      haptic={variant === 'primary' ? 'medium' : 'light'}
      style={({ pressed }) => {
        const v = visualFor(t, variant, pressed);
        return [
          styles.base,
          {
            backgroundColor: v.background,
            borderColor: v.border,
            borderWidth: v.borderWidth,
            paddingVertical: sizing.paddingV,
            paddingHorizontal: sizing.paddingH,
            minHeight: sizing.minHeight,
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
          },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const v = visualFor(t, variant, pressed);
        return (
          <View style={styles.row}>
            {loading ? (
              <ActivityIndicator
                size="small"
                color={v.textTone === 'inverse' ? t.paper : t.ink}
              />
            ) : (
              <>
                {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
                <Text variant={labelVariant} tone={v.textTone}>
                  {label}
                </Text>
                {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
              </>
            )}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: space.sm,
  },
  iconRight: {
    marginLeft: space.sm,
  },
});

export default Button;
