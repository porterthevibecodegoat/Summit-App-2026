import { describe, expect, it } from "vitest";
import { event2026Snapshot } from "@not-alone/test-fixtures/event-2026";
import { createAttendeeConciergeAnswer } from "./attendee-concierge";

const answer = (question: string, snapshot = event2026Snapshot) => createAttendeeConciergeAnswer({
  question, snapshot, nowUtc: "2026-09-16T20:00:00.000Z"
});

describe("shared online/offline 2026 concierge", () => {
  it("reads current dates, venue, and the foundation from the published snapshot", () => {
    expect(answer("What is the summit?").body).toContain("November 1 & 5");
    const updated = structuredClone(event2026Snapshot);
    updated.event.dateLabel = "Updated event dates";
    updated.event.venueName = "Updated venue";
    updated.contentPages.find(page => page.slug === "inspiring-children-foundation")!.body = "Approved foundation description";
    expect(answer("What is the summit?", updated).body).toContain("Updated event dates");
    expect(answer("What is the summit?", updated).body).toContain("Updated venue");
    expect(answer("What is ICF?", updated).body).toBe("Approved foundation description");
  });

  it.each(["Steve Wozniak", "Jason Kennedy", "Loni Love", "Mike Tyson", "DMC"])("does not assign old roles or times to %s", name => {
    const result = answer(`When is ${name} appearing?`);
    expect(result.body).toContain("confirmed 2026 guest");
    expect(result.body).toContain("attendance does not confirm a speaking slot");
    expect(result.body).not.toMatch(/co-chair|host|8:00|7:00/i);
    expect(result.items).toEqual([]);
  });

  it("does not resurrect historical performers or sponsors", () => {
    expect(answer("When is Rachel Platten appearing?").body).toContain("not confirmed");
    const sponsors = answer("Is Villa Bibbiani a sponsor?");
    expect(sponsors.body).toContain("Steven & Alexandra Cohen Foundation");
    expect(sponsors.body).not.toContain("Villa Bibbiani");
  });

  it("does not invent check-in, meditation, Community Day, or a closing concert", () => {
    expect(answer("Where do I check in?").items).toEqual([]);
    expect(answer("Where do I check in?").body).toContain("have not been published");
    expect(answer("Quiet reset options").body).not.toMatch(/meditation|stretching|breathwork/);
    const community = answer("Community Day");
    expect(community.items.map(item => item.title)).toEqual(["Mike's Bikes Community Ride", "Wellness and Community Programming"]);
    expect(community.body).not.toMatch(/life-plan|DBT|closing/);
    expect(answer("What concerts are there?").items.map(item => item.title)).toEqual(["Evening Talk and Performance"]);
  });

  it("keeps uncertain times available without making up an end time", () => {
    for (const question of ["When is tennis?", "What happens Thursday?"]) {
      const result = answer(question);
      expect(result.body).toContain("10:00 AM; end time to be confirmed");
      expect(result.items).toEqual([]);
    }
  });

  it("uses linked speaker IDs and current schedule revisions", () => {
    const updated = structuredClone(event2026Snapshot);
    const speaker = updated.speakers.find(person => person.name === "Mike Tyson")!;
    const session = updated.scheduleItems[0]!;
    session.title = "Newly published conversation";
    session.speakerIds = [speaker.id];
    expect(answer("When is Mike Tyson appearing?", updated).items[0]?.title).toBe(session.title);
  });

  it("does not fall back to the first old session after the event", () => {
    const result = createAttendeeConciergeAnswer({ question: "What is happening now?", snapshot: event2026Snapshot, nowUtc: "2026-11-10T20:00:00.000Z" });
    expect(result.items).toEqual([]);
    expect(result.body).toContain("no upcoming");
  });

  it("does not expose staff-only or unpublished activities in wayfinding", () => {
    const updated = structuredClone(event2026Snapshot);
    for (const session of updated.scheduleItems) {
      session.published = false;
      session.visibilityScope.id = "staff";
    }
    expect(answer("Where is Margaux?", updated).items).toEqual([]);
  });
});
