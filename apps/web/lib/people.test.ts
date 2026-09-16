import { describe, expect, it } from "vitest";
import { demoSnapshot } from "@not-alone/test-fixtures";
import { directoryPeople, people2026 } from "./people";

describe("website reviewed directory", () => {
  it("preserves the legacy roster until staff explicitly activates publication", () => {
    expect(directoryPeople(demoSnapshot)).toEqual(people2026);
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
