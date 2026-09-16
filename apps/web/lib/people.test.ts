import { describe, expect, it } from "vitest";
import { demoSnapshot } from "@not-alone/test-fixtures";
import { directoryPeople, people2025, people2026 } from "./people";
import { originalProducerCredits } from "@not-alone/config";

describe("website reviewed directory", () => {
  it("restricts every producer listing to the original ICF credits", () => {
    for (const person of [...people2025, ...people2026].filter(person => /producer/i.test(person.role) || person.categories.some(category => /producer/i.test(category)))) {
      const credit = originalProducerCredits.find(credit => credit.name === person.name);
      expect(credit).toBeDefined();
      expect(person.role).toBe(credit?.role);
      expect(person.categories).toContain(credit?.category);
    }
    expect(people2025.filter(person => /producer/i.test(person.role))).toHaveLength(6);
    expect(people2026.some(person => person.name === "Dr. George Rapier III")).toBe(false);
  });
  it("does not infer roles from the collaborator's legacy roster", () => {
    expect(directoryPeople(demoSnapshot)).toEqual([]);
  });
  it("does not resurrect legacy names when the reviewed directory is empty or unavailable", () => {
    expect(directoryPeople(null)).toEqual([]);
    expect(directoryPeople({ ...demoSnapshot, event: { ...demoSnapshot.event, directoryEnabled: true }, speakers: [] })).toEqual([]);
  });
  it("uses stable identity and only staff-published roles and categories", () => {
    const speaker = { ...demoSnapshot.speakers[0]!, name: "Reviewed person", role: "Confirmed attendee", published: true };
    const people = directoryPeople({ ...demoSnapshot, event: { ...demoSnapshot.event, directoryEnabled: true }, speakers: [speaker] });
    expect(people[0]).toMatchObject({ name: speaker.name, slug: speaker.id, role: speaker.role, categories: ["Attendees"] });
  });
});
