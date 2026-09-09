import { describe, expect, it } from "vitest";
import { canSeeScheduleItem, getNowAndUpcoming, toEventTimeRange } from ".";
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

  it("surfaces prototype summit programming before the event begins", () => {
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
});
