import { describe, expect, it } from "vitest";
import { demoSnapshot } from "@not-alone/test-fixtures";
import { notificationTarget } from "./notification-target";

describe("notification opening", () => {
  it("opens a published session for this event", () => {
    const id = demoSnapshot.scheduleItems[0]!.id;
    expect(notificationTarget({ eventId: demoSnapshot.event.id, scheduleItemId: id }, demoSnapshot)).toEqual({ pathname: "/session/[id]", params: { id } });
  });
  it("opens the schedule for a removed session or general announcement", () => {
    expect(notificationTarget({ eventId: demoSnapshot.event.id, scheduleItemId: "removed" }, demoSnapshot)).toEqual({ pathname: "/(tabs)/schedule" });
  });
  it("ignores another event and arbitrary URL payloads", () => {
    expect(notificationTarget({ eventId: "another-event", url: "https://example.org" }, demoSnapshot)).toBeNull();
  });
});
