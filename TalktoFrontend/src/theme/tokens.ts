/**
 * Application-wide design tokens.
 *
 * Use these values instead of raw font sizes, font weights, margins, or
 * padding values in screen styles. Keeping the scale here makes visual
 * changes consistent and inexpensive.
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const fontSize = {
  caption: 12,
  small: 13,
  body: 14,
  bodyLarge: 16,
  subtitle: 18,
  heading3: 20,
  heading2: 24,
  heading1: 28,
  display: 38,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extraBold: '800',
} as const;

export const lineHeight = {
  caption: 16,
  body: 20,
  bodyLarge: 22,
  heading: 30,
  display: 44,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const layout = {
  screenPadding: spacing.xl,
  contentGap: spacing.md,
  cardPadding: spacing.lg,
  inputPadding: spacing.md,
  buttonPaddingVertical: spacing.md,
  buttonPaddingHorizontal: spacing.lg,
  touchTarget: 44,
} as const;
