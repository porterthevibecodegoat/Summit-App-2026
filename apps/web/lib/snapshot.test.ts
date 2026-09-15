import { describe, expect, it } from "vitest";
import { demoSnapshot } from "@not-alone/test-fixtures";
import { publicScheduleItems } from "./snapshot";

describe("publicScheduleItems", () => {
  it("returns only public published sessions in chronological order", () => {
    const items = publicScheduleItems(demoSnapshot);

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item, index) => index === 0 || item.startUtc >= items[index - 1]!.startUtc)).toBe(true);
  });
});
