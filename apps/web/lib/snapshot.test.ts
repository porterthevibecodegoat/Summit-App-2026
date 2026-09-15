import { describe, expect, it } from "vitest";
import { demoSnapshot } from "@not-alone/test-fixtures";
import { publicScheduleItems } from "./snapshot";

describe("publicScheduleItems", () => {
  it("returns every published event session in chronological order", () => {
    const items = publicScheduleItems(demoSnapshot);

    expect(items).toHaveLength(demoSnapshot.scheduleItems.filter((item) => item.published).length);
    expect(items.some((item) => item.title.includes("Community Day"))).toBe(true);
    expect(items.every((item, index) => index === 0 || item.startUtc >= items[index - 1]!.startUtc)).toBe(true);
  });
});
