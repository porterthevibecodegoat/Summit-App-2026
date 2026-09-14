import { describe, expect, it } from "vitest";
import {
  buildPublishedSnapshotFromDraftSessions,
  createNotificationJobsForPublish,
  hydrateSnapshotContent,
  staffContentSchema,
  staffDraftSessionsSchema,
  type StaffDraftSession
} from "./live-ops-store";
import { demoSnapshot } from "@not-alone/test-fixtures";

const session: StaffDraftSession = {
  id: "opening-session",
  day: "Monday Nov 2",
  start: "9:00 AM",
  end: "10:00 AM",
  title: "Opening Session",
  speaker: "Host Committee",
  location: "Encore Theater",
  audience: "All attendees",
  status: "Ready",
  reminders: "30m, 10m"
};

describe("live operations input safety", () => {
  it("rejects malformed staff draft payloads", () => {
    const result = staffDraftSessionsSchema.safeParse([{ ...session, status: "Published", unexpected: true }]);

    expect(result.success).toBe(false);
  });

  it("does not create sendable jobs when staff leaves notifications unchecked", () => {
    const snapshot = buildPublishedSnapshotFromDraftSessions([session], 4, "2026-09-10T17:00:00.000Z");

    expect(createNotificationJobsForPublish(snapshot, false)).toEqual([]);
    expect(createNotificationJobsForPublish(snapshot, true)).toHaveLength(2);
  });

  it("preserves published attendee content when schedule rows are republished", () => {
    const snapshot = buildPublishedSnapshotFromDraftSessions(
      [session],
      4,
      "2026-09-10T17:00:00.000Z",
      demoSnapshot
    );

    expect(snapshot.speakers).toEqual(demoSnapshot.speakers);
    expect(snapshot.faqs).toEqual(demoSnapshot.faqs);
    expect(snapshot.sponsors).toEqual(demoSnapshot.sponsors);
    expect(snapshot.notices).toEqual(demoSnapshot.notices);
    expect(snapshot.contentPages).toEqual(demoSnapshot.contentPages);
  });

  it("keeps valid session IDs stable and assigns day order by event day", () => {
    const original = demoSnapshot.scheduleItems[0]!;
    const sessions: StaffDraftSession[] = [
      { ...session, id: original.id, day: "Mon Nov 2", start: "1:00 PM", end: "2:00 PM", title: original.title },
      { ...session, id: "same-day-session", day: "Mon Nov 2", start: "3:00 PM", end: "4:00 PM", title: "Same Day" },
      { ...session, id: "next-day-session", day: "Tue Nov 3", start: "9:00 AM", end: "10:00 AM", title: "Next Day" }
    ];

    const snapshot = buildPublishedSnapshotFromDraftSessions(sessions, 5, "2026-09-10T17:00:00.000Z", demoSnapshot);

    expect(snapshot.scheduleItems.map((item) => item.dayOrder)).toEqual([0, 0, 1]);
    expect(snapshot.scheduleItems[0]?.id).toBe(original.id);
    expect(snapshot.scheduleItems[0]?.summary).toBe(original.summary);
  });

  it("validates timed notices before staff can publish them", () => {
    const result = staffContentSchema.safeParse({
      event: demoSnapshot.event,
      speakers: demoSnapshot.speakers,
      faqs: demoSnapshot.faqs,
      sponsors: demoSnapshot.sponsors,
      media: demoSnapshot.media,
      notices: [{
        id: "87000000-0000-4000-8000-000000000001",
        eventId: demoSnapshot.event.id,
        title: "Room update",
        body: "The session is now in Margaux.",
        severity: "change",
        startsAtUtc: "not-a-date",
        endsAtUtc: null,
        published: true
      }],
      contentPages: demoSnapshot.contentPages
    });
    expect(result.success).toBe(false);
  });

  it("removes known migration placeholders without overwriting staff content", () => {
    const placeholderSnapshot = {
      ...demoSnapshot,
      locations: demoSnapshot.locations.map((location, index) => ({
        ...location,
        description: index === 0 ? "Published staff-controlled event location." : location.description
      })),
      scheduleItems: demoSnapshot.scheduleItems.map((item, index) => ({
        ...item,
        summary: index === 0 ? "Host Team at Registration Desk." : item.summary,
        description: index === 0
          ? "Published from the staff live-ops control room. Replace this with approved production copy."
          : index === 1
            ? "Staff-approved custom session copy."
            : item.description
      }))
    };

    const hydrated = hydrateSnapshotContent(placeholderSnapshot);

    expect(hydrated.scheduleItems[0]?.summary).toBe(demoSnapshot.scheduleItems[0]?.summary);
    expect(hydrated.scheduleItems[0]?.description).toBe(demoSnapshot.scheduleItems[0]?.description);
    expect(hydrated.scheduleItems[1]?.description).toBe("Staff-approved custom session copy.");
    expect(hydrated.locations[0]?.description).toBe(demoSnapshot.locations[0]?.description);
  });
});
