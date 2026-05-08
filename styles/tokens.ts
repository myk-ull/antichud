/**
 * Antichud design tokens — "Energy Table" (editorial / scientific).
 * Sole source of truth. Never inline magic numbers in components.
 */

import { StyleSheet } from 'react-native';

export const colors = {
  paper: '#F4EFE6',
  paperDeep: '#EBE4D6',
  ink: '#15130F',
  inkSoft: '#5C564B',
  rule: '#15130F',
  ember: '#E8472C',
  emberSoft: '#F2C8B6',
  signal: '#1F6F4A',
} as const;

export const colorsDark = {
  paper: '#0E0D0A',
  paperDeep: '#161410',
  ink: '#F0EAD8',
  inkSoft: '#8A8273',
  rule: '#F0EAD8',
  ember: '#FF6B47',
  emberSoft: '#3A1E15',
  signal: '#46B881',
} as const satisfies Record<keyof typeof colors, string>;

export const fonts = {
  display: 'DMSerifDisplay_400Regular',
  displayItalic: 'DMSerifDisplay_400Regular_Italic',
  body: 'WorkSans_400Regular',
  bodyMedium: 'WorkSans_500Medium',
  bodySemi: 'WorkSans_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const fontSize = {
  caption: 12,
  bodySm: 14,
  body: 16,
  label: 18,
  headline: 22,
  displaySm: 28,
  display: 40,
  hero: 64,
} as const;

export const lineHeight = {
  body: 1.45,
  display: 1.15,
  mono: 1.25,
} as const;

export const letterSpacing = {
  micro: 1.4,    // ~+120/1000 at 12pt for uppercase
  body: -0.08,   // -5/1000 at 16pt
  display: 0,
  mono: 0,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  huge: 96,
} as const;

export const radii = {
  none: 0,
  xs: 2,
  sm: 4,
  pill: 999,
} as const;

export const borders = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  accent: 2,
} as const;

/**
 * Shadows are intentionally minimal — elevation is conveyed by hairline rules,
 * not soft shadows. Provided only for the rare case (modal backdrops).
 */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  scrim: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const motion = {
  digitStaggerMs: 30,
  digitDurationMs: 240,
  tapeDurationMs: 600,
  captureFlipMs: 320,
  screenEnterMs: 240,
  cardStaggerMs: 40,
  // cubic-bezier(0.2, 0.8, 0.2, 1) — precise, no overshoot
  easingPrecise: [0.2, 0.8, 0.2, 1] as const,
} as const;

export type ColorToken = keyof typeof colors;
export type FontToken = keyof typeof fonts;
export type FontSizeToken = keyof typeof fontSize;
export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radii;
export type BorderToken = keyof typeof borders;

export type Palette = Record<keyof typeof colors, string>;
