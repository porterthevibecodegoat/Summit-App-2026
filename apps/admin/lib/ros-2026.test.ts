import { describe, expect, it } from "vitest";
import { event2026Snapshot } from "@not-alone/test-fixtures/event-2026";
import { createAttendeeConciergeAnswer } from "./attendee-ai";
import { buildPublishedSnapshotFromDraftSessions, snapshotToDraftSessions, staffContentSchema } from "./live-ops-store";
import { getBlockingPublishMessages } from "./schedule-quality";

describe("2026 ROS publication", () => {
  it("uses the IANA zone across the November daylight-saving boundary", () => {
    const row = { ...snapshotToDraftSessions(event2026Snapshot)[0]!, start: "12:15 AM", end: "3:00 AM" };
    const result = buildPublishedSnapshotFromDraftSessions([row], 10, event2026Snapshot.serverTimeUtc, event2026Snapshot);
    expect(result.scheduleItems[0]?.startUtc).toBe("2026-11-01T07:15:00.000Z");
    expect(result.scheduleItems[0]?.endUtc).toBe("2026-11-01T11:00:00.000Z");
  });
  it("round trips the five-day range and overnight sessions through staff editing", () => {
    const draft = snapshotToDraftSessions(event2026Snapshot);
    expect(getBlockingPublishMessages(draft)).toEqual([]);
    const result = buildPublishedSnapshotFromDraftSessions(draft, 10, event2026Snapshot.serverTimeUtc, event2026Snapshot);
    for (const original of event2026Snapshot.scheduleItems) {
      const item = result.scheduleItems.find(candidate => candidate.id === original.id)!;
      expect(item.startUtc).toBe(original.startUtc);
      expect(item.endUtc).toBe(original.endUtc);
      expect(item.visibilityScope).toEqual(original.visibilityScope);
      expect(item.eligibilityScope).toEqual(original.eligibilityScope);
      expect(item.notificationOffsetsMinutes).toEqual([]);
      expect(result.locations.some(location => location.id === item.locationId)).toBe(true);
    }
  });
  it("does not invent a Tyson slot or bring back historical speakers", () => {
    const answer = createAttendeeConciergeAnswer({ question: "When is Mike Tyson appearing?", snapshot: event2026Snapshot, nowUtc: event2026Snapshot.serverTimeUtc });
    expect(answer.body).toContain("confirmed 2026 guest");
    expect(answer.items).toEqual([]);
    const historical = createAttendeeConciergeAnswer({ question: "When is Rachel Platten appearing?", snapshot: event2026Snapshot, nowUtc: event2026Snapshot.serverTimeUtc });
    expect(historical.body).toContain("not confirmed");
  });
  it("rejects producer credits outside the original site's approved list", () => {
    const { event, speakers, faqs, sponsors, media, notices, contentPages } = event2026Snapshot;
    const { id: _id, timeZone: _zone, ...editable } = event;
    const content = { event: editable, speakers, faqs, sponsors, media, notices, contentPages };
    expect(staffContentSchema.safeParse(content).success).toBe(true);
    expect(staffContentSchema.safeParse({ ...content, speakers: [{ ...speakers[0]!, name: "Unapproved Producer", role: "Producer", directoryCategories: ["Producers"] }] }).success).toBe(false);
    expect(staffContentSchema.safeParse({ ...content, event: { ...editable, directoryEnabled: false }, speakers: [{ ...speakers[0]!, name: "Unapproved Producer", role: "Producer", directoryCategories: ["Producers"] }] }).success).toBe(false);
  });
  it("answers incomplete program questions without invented endings", () => {
    for (const question of ["When is tennis?", "What happens Thursday?"]) {
      const answer = createAttendeeConciergeAnswer({ question, snapshot: event2026Snapshot, nowUtc: event2026Snapshot.serverTimeUtc });
      expect(answer.body).toContain("10:00 AM; end time to be confirmed");
      expect(answer.items).toEqual([]);
    }
  });
});
