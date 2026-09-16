import { describe, expect, it } from "vitest";
import { demoSnapshot } from "@not-alone/test-fixtures";
import { publishedAwardsProgram, publishedDirectory } from "./published-content";

describe("reviewed attendee content", () => {
  it("requires explicit directory activation", () => {
    expect(publishedDirectory(demoSnapshot)).toBeNull();
  });
  it("keeps an empty approved directory empty and excludes hidden or wrong-event people", () => {
    const person = demoSnapshot.speakers[0]!;
    const snapshot = { ...demoSnapshot, event: { ...demoSnapshot.event, directoryEnabled: true }, speakers: [{ ...person, published: false }, { ...person, eventId: "other", published: true }] };
    expect(publishedDirectory(snapshot)).toEqual([]);
  });
  it("uses updated published people without inferring producer roles", () => {
    const person = { ...demoSnapshot.speakers[0]!, published: true, role: "Approved role", directoryCategories: [] };
    expect(publishedDirectory({ ...demoSnapshot, event: { ...demoSnapshot.event, directoryEnabled: true }, speakers: [person] })).toEqual([person]);
  });
  it("never substitutes a hidden or historical Awards program", () => {
    const page = { ...demoSnapshot.contentPages[0]!, slug: "awards-2026-program", title: "Approved program", published: false };
    expect(publishedAwardsProgram({ ...demoSnapshot, contentPages: [page] })).toBeNull();
    expect(publishedAwardsProgram({ ...demoSnapshot, contentPages: [{ ...page, published: true }] })?.title).toBe("Approved program");
    expect(publishedAwardsProgram({ ...demoSnapshot, contentPages: [{ ...page, slug: "awards-2025-program", published: true }] })).toBeNull();
  });
});
