import { describe, expect, it } from "vitest";
import { demoSnapshot } from "@not-alone/test-fixtures";
import { publicScheduleItems } from "./snapshot";

describe("publicScheduleItems", () => {
  it("returns only public published event sessions in chronological order", () => {
    const items = publicScheduleItems(demoSnapshot);

    expect(items).toHaveLength(demoSnapshot.scheduleItems.filter((item) => item.published && item.visibilityScope.id === "public").length);
    expect(items.every(item => demoSnapshot.scheduleItems.find(original => original.id === item.id)?.visibilityScope.id === "public")).toBe(true);
    expect(items.every((item, index) => index === 0 || item.startUtc >= items[index - 1]!.startUtc)).toBe(true);
  });
});
