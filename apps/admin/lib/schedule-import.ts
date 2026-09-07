import { createHash } from "node:crypto";
import type { StaffDraftSession } from "./live-ops-store";

export function parseScheduleText(text: string): StaffDraftSession[] {
  const parsed: StaffDraftSession[] = [];
  let currentDay = "Monday Nov 2";

  text.split(/\r?\n/).forEach((line, index) => {
    const normalizedLine = line.replace(/\u2013/g, "-");
    const dayHeading = inferDayLabel(normalizedLine);
    if (dayHeading) {
      currentDay = dayHeading;
    }

    const match = normalizedLine.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s+(.+)/i);
    const start = match?.[1];
    const end = match?.[2];
    const body = match?.[3];

    if (!start || !end || !body) {
      return;
    }

    const [rawTitle, rawSpeaker, rawLocation] = body.split(/\s+-\s+|\t|\s\|\s/);
    const title = rawTitle?.trim();

    if (!title) {
      return;
    }

    parsed.push({
      id: stableImportId(`${currentDay}:${start}:${end}:${body}:${index}`),
      day: currentDay,
      start: normalizeTime(start),
      end: normalizeTime(end),
      title,
      speaker: rawSpeaker?.trim() || "Unassigned",
      location: rawLocation?.trim() || inferLocation(body) || "Needs location",
      audience: "All attendees",
      status: "Needs review",
      reminders: "10m"
    });
  });

  return parsed;
}

function inferDayLabel(line: string) {
  const normalized = line.toLowerCase();
  if (normalized.includes("monday") || normalized.includes("november 2") || normalized.includes("nov 2")) {
    return "Monday Nov 2";
  }
  if (normalized.includes("tuesday") || normalized.includes("november 3") || normalized.includes("nov 3")) {
    return "Tuesday Nov 3";
  }
  if (normalized.includes("wednesday") || normalized.includes("november 4") || normalized.includes("nov 4")) {
    return "Wednesday Nov 4";
  }

  return null;
}

function inferLocation(value: string) {
  const locationMatch = value.match(/\b(?:at|in)\s+([A-Z][A-Za-z0-9&' ]{3,})$/);
  return locationMatch?.[1]?.trim() ?? null;
}

function normalizeTime(value: string) {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  const hour = match?.[1];
  const minute = match?.[2] ?? "00";
  const meridiem = match?.[3];

  if (!hour || !meridiem) {
    return value;
  }

  return `${hour}:${minute} ${meridiem.toUpperCase()}`;
}

function stableImportId(input: string) {
  const hash = createHash("sha256").update(input).digest("hex");
  return `imported-${hash.slice(0, 12)}`;
}
