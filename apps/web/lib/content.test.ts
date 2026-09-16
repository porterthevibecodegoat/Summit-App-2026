import { describe, expect, it } from "vitest";
import {
  awards2025Directory,
  confirmed2026People,
  summit2025Directory,
  summit2025Highlights,
  summit2025Leadership,
  summitPartners
} from "./content";

describe("year-specific public content", () => {
  it("keeps Villa Bibbiani in 2025 only and retains the Cohen Foundation", () => {
    expect(summitPartners[2025].presentedBy).toContain("Villa Bibbiani");
    expect(summitPartners[2026].presentedBy).not.toContain("Villa Bibbiani");
    expect(summitPartners[2025].poweredBy).toContain("Steven & Alexandra Cohen Foundation");
    expect(summitPartners[2026].poweredBy).toContain("Steven & Alexandra Cohen Foundation");
  });

  it("does not carry 2025 participants into 2026 without confirmation", () => {
    const archivedNames = [...summit2025Directory, ...awards2025Directory]
      .flatMap((group) => group.people)
      .map((person) => person.name);

    expect(archivedNames).toContain("Janet & Steve Wozniak");
    expect(archivedNames).toContain("Jewel");
    expect(archivedNames).toContain("Mike Tyson");
    expect(summit2025Leadership.flatMap((group) => group.people).map((person) => person.name)).toContain("Cherrial Odell");
    expect(confirmed2026People).toEqual([]);
  });

  it("preserves every archived directory section", () => {
    expect(summit2025Directory.map((group) => group.title)).toEqual([
      "Founders",
      "Musicians",
      "Entertainers & Athletes",
      "Experts",
      "Business Leaders & Philanthropists",
      "ICF Alumni",
      "Executive Producers",
      "Producers"
    ]);
    expect(awards2025Directory.map((group) => group.title)).toEqual([
      "Founders",
      "Musicians",
      "Entertainers & Athletes",
      "Experts",
      "Business Leaders & Philanthropists"
    ]);
    expect(summit2025Directory.find(group => group.title === "Experts")?.people).toHaveLength(10);
    expect(summit2025Directory.find(group => group.title === "Business Leaders & Philanthropists")?.people).toHaveLength(7);
    expect(awards2025Directory.find(group => group.title === "Business Leaders & Philanthropists")?.people).toHaveLength(13);
    expect(summit2025Highlights).toHaveLength(14);
  });
});
