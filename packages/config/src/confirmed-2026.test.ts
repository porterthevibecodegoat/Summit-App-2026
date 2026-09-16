import { describe, expect, it } from "vitest";
import { confirmedSummitGuests2026, confirmedSummitGuests2026Source } from "./confirmed-2026";

describe("confirmed 2026 summit roster", () => {
  it("contains only unique, public-ready names", () => {
    expect(new Set(confirmedSummitGuests2026).size).toBe(confirmedSummitGuests2026.length);
    expect(confirmedSummitGuests2026.every((name) => name.trim() === name && name.length > 0)).toBe(true);
    expect(confirmedSummitGuests2026.some((name) => /\bTBC\b/i.test(name))).toBe(false);
  });

  it("matches the reviewed read-only Airtable snapshot", () => {
    expect(confirmedSummitGuests2026).toHaveLength(55);
    expect(confirmedSummitGuests2026Source.observedConfirmedRows).toBe(59);
    expect(confirmedSummitGuests2026Source.publicConfirmedRows).toBe(confirmedSummitGuests2026.length);
    expect(confirmedSummitGuests2026).not.toEqual(expect.arrayContaining(["Erica McGraw", "Jay McGraw", "Raquelle Stevens"]));
    expect(confirmedSummitGuests2026).toEqual(expect.arrayContaining(["Adam Lewis", "Winston Kelly", "Janet Wozniak", "Cathy Olson"]));
  });
});
