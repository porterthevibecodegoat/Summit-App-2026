import { describe, expect, it } from "vitest";
import { event2026Snapshot } from "@not-alone/test-fixtures/event-2026";
import { getEventPhase, getNowAndUpcoming, groupPublishedProgramByDay } from ".";

describe("2026 published program", () => {
  it("includes pending-only Thursday without fabricating timed sessions", () => {
    const days = groupPublishedProgramByDay(event2026Snapshot);
    expect(days.map(day => day.date)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"]);
    expect(days[4]?.items).toEqual([]);
    expect(days[4]?.notes[0]?.body).toContain("Tennis: 10:00 AM; end time to be confirmed");
    expect(getNowAndUpcoming({ snapshot: event2026Snapshot, nowUtc: "2026-11-05T18:05:00.000Z", audienceGroups: ["public"] }).current).toEqual([]);
  });
  it("does not declare the event over before its pending final day", () => {
    expect(getEventPhase(event2026Snapshot, "2026-11-01T20:00:00.000Z")).toBe("before");
    expect(getEventPhase(event2026Snapshot, "2026-11-05T18:05:00.000Z")).toBe("live");
    expect(getEventPhase(event2026Snapshot, "2026-11-06T08:00:00.000Z")).toBe("after");
  });
});
