# Frontend styling guide

React Native has no global CSS cascade. Talkto centralizes its visual system in
`src/theme/tokens.ts` and `src/theme/styles.ts`; screens compose those styles
with their theme colours.

## Use in a screen

```tsx
import { textStyles, createCommonStyles } from '../theme/styles';
import { spacing, radius } from '../theme/tokens';

const common = createCommonStyles(colors);

<View style={common.screen}>
  <View style={common.content}>
    <Text style={[textStyles.h1, { color: colors.text }]}>Page title</Text>
    <Text style={[textStyles.body, { color: colors.muted }]}>Helpful text.</Text>
    <View style={[common.card, { marginTop: spacing.md, borderRadius: radius.lg }]} />
  </View>
</View>
```

## Text classes (variants)

Use `textStyles.display`, `h1`, `h2`, `h3`, `subtitle`, `body`, `bodyLarge`,
`label`, `caption`, and `button`. These own the app's font size, line height,
and font weight. Add only colour or an intentional local override in a screen.

## Spacing and layout

Use `spacing` for all margins, padding, and gaps (`xs`, `sm`, `md`, `lg`,
`xl`, etc.). Use `layout.screenPadding`, `layout.contentGap`, and
`layout.cardPadding` for common page structure. Use `radius` for corner radii.
Do not introduce raw numeric typography, spacing, or radius values unless the
element genuinely needs a bespoke size (for example, a media preview).

## Shared building blocks

`createCommonStyles(colors)` provides theme-aware `screen`, `content`, `card`,
`input`, and `primaryButton` styles. It must be called with the current theme:

```tsx
const { colors } = useTheme();
const common = useMemo(() => createCommonStyles(colors), [colors]);
```

For a screen-specific style, compose a shared style rather than copying it:

```tsx
card: { ...common.card, padding: spacing.xl }
```

Use `fontSize`, `fontWeight`, and `lineHeight` from `tokens.ts` only when a
new semantic text variant is being added to `textStyles`.
