import { describe, expect, it } from "vitest";
import { canSeeScheduleItem, getActiveOperationalNotices, getCountdownLabel, getEventPhase, getJumpToNowItem, getNowAndUpcoming, getSessionTemporalState, toEventTimeRange } from ".";
import { demoSnapshot } from "@not-alone/test-fixtures";
import type { ScheduleItem } from "@not-alone/validation";

describe("schedule domain", () => {
  it("handles an event with no published schedule items yet", () => {
    const result = getNowAndUpcoming({
      snapshot: { ...demoSnapshot, scheduleItems: [] },
      nowUtc: "2026-11-02T18:30:00.000Z",
      audienceGroups: ["all_attendees"]
    });

    expect(result.current).toHaveLength(0);
    expect(result.upcoming).toHaveLength(0);
  });

  it("surfaces summit programming before the event begins", () => {
    const result = getNowAndUpcoming({
      snapshot: demoSnapshot,
      nowUtc: "2026-09-07T16:00:00.000Z",
      audienceGroups: ["founders"]
    });

    expect(result.current).toHaveLength(0);
    expect(result.upcoming[0]?.title).toBe("Registration, Gifting Suite, and Wellness Rooms Open");
  });

  it("does not grant restricted founder access to a public attendee", () => {
    const founderSession = demoSnapshot.scheduleItems.find((item) => item.visibilityScope.id === "founders");

    expect(founderSession).toBeDefined();
    expect(canSeeScheduleItem(founderSession!, ["public"])).toBe(false);
    expect(canSeeScheduleItem(founderSession!, ["founders"])).toBe(true);
  });

  it("renders event-local time with the configured IANA zone", () => {
    const item: ScheduleItem = {
      id: "78f7af0b-9146-4d65-b848-4105f6a5b209",
      eventId: demoSnapshot.event.id,
      title: "Schedule Test Session",
      shortTitle: "Test Session",
      summary: "Test only.",
      description: "Test only.",
      startUtc: "2026-11-02T18:00:00.000Z",
      endUtc: "2026-11-02T19:00:00.000Z",
      eventTimeZone: demoSnapshot.event.timeZone,
      dayOrder: 1,
      locationId: "65f7e5d1-01bc-4495-813b-929f86503fcf",
      locationName: "Wynn Las Vegas",
      speakerIds: [],
      status: "scheduled",
      visibilityScope: { id: "public", label: "Visible to all" },
      eligibilityScope: { id: "all_attendees", label: "All attendees" },
      notificationScope: { id: "all_attendees", label: "All attendees" },
      notificationOffsetsMinutes: [60],
      featured: false,
      published: true,
      revision: 1,
      updatedAt: "2026-08-31T18:00:00.000Z",
      publishedAt: "2026-08-31T18:00:00.000Z"
    };

    expect(toEventTimeRange(item, demoSnapshot.event.timeZone)).toBe("10:00 AM - 11:00 AM");
  });

  it("classifies sessions and event phases from the server-corrected clock", () => {
    const first = demoSnapshot.scheduleItems[0]!;
    expect(getEventPhase({ ...demoSnapshot, scheduleItems: [] }, first.startUtc)).toBe("empty");
    expect(getEventPhase(demoSnapshot, "2026-09-07T16:00:00.000Z")).toBe("before");
    expect(getEventPhase(demoSnapshot, first.startUtc)).toBe("live");
    expect(getSessionTemporalState(first, first.startUtc)).toBe("current");
    expect(getSessionTemporalState(first, first.endUtc)).toBe("completed");
    expect(getEventPhase(demoSnapshot, "2026-12-01T00:00:00.000Z")).toBe("after");
  });

  it("jumps to the current, next, or final session as time advances", () => {
    const first = demoSnapshot.scheduleItems[0]!;
    expect(getJumpToNowItem(demoSnapshot.scheduleItems, first.startUtc)?.id).toBe(first.id);
    expect(getJumpToNowItem(demoSnapshot.scheduleItems, "2026-09-07T16:00:00.000Z")?.id).toBe(first.id);
    expect(getJumpToNowItem(demoSnapshot.scheduleItems, "2026-12-01T00:00:00.000Z")?.id)
      .toBe([...demoSnapshot.scheduleItems].sort((a, b) => a.startUtc.localeCompare(b.startUtc)).at(-1)?.id);
  });

  it("formats useful live countdowns", () => {
    expect(getCountdownLabel("2026-11-02T18:00:00.000Z", "2026-11-02T17:47:30.000Z")).toBe("13 min");
    expect(getCountdownLabel("2026-11-03T18:00:00.000Z", "2026-11-02T17:00:00.000Z")).toBe("1 day 1 hr");
    expect(getCountdownLabel("2026-11-02T17:00:00.000Z", "2026-11-02T17:00:00.000Z")).toBe("now");
  });

  it("surfaces active urgent and schedule-change notices", () => {
    const first = demoSnapshot.scheduleItems[0]!;
    const snapshot = {
      ...demoSnapshot,
      notices: [{
        id: "83000000-0000-4000-8000-000000000001",
        eventId: demoSnapshot.event.id,
        title: "Weather update",
        body: "Use the indoor entrance.",
        severity: "urgent" as const,
        startsAtUtc: "2026-11-02T16:00:00.000Z",
        endsAtUtc: "2026-11-02T20:00:00.000Z",
        published: true
      }],
      scheduleItems: [{ ...first, status: "moved" as const, startUtc: "2026-11-02T18:00:00.000Z", endUtc: "2026-11-02T19:00:00.000Z" }]
    };

    const notices = getActiveOperationalNotices(snapshot, "2026-11-02T17:00:00.000Z");
    expect(notices.map((notice) => notice.severity)).toEqual(["urgent", "change"]);
    expect(notices[1]?.body).toContain(first.locationName);
  });

  it("translates every attendee-facing schedule disruption and expires old notices", () => {
    const base = demoSnapshot.scheduleItems[0]!;
    const scheduleItems = (["delayed", "moved", "canceled"] as const).map((status, index) => ({
      ...base,
      id: `85000000-0000-4000-8000-00000000000${index + 1}`,
      status,
      startUtc: "2026-11-02T18:00:00.000Z",
      endUtc: "2026-11-02T19:00:00.000Z"
    }));
    const expiredNotice = {
      id: "86000000-0000-4000-8000-000000000001",
      eventId: demoSnapshot.event.id,
      title: "Expired",
      body: "Do not show this.",
      severity: "urgent" as const,
      startsAtUtc: "2026-11-02T15:00:00.000Z",
      endsAtUtc: "2026-11-02T16:00:00.000Z",
      published: true
    };

    const notices = getActiveOperationalNotices(
      { ...demoSnapshot, scheduleItems, notices: [expiredNotice] },
      "2026-11-02T17:00:00.000Z"
    );
    expect(notices.map((notice) => notice.title)).toEqual(expect.arrayContaining([
      `${base.shortTitle} delayed`,
      `${base.shortTitle} moved`,
      `${base.shortTitle} canceled`
    ]));
    expect(notices.some((notice) => notice.title === "Expired")).toBe(false);
  });

  it("never advertises canceled sessions as next", () => {
    const first = demoSnapshot.scheduleItems[0]!;
    const result = getNowAndUpcoming({
      snapshot: { ...demoSnapshot, scheduleItems: [{ ...first, status: "canceled" }] },
      nowUtc: "2026-09-07T16:00:00.000Z",
      audienceGroups: ["public"]
    });
    expect(result.upcoming).toEqual([]);
  });
});
