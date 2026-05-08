import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { borders } from '@/styles/tokens';
import { useTheme } from '@/styles/theme';

export type HairlineProps = {
  orientation?: 'horizontal' | 'vertical';
  inset?: number;
  weight?: 'hairline' | 'thin' | 'accent';
  tone?: 'rule' | 'ember' | 'inkSoft';
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Hairline({
  orientation = 'horizontal',
  inset = 0,
  weight = 'hairline',
  tone = 'rule',
  opacity,
  style,
  testID,
}: HairlineProps): React.ReactElement {
  const { t, resolved } = useTheme();
  const thickness = borders[weight];
  const color = tone === 'ember' ? t.ember : tone === 'inkSoft' ? t.inkSoft : t.rule;
  // The dark-mode rule is rendered slightly translucent per design.md.
  const resolvedOpacity = opacity ?? (tone === 'rule' && resolved === 'dark' ? 0.6 : 1);

  const sizeStyle: ViewStyle =
    orientation === 'horizontal'
      ? { height: thickness, marginHorizontal: inset, alignSelf: 'stretch' }
      : { width: thickness, marginVertical: inset, alignSelf: 'stretch' };

  return (
    <View
      testID={testID}
      style={[
        sizeStyle,
        { backgroundColor: color, opacity: resolvedOpacity },
        style,
      ]}
    />
  );
}

export default Hairline;
