import { describe, expect, it } from "vitest";
import { parseAirtableGuestCsv } from "./airtable-import";

describe("Airtable guest CSV review", () => {
  it("includes confirmed guests while withholding pending, blank, and TBC rows", () => {
    const csv = `Name,Summit Status,Occupation,Bio,Headshot
Jason Kennedy,Confirmed,Host,Approved bio,https://example.com/jason.jpg
Potential Guest,Pending,Artist,,
Guest Plus One (TBC),Confirmed,Guest,,
,Confirmed,,,
Jason Kennedy,Confirmed,Host,Duplicate,`;
    const result = parseAirtableGuestCsv(csv, "summit-2026");

    expect(result.speakers).toHaveLength(1);
    expect(result.speakers[0]).toMatchObject({ name: "Jason Kennedy", published: false });
    expect(result.withheldRows).toBe(3);
    expect(result.duplicateRows).toBe(1);
  });

  it("rejects files without confirmation columns", () => {
    expect(() => parseAirtableGuestCsv("Name,Role\nGuest,Host", "summit-2026")).toThrow(/Summit Status/);
  });
});
