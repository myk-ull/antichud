import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { borders, radii, space, type Palette } from '@/styles/tokens';
import { useTheme } from '@/styles/theme';

export type TagTone = 'neutral' | 'warn' | 'good' | 'bad';
export type TagSize = 'sm' | 'md';

export type TagProps = {
  label: string;
  tone?: TagTone;
  size?: TagSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type Visual = { background: string; border: string; text: string };

function visualFor(t: Palette, tone: TagTone): Visual {
  switch (tone) {
    case 'good':
      return { background: 'transparent', border: t.signal, text: t.signal };
    case 'warn':
      return { background: t.emberSoft, border: t.ember, text: t.ember };
    case 'bad':
      return { background: t.ember, border: t.ember, text: t.paper };
    case 'neutral':
    default:
      return { background: 'transparent', border: t.rule, text: t.ink };
  }
}

const SIZE_STYLES: Record<TagSize, { paddingV: number; paddingH: number }> = {
  sm: { paddingV: 2, paddingH: space.sm },
  md: { paddingV: space.xs, paddingH: space.md },
};

export function Tag({
  label,
  tone = 'neutral',
  size = 'sm',
  style,
  testID,
}: TagProps): React.ReactElement {
  const { t } = useTheme();
  const v = visualFor(t, tone);
  const sizing = SIZE_STYLES[size];
  return (
    <View
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: v.background,
          borderColor: v.border,
          paddingVertical: sizing.paddingV,
          paddingHorizontal: sizing.paddingH,
        },
        style,
      ]}
    >
      <Text variant="micro" style={{ color: v.text }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    alignSelf: 'flex-start',
  },
});

export default Tag;
