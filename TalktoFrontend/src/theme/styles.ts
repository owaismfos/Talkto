import { StyleSheet } from 'react-native';
import type { AppThemeColors } from './colors';
import { fontSize, fontWeight, layout, lineHeight, radius, spacing } from './tokens';

/** Reusable text variants. Add a theme colour at the call site or screen style. */
export const textStyles = StyleSheet.create({
  display: { fontSize: fontSize.display, lineHeight: lineHeight.display, fontWeight: fontWeight.extraBold },
  h1: { fontSize: fontSize.heading1, lineHeight: lineHeight.heading, fontWeight: fontWeight.extraBold },
  h2: { fontSize: fontSize.heading2, lineHeight: lineHeight.heading, fontWeight: fontWeight.extraBold },
  h3: { fontSize: fontSize.heading3, lineHeight: 26, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.subtitle, lineHeight: 24, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.body, lineHeight: lineHeight.body, fontWeight: fontWeight.regular },
  bodyLarge: { fontSize: fontSize.bodyLarge, lineHeight: lineHeight.bodyLarge, fontWeight: fontWeight.regular },
  label: { fontSize: fontSize.small, lineHeight: lineHeight.caption, fontWeight: fontWeight.semibold },
  caption: { fontSize: fontSize.caption, lineHeight: lineHeight.caption, fontWeight: fontWeight.regular },
  button: { fontSize: fontSize.bodyLarge, lineHeight: lineHeight.bodyLarge, fontWeight: fontWeight.bold },
});

/** Shared structural styles for all screens. Colours stay theme-aware. */
export const createCommonStyles = (colors: AppThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: layout.screenPadding, gap: layout.contentGap },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
  },
  input: {
    minHeight: layout.touchTarget,
    paddingHorizontal: layout.inputPadding,
    paddingVertical: spacing.sm,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    ...textStyles.bodyLarge,
  },
  primaryButton: {
    minHeight: layout.touchTarget,
    paddingHorizontal: layout.buttonPaddingHorizontal,
    paddingVertical: layout.buttonPaddingVertical,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
});
