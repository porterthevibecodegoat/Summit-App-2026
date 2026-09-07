import { describe, expect, it } from "vitest";
import { buildPublishedSnapshotFromDraftSessions, type StaffDraftSession } from "./live-ops-store";
import { createPublishPreview } from "./publish-diff";

const baseSessions: StaffDraftSession[] = [
  {
    id: "opening-session",
    day: "Mon Nov 2",
    start: "9:00 AM",
    end: "10:00 AM",
    title: "Opening Session",
    speaker: "Host Committee",
    location: "Encore Theater",
    audience: "All attendees",
    status: "Ready",
    reminders: "30m, 10m"
  },
  {
    id: "afternoon-keynote",
    day: "Mon Nov 2",
    start: "3:00 PM",
    end: "4:00 PM",
    title: "Innovation and Purpose",
    speaker: "Steve Wozniak",
    location: "Encore Theater",
    audience: "All attendees",
    status: "Ready",
    reminders: "10m"
  }
];

describe("publish preview diff", () => {
  it("summarizes attendee-facing changes before a staff publish", () => {
    const current = buildPublishedSnapshotFromDraftSessions(baseSessions, 4, "2026-09-07T15:00:00.000Z");
    const preview = createPublishPreview(
      current,
      [
        baseSessions[0]!,
        {
          ...baseSessions[1]!,
          start: "3:30 PM",
          end: "4:30 PM",
          speaker: "Mike Tyson",
          title: "Resilience and Purpose"
        },
        {
          id: "closing-reflection",
          day: "Mon Nov 2",
          start: "5:00 PM",
          end: "5:30 PM",
          title: "Closing Reflection",
          speaker: "Wellness Team",
          location: "Reflection Lounge",
          audience: "All attendees",
          status: "Ready",
          reminders: "10m"
        }
      ],
      "2026-09-07T16:00:00.000Z"
    );

    expect(preview.currentRevision).toBe(4);
    expect(preview.nextRevision).toBe(5);
    expect(preview.counts).toMatchObject({
      added: 1,
      changed: 1,
      removed: 0,
      unchanged: 1
    });
    expect(preview.changes.some((change) => change.type === "changed" && change.summary.includes("Title"))).toBe(true);
    expect(preview.notificationJobsCount).toBe(4);
  });

  it("flags removed sessions clearly", () => {
    const current = buildPublishedSnapshotFromDraftSessions(baseSessions, 7, "2026-09-07T15:00:00.000Z");
    const preview = createPublishPreview(current, [baseSessions[0]!], "2026-09-07T16:00:00.000Z");

    expect(preview.counts.removed).toBe(1);
    expect(preview.changes[0]?.fields[0]).toMatchObject({
      label: "Session",
      after: "Removed from attendee schedule"
    });
  });
});
