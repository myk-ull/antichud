/**
 * Typography presets — every text style in the app composes one of these.
 * Color is applied at the call site via `t.ink` / `t.inkSoft` / `t.ember`.
 */

import type { TextStyle } from 'react-native';
import { fonts, fontSize, lineHeight, letterSpacing } from './tokens';

type Preset = TextStyle;

const display: Preset = {
  fontFamily: fonts.display,
  fontSize: fontSize.display,
  lineHeight: fontSize.display * lineHeight.display,
  letterSpacing: letterSpacing.display,
};

const displaySm: Preset = {
  fontFamily: fonts.display,
  fontSize: fontSize.displaySm,
  lineHeight: fontSize.displaySm * lineHeight.display,
  letterSpacing: letterSpacing.display,
};

const displayItalic: Preset = {
  fontFamily: fonts.displayItalic,
  fontSize: fontSize.displaySm,
  lineHeight: fontSize.displaySm * lineHeight.display,
  letterSpacing: letterSpacing.display,
  fontStyle: 'italic',
};

const headline: Preset = {
  fontFamily: fonts.bodySemi,
  fontSize: fontSize.headline,
  lineHeight: fontSize.headline * lineHeight.body,
  letterSpacing: letterSpacing.body,
};

const body: Preset = {
  fontFamily: fonts.body,
  fontSize: fontSize.body,
  lineHeight: fontSize.body * lineHeight.body,
  letterSpacing: letterSpacing.body,
};

const bodySm: Preset = {
  fontFamily: fonts.body,
  fontSize: fontSize.bodySm,
  lineHeight: fontSize.bodySm * lineHeight.body,
  letterSpacing: letterSpacing.body,
};

const label: Preset = {
  fontFamily: fonts.bodyMedium,
  fontSize: fontSize.label,
  lineHeight: fontSize.label * lineHeight.body,
  letterSpacing: letterSpacing.body,
};

/**
 * UPPERCASE micro-label — apply `textTransform: 'uppercase'` already baked in.
 * Use for "KILOJOULES", "TODAY", "TARGET", etc.
 */
const micro: Preset = {
  fontFamily: fonts.bodyMedium,
  fontSize: fontSize.caption,
  lineHeight: fontSize.caption * 1.2,
  letterSpacing: letterSpacing.micro,
  textTransform: 'uppercase',
};

const mono: Preset = {
  fontFamily: fonts.mono,
  fontSize: fontSize.body,
  lineHeight: fontSize.body * lineHeight.mono,
  letterSpacing: letterSpacing.mono,
};

const monoSm: Preset = {
  fontFamily: fonts.mono,
  fontSize: fontSize.caption,
  lineHeight: fontSize.caption * lineHeight.mono,
  letterSpacing: letterSpacing.mono,
};

/**
 * The hero kJ readout — JetBrains Mono Bold 64pt, tabular figures.
 * Use the `fontVariant` to lock tabular numerals on platforms that honor it.
 */
const hero: Preset = {
  fontFamily: fonts.monoBold,
  fontSize: fontSize.hero,
  lineHeight: fontSize.hero * lineHeight.mono,
  letterSpacing: letterSpacing.mono,
  fontVariant: ['tabular-nums'],
};

export const type = {
  display,
  displaySm,
  displayItalic,
  headline,
  body,
  bodySm,
  label,
  micro,
  mono,
  monoSm,
  hero,
} as const;

export type TypePreset = keyof typeof type;
