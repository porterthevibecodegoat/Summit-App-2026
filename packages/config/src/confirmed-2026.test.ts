import { describe, expect, it } from "vitest";
import { confirmedSummitGuests2026, confirmedSummitGuests2026Source } from "./confirmed-2026";

describe("confirmed 2026 summit roster", () => {
  it("contains only unique, public-ready names", () => {
    expect(new Set(confirmedSummitGuests2026).size).toBe(confirmedSummitGuests2026.length);
    expect(confirmedSummitGuests2026.every((name) => name.trim() === name && name.length > 0)).toBe(true);
    expect(confirmedSummitGuests2026.some((name) => /\bTBC\b/i.test(name))).toBe(false);
  });

  it("matches the reviewed read-only Airtable snapshot", () => {
    expect(confirmedSummitGuests2026).toHaveLength(53);
    expect(confirmedSummitGuests2026Source.observedConfirmedRows).toBe(56);
    expect(confirmedSummitGuests2026Source.publicConfirmedRows).toBe(confirmedSummitGuests2026.length);
    expect(confirmedSummitGuests2026).not.toEqual(expect.arrayContaining(["Erica McGraw", "Jay McGraw", "Raquelle Stevens"]));
    expect(confirmedSummitGuests2026).toEqual(expect.arrayContaining(["Jeff Levin", "Mike Tyson", "Darryl McDaniels (DMC)", "Janet Wozniak", "Cathy Olson"]));
    for (const name of ["Adam Lewis", "Melony Lewis", "Cameron Kelly", "Winston Kelly", "Jeneva Bell", "DMC"]) expect(confirmedSummitGuests2026).not.toContain(name);
  });
});
