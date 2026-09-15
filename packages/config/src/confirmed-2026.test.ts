import { describe, expect, it } from "vitest";
import { confirmedSummitGuests2026 } from "./confirmed-2026";

describe("confirmed 2026 summit roster", () => {
  it("contains only unique, public-ready names", () => {
    expect(new Set(confirmedSummitGuests2026).size).toBe(confirmedSummitGuests2026.length);
    expect(confirmedSummitGuests2026.every((name) => name.trim() === name && name.length > 0)).toBe(true);
    expect(confirmedSummitGuests2026.some((name) => /\bTBC\b/i.test(name))).toBe(false);
  });
});
