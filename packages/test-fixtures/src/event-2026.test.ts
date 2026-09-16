import { describe, expect, it } from "vitest";
import { event2026Snapshot, rosInstant } from "./event-2026";
import { ros2026 } from "./ros-2026";

describe("reviewed 2026 ROS", () => {
  it("accounts for every source row without inventing missing times", () => {
    expect(ros2026).toHaveLength(32);
    expect(event2026Snapshot.scheduleItems).toHaveLength(26);
    expect(ros2026.filter(row => !row.staffOnly && (!row.end || row.timingReview))).toHaveLength(5);
    expect(ros2026.filter(row => row.staffOnly)).toHaveLength(1);
    expect(event2026Snapshot.scheduleItems.some(item => /load out|pilates|registration|gifting/i.test(item.title))).toBe(false);
  });
  it("uses Pacific time and rolls midnight endings into the following day", () => {
    expect(rosInstant(1, "14:00")).toBe("2026-11-01T22:00:00.000Z");
    const poker = event2026Snapshot.scheduleItems.find(item => item.title.includes("Poker"))!;
    expect(poker.endUtc).toBe("2026-11-02T08:00:00.000Z");
    expect(event2026Snapshot.scheduleItems.every(item => item.endUtc > item.startUtc)).toBe(true);
  });
  it("has unique identities, real location references, and no automatic reminders", () => {
    const items = event2026Snapshot.scheduleItems;
    expect(new Set(items.map(item => item.id)).size).toBe(items.length);
    expect(items.every(item => event2026Snapshot.locations.some(location => location.id === item.locationId))).toBe(true);
    expect(items.every(item => item.notificationOffsetsMinutes.length === 0 && item.speakerIds.length === 0)).toBe(true);
  });
  it("withholds historical content, unconfirmed guests, and extra producers", () => {
    const json = JSON.stringify(event2026Snapshot);
    for (const text of ["2025", "Villa Bibbiani", "Lafleur", "BOA Steakhouse", "Geoff Ralston", "Rachel Platten"]) expect(json).not.toContain(text);
    expect(event2026Snapshot.speakers).toHaveLength(53);
    expect(event2026Snapshot.speakers.filter(person => person.role === "Producer").map(person => person.name).sort()).toEqual(["Aphrah Brokaw", "Trent Alenik"]);
    expect(event2026Snapshot.speakers.filter(person => person.role === "Executive Producer").map(person => person.name).sort()).toEqual(["Jewel", "Ryan Wolfington", "Trevor Short"]);
  });
});
