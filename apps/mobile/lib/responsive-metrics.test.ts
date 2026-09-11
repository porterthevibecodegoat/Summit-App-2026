import { describe, expect, it } from "vitest";
import { getResponsiveMetrics, responsiveContent } from "./responsive-metrics";

describe("responsive layout metrics", () => {
  it("uses compact spacing below the compact breakpoint", () => {
    const layout = getResponsiveMetrics(320, 568);

    expect(layout.compact).toBe(true);
    expect(layout.gutter).toBe(12);
    expect(layout.cardPadding).toBe(12);
  });

  it("switches modes at stable content-based breakpoints", () => {
    expect(getResponsiveMetrics(359, 800).compact).toBe(true);
    expect(getResponsiveMetrics(360, 800).compact).toBe(false);
    expect(getResponsiveMetrics(599, 800).regular).toBe(false);
    expect(getResponsiveMetrics(600, 800).regular).toBe(true);
    expect(getResponsiveMetrics(899, 800).wide).toBe(false);
    expect(getResponsiveMetrics(900, 800).wide).toBe(true);
  });

  it("detects short landscape and preserves the system font scale", () => {
    const layout = getResponsiveMetrics(844, 390, 1.6);

    expect(layout.landscape).toBe(true);
    expect(layout.short).toBe(true);
    expect(layout.fontScale).toBe(1.6);
    expect(responsiveContent.maxWidth).toBe(840);
  });

  it("treats iPad split view as a regular-width phone-style layout", () => {
    const layout = getResponsiveMetrics(507, 1024);

    expect(layout.compact).toBe(false);
    expect(layout.regular).toBe(false);
    expect(layout.wide).toBe(false);
    expect(layout.landscape).toBe(false);
  });
});
