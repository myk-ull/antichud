import React from 'react';
import {
  Text as RNText,
  type StyleProp,
  type TextStyle,
  type TextProps as RNTextProps,
} from 'react-native';
import { type Palette } from '@/styles/tokens';
import { type TypePreset, type } from '@/styles/typography';
import { useTheme } from '@/styles/theme';

export type TextVariant =
  | 'display'
  | 'displaySm'
  | 'displayItalic'
  | 'headline'
  | 'title'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'mono'
  | 'monoSm'
  | 'caption'
  | 'micro'
  | 'hero';

export type TextTone = 'primary' | 'muted' | 'accent' | 'inverse' | 'signal';

const VARIANT_TO_PRESET: Record<TextVariant, TypePreset> = {
  display: 'display',
  displaySm: 'displaySm',
  displayItalic: 'displayItalic',
  headline: 'headline',
  title: 'displaySm',
  body: 'body',
  bodySm: 'bodySm',
  label: 'label',
  mono: 'mono',
  monoSm: 'monoSm',
  caption: 'bodySm',
  micro: 'micro',
  hero: 'hero',
};

function toneColor(t: Palette, tone: TextTone): string {
  switch (tone) {
    case 'muted':
      return t.inkSoft;
    case 'accent':
      return t.ember;
    case 'signal':
      return t.signal;
    case 'inverse':
      return t.paper;
    case 'primary':
    default:
      return t.ink;
  }
}

export type TextProps = Omit<RNTextProps, 'style'> & {
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  testID?: string;
  children?: React.ReactNode;
};

export function Text({
  variant = 'body',
  tone = 'primary',
  align,
  numberOfLines,
  style,
  testID,
  children,
  ...rest
}: TextProps): React.ReactElement {
  const { t } = useTheme();
  const preset = type[VARIANT_TO_PRESET[variant]];
  return (
    <RNText
      {...rest}
      testID={testID}
      numberOfLines={numberOfLines}
      style={[preset, { color: toneColor(t, tone), textAlign: align }, style]}
    >
      {children}
    </RNText>
  );
}

export default Text;
