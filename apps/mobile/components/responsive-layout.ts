import { useMemo } from "react";
import { useWindowDimensions, type ViewStyle } from "react-native";
import { getResponsiveMetrics, responsiveContent } from "../lib/responsive-metrics";

export { responsiveBreakpoints, responsiveContent } from "../lib/responsive-metrics";

export type ResponsiveLayout = {
  width: number;
  height: number;
  fontScale: number;
  compact: boolean;
  regular: boolean;
  wide: boolean;
  landscape: boolean;
  short: boolean;
  gutter: number;
  cardPadding: number;
  contentStyle: ViewStyle;
  marginStyle: ViewStyle;
  paddingStyle: ViewStyle;
  cardPaddingStyle: ViewStyle;
};

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const metrics = getResponsiveMetrics(width, height, fontScale);

    return {
      ...metrics,
      contentStyle: {
        alignSelf: "center",
        maxWidth: responsiveContent.maxWidth,
        paddingBottom: metrics.short ? 88 : 116,
        width: "100%"
      },
      marginStyle: { marginHorizontal: metrics.gutter },
      paddingStyle: { paddingHorizontal: metrics.gutter },
      cardPaddingStyle: { padding: metrics.cardPadding }
    };
  }, [fontScale, height, width]);
}
