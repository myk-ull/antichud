import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Hairline } from './Hairline';
import { Text } from './Text';
import { borders, radii, space } from '@/styles/tokens';
import { useTheme } from '@/styles/theme';

export type CardProps = {
  children?: React.ReactNode;
  title?: string;
  eyebrow?: string;
  footer?: React.ReactNode;
  variant?: 'flat' | 'recessed' | 'outlined';
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({
  children,
  title,
  eyebrow,
  footer,
  variant = 'recessed',
  style,
  contentStyle,
  testID,
}: CardProps): React.ReactElement {
  const { t } = useTheme();

  const containerStyle: ViewStyle = (() => {
    switch (variant) {
      case 'flat':
        return { backgroundColor: t.paper };
      case 'outlined':
        return {
          backgroundColor: t.paper,
          borderColor: t.rule,
          borderWidth: borders.hairline,
        };
      case 'recessed':
      default:
        return { backgroundColor: t.paperDeep };
    }
  })();

  return (
    <View
      testID={testID}
      style={[styles.root, containerStyle, style]}
    >
      {eyebrow ? (
        <Text variant="micro" tone="muted" style={styles.eyebrow}>
          {eyebrow}
        </Text>
      ) : null}
      {title ? (
        <>
          <Text variant="displaySm" tone="primary" style={styles.title}>
            {title}
          </Text>
          <Hairline />
        </>
      ) : null}
      <View style={[styles.body, contentStyle]}>{children}</View>
      {footer ? (
        <>
          <Hairline />
          <View style={styles.footer}>{footer}</View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.xs,
    paddingHorizontal: space.base,
    paddingTop: space.base,
    paddingBottom: space.base,
  },
  eyebrow: {
    marginBottom: space.xs,
  },
  title: {
    marginBottom: space.sm,
  },
  body: {
    paddingTop: space.md,
  },
  footer: {
    paddingTop: space.md,
  },
});

export default Card;
