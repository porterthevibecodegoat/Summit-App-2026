import { spacing } from "@not-alone/design-tokens";

export const responsiveBreakpoints = {
  compact: 360,
  regular: 600,
  wide: 900
} as const;

export const responsiveContent = {
  maxWidth: 840,
  readableWidth: 680,
  shortHeight: 500
} as const;

export function getResponsiveMetrics(width: number, height: number, fontScale = 1) {
  const compact = width < responsiveBreakpoints.compact;
  const regular = width >= responsiveBreakpoints.regular;
  const wide = width >= responsiveBreakpoints.wide;
  const landscape = width > height;
  const short = height < responsiveContent.shortHeight;
  const gutter = compact ? spacing.md : regular ? spacing.xl : spacing.lg;

  return {
    width,
    height,
    fontScale,
    compact,
    regular,
    wide,
    landscape,
    short,
    gutter,
    cardPadding: compact ? spacing.md : spacing.lg
  };
}
