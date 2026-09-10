import { describe, expect, it } from "vitest";
import { detectFileType, extractScheduleDocument, parseScheduleDocument, parseScheduleText } from "./schedule-import";

describe("schedule import parser", () => {
  it("keeps imported ids stable and infers day headings", () => {
    const text = [
      "Monday, November 2",
      "9:00 AM - 10:00 AM Opening Session - Host Committee - Encore Theater",
      "Tuesday, November 3",
      "1 PM - 2 PM Community Workshop - Youth Ambassadors - Lafleur"
    ].join("\n");

    const first = parseScheduleText(text);
    const second = parseScheduleText(text);

    expect(first).toHaveLength(2);
    expect(first[0]).toMatchObject({
      day: "Monday Nov 2",
      start: "9:00 AM",
      end: "10:00 AM",
      location: "Encore Theater"
    });
    expect(first[1]).toMatchObject({
      day: "Tuesday Nov 3",
      start: "1:00 PM",
      end: "2:00 PM",
      speaker: "Youth Ambassadors"
    });
    expect(second.map((session) => session.id)).toEqual(first.map((session) => session.id));
  });

  it("extracts production-timeline rows, infers durations, and excludes obvious crew operations", () => {
    const result = parseScheduleDocument([
      "Monday, Nov 10",
      "1:00 PM Pilates Class by Yvette (1:00 - 1:45 PM)\tLafleur\tYvette",
      "2:00 PM AV Load in begins in all rooms\tAll rooms\tAV team",
      "8:25 PM Jewel Performance (8:25 - 9:10 PM)\tMargaux (Wisdom Forum)"
    ].join("\n"));

    expect(result.sessions).toHaveLength(2);
    expect(result.skippedOperationalRows).toBe(1);
    expect(result.sessions[0]).toMatchObject({
      day: "Monday Nov 10",
      start: "1:00 PM",
      end: "1:45 PM",
      speaker: "Yvette",
      location: "Lafleur"
    });
    expect(result.sessions[1]).toMatchObject({
      title: "Jewel Performance",
      speaker: "Jewel",
      end: "9:10 PM"
    });
  });

  it("validates supported file types and decodes text files", async () => {
    expect(detectFileType("agenda.pdf", "application/pdf")).toBe("PDF");
    expect(detectFileType("agenda.csv", "")).toBe("CSV");
    expect(detectFileType("agenda.docx", "")).toBe("UNKNOWN");

    const extracted = await extractScheduleDocument({
      fileName: "agenda.txt",
      mimeType: "text/plain",
      bytes: new TextEncoder().encode("Monday Nov 2\n9 AM Session")
    });
    expect(extracted).toEqual({ fileType: "TXT", text: "Monday Nov 2\n9 AM Session" });
  });

  it("parses structured CSV rows with common headers and quoted values", () => {
    const csv = [
      "Date,Start Time,End Time,Session,Presenter,Room,Audience,Reminders",
      'Tuesday November 3,1 PM,2:15 PM,"Connection, Community & Purpose",Mike Tyson,Encore Theater,All attendees,"30m, 10m"',
      "Tuesday November 3,3 PM,,Closing Conversation,,Main Stage,,"
    ].join("\n");

    const result = parseScheduleDocument(csv, "CSV");

    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0]).toMatchObject({
      day: "Tuesday Nov 3",
      start: "1:00 PM",
      end: "2:15 PM",
      title: "Connection, Community & Purpose",
      speaker: "Mike Tyson",
      location: "Encore Theater",
      reminders: "30m, 10m"
    });
    expect(result.sessions[1]).toMatchObject({
      start: "3:00 PM",
      end: "3:45 PM",
      speaker: "Unassigned",
      audience: "All attendees"
    });
  });

  it("counts malformed CSV rows and keeps duplicate ids unique and stable", () => {
    const csv = [
      "day,start,title,location",
      "Monday Nov 2,9 AM,Opening,Main Stage",
      "Monday Nov 2,9 AM,Opening,Main Stage",
      "Monday Nov 2,not-a-time,Broken row,Main Stage"
    ].join("\n");

    const first = parseScheduleDocument(csv, "CSV");
    const second = parseScheduleDocument(csv, "CSV");

    expect(first.sessions).toHaveLength(2);
    expect(new Set(first.sessions.map((session) => session.id)).size).toBe(2);
    expect(first.sessions.map((session) => session.id)).toEqual(second.sessions.map((session) => session.id));
    expect(first.unmatchedTimedRows).toBe(1);
  });

  it("rejects CSV files without recognizable schedule columns", () => {
    expect(() => parseScheduleDocument("foo,bar\none,two", "CSV")).toThrow(/title\/session column/);
  });
});
