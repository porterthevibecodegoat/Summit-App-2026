import { describe, expect, it } from "vitest";
import { parseScheduleText } from "./schedule-import";

describe("schedule import parser", () => {
  it("keeps imported ids stable and infers day headings", () => {
    const text = [
      "Monday, November 2",
      "9:00 AM - 10:00 AM Opening Session - Host Committee - Encore Theater",
      "Tuesday, November 3",
      "1 PM - 2 PM Community Workshop - Youth Ambassadors - Lafleur"
    ].join("\n");

    const first = parseScheduleText(text);
    const second = parseScheduleText(text);

    expect(first).toHaveLength(2);
    expect(first[0]).toMatchObject({
      day: "Monday Nov 2",
      start: "9:00 AM",
      end: "10:00 AM",
      location: "Encore Theater"
    });
    expect(first[1]).toMatchObject({
      day: "Tuesday Nov 3",
      start: "1:00 PM",
      end: "2:00 PM",
      speaker: "Youth Ambassadors"
    });
    expect(second.map((session) => session.id)).toEqual(first.map((session) => session.id));
  });
});
