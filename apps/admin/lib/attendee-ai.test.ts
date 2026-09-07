import { describe, expect, it } from "vitest";
import { demoSnapshot } from "@not-alone/test-fixtures";
import { createAttendeeConciergeAnswer } from "./attendee-ai";

describe("temporary attendee AI", () => {
  it("answers direct foundation questions clearly", () => {
    const answer = createAttendeeConciergeAnswer({
      question: "What is the Inspiring Children Foundation?",
      snapshot: demoSnapshot,
      nowUtc: demoSnapshot.serverTimeUtc
    });

    expect(answer.title).toBe("Inspiring Children Foundation");
    expect(answer.body).toContain("501(c)(3)");
    expect(answer.body).toContain("whole-human development");
  });

  it("does not invent an appearance time for public figures missing from the schedule", () => {
    const answer = createAttendeeConciergeAnswer({
      question: "When is Mike Tyson making an appearance?",
      snapshot: demoSnapshot,
      nowUtc: demoSnapshot.serverTimeUtc
    });

    expect(answer.title).toBe("Mike Tyson in the current app schedule");
    expect(answer.body).toContain("does not include a specific published appearance time yet");
    expect(answer.items).toHaveLength(0);
  });

  it("answers registration questions from the loaded schedule", () => {
    const answer = createAttendeeConciergeAnswer({
      question: "Where do I check in and get my badge?",
      snapshot: demoSnapshot,
      nowUtc: demoSnapshot.serverTimeUtc
    });

    expect(answer.title).toBe("Registration and arrival");
    expect(answer.body).toContain("Use the loaded schedule");
    expect(answer.items[0]?.title).toContain("Registration");
  });

  it("keeps emergency answers outside concierge scope", () => {
    const answer = createAttendeeConciergeAnswer({
      question: "This is an emergency and I feel unsafe",
      snapshot: demoSnapshot,
      nowUtc: demoSnapshot.serverTimeUtc
    });

    expect(answer.title).toBe("Immediate human support");
    expect(answer.body).toContain("not emergency or crisis care");
    expect(answer.items).toHaveLength(0);
  });
});
