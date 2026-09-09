import { describe, expect, it } from "vitest";
import { createScheduleProposal, createStateAnswer, type DraftSession } from "./staff-ai";

const sessions: DraftSession[] = [
  {
    id: "draft-wozniak-keynote",
    day: "Mon Nov 2",
    start: "3:00 PM",
    end: "4:00 PM",
    title: "Innovation, Humanity, and Not Being Alone",
    speaker: "Steve Wozniak",
    location: "Encore Theater",
    audience: "All attendees",
    status: "Ready",
    reminders: "30m, 10m"
  },
  {
    id: "draft-reset-lounge",
    day: "Mon Nov 2",
    start: "4:20 PM",
    end: "4:50 PM",
    title: "Guided Reset and Reflection",
    speaker: "Wellness Team",
    location: "Reflection Lounge",
    audience: "All attendees",
    status: "Needs review",
    reminders: "10m"
  }
];

describe("temporary staff AI", () => {
  it("creates a clear reviewed proposal for a time and speaker change", () => {
    const proposal = createScheduleProposal(
      "The 3pm speaker has now changed to 3:30 and it is now Mike Tyson instead of Steve Wozniak.",
      sessions
    );

    expect(proposal.confidence).toBe("High");
    expect(proposal.changes).toContainEqual({
      id: "draft-wozniak-keynote",
      label: "Start time",
      before: "3:00 PM",
      after: "3:30 PM"
    });
    expect(proposal.changes).toContainEqual({
      id: "draft-wozniak-keynote",
      label: "End time",
      before: "4:00 PM",
      after: "4:30 PM"
    });
    expect(proposal.changes).toContainEqual({
      id: "draft-wozniak-keynote",
      label: "Speaker",
      before: "Steve Wozniak",
      after: "Mike Tyson"
    });
  });

  it("refuses to guess when a named session does not exist", () => {
    const proposal = createScheduleProposal(
      "Move the 6pm speaker to 6:30 and replace Jane Doe with John Doe.",
      sessions
    );

    expect(proposal.confidence).toBe("Low");
    expect(proposal.changes).toEqual([]);
    expect(proposal.summary).toBe("No matching session was found.");
  });

  it("answers notification state without claiming push delivery is live", () => {
    const answer = createStateAnswer({
      question: "Are notifications sending to phones?",
      sessions,
      baseRevision: 4,
      notificationJobsCount: 2,
      attendeeDevices: 0
    });

    expect(answer).toContain("Real push delivery is still disabled");
    expect(answer).toContain("No attendee devices are registered");
  });

  it("answers review state with clear counts", () => {
    const answer = createStateAnswer({
      question: "What is blocked before publish?",
      sessions,
      baseRevision: 4
    });

    expect(answer).toContain("1 session(s) are ready");
    expect(answer).toContain("1 need review");
  });

  it("surfaces room conflicts for staff before publish", () => {
    const sessions = [
      {
        id: "session-a",
        day: "Monday Nov 2",
        start: "9:00 AM",
        end: "10:00 AM",
        title: "Opening Session",
        speaker: "Host Committee",
        location: "Encore Theater",
        audience: "All attendees",
        status: "Ready" as const,
        reminders: "10m"
      },
      {
        id: "session-b",
        day: "Monday Nov 2",
        start: "9:30 AM",
        end: "10:30 AM",
        title: "Sponsor Panel",
        speaker: "Panelists",
        location: "Encore Theater",
        audience: "All attendees",
        status: "Ready" as const,
        reminders: "10m"
      }
    ];

    const answer = createStateAnswer({
      question: "Are there any room conflicts?",
      sessions,
      baseRevision: 1
    });

    expect(answer).toContain("Opening Session overlaps Sponsor Panel");
  });
});
