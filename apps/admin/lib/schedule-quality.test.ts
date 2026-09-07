import { describe, expect, it } from "vitest";
import { createScheduleQualityReport, getBlockingPublishMessages } from "./schedule-quality";
import type { StaffDraftSession } from "./live-ops-store";

const readySession: StaffDraftSession = {
  id: "session-1",
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

describe("schedule quality report", () => {
  it("passes a clean ready draft", () => {
    const report = createScheduleQualityReport([readySession]);

    expect(report.publishable).toBe(true);
    expect(report.issueCounts.blocking).toBe(0);
    expect(report.readySessions).toBe(1);
  });

  it("blocks duplicate ids and room conflicts", () => {
    const conflicting: StaffDraftSession = {
      ...readySession,
      id: "session-1",
      title: "Sponsor Conversation",
      start: "9:30 AM",
      end: "10:30 AM"
    };
    const messages = getBlockingPublishMessages([readySession, conflicting]);

    expect(messages.join(" ")).toContain("Duplicate ids");
    expect(messages.join(" ")).toContain("overlaps");
  });

  it("warns on unclear day labels and missing reminder offsets", () => {
    const report = createScheduleQualityReport([
      {
        ...readySession,
        id: "unclear",
        day: "Imported",
        reminders: ""
      }
    ]);

    expect(report.publishable).toBe(true);
    expect(report.issueCounts.warning).toBe(2);
  });
});
