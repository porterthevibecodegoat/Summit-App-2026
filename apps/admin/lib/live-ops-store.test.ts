import { describe, expect, it } from "vitest";
import {
  buildPublishedSnapshotFromDraftSessions,
  createNotificationJobsForPublish,
  staffDraftSessionsSchema,
  type StaffDraftSession
} from "./live-ops-store";

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
});
