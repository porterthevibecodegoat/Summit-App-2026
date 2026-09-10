import { createHash } from "node:crypto";
import { PDFParse } from "pdf-parse";
import { parse as parseCsv } from "csv-parse/sync";
import type { DocumentImportJob } from "@not-alone/validation";
import type { StaffDraftSession } from "./live-ops-store";

export const MAX_SCHEDULE_IMPORT_BYTES = 15 * 1024 * 1024;

export type ScheduleParseResult = {
  sessions: StaffDraftSession[];
  skippedOperationalRows: number;
  unmatchedTimedRows: number;
};

export async function extractScheduleDocument(input: {
  fileName: string;
  mimeType?: string;
  bytes: Uint8Array;
}) {
  if (input.bytes.byteLength === 0) {
    throw new Error("The selected file is empty.");
  }

  if (input.bytes.byteLength > MAX_SCHEDULE_IMPORT_BYTES) {
    throw new Error("Schedule files must be 15 MB or smaller.");
  }

  const fileType = detectFileType(input.fileName, input.mimeType);
  if (fileType === "PDF") {
    if (!hasPdfMagicBytes(input.bytes)) {
      throw new Error("The selected PDF does not have a valid PDF file signature.");
    }

    const parser = new PDFParse({ data: input.bytes });
    try {
      const result = await parser.getText();
      return { fileType, text: result.text };
    } finally {
      await parser.destroy();
    }
  }

  if (fileType !== "TXT" && fileType !== "CSV") {
    throw new Error("Supported schedule files are PDF, TXT, and CSV.");
  }

  return {
    fileType,
    text: new TextDecoder("utf-8", { fatal: false }).decode(input.bytes)
  };
}

export function parseScheduleDocument(
  text: string,
  fileType: DocumentImportJob["fileType"] = "TXT"
): ScheduleParseResult {
  if (fileType === "CSV") {
    return parseCsvScheduleDocument(text);
  }

  return parseLineScheduleDocument(text);
}

function parseLineScheduleDocument(text: string): ScheduleParseResult {
  const sessions: StaffDraftSession[] = [];
  let currentDay = "Monday Nov 2";
  let skippedOperationalRows = 0;
  let unmatchedTimedRows = 0;

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const normalizedLine = normalizeLine(rawLine);
    if (!normalizedLine || isDocumentChrome(normalizedLine)) {
      return;
    }

    const dayHeading = inferDayLabel(normalizedLine);
    if (dayHeading) {
      currentDay = dayHeading;
      return;
    }

    const parsedLine = parseTimedLine(normalizedLine);
    if (!parsedLine) {
      if (/^\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b/i.test(normalizedLine)) {
        unmatchedTimedRows += 1;
      }
      return;
    }

    if (isClearlyOperational(parsedLine.title)) {
      skippedOperationalRows += 1;
      return;
    }

    sessions.push({
      id: stableImportId(`${currentDay}:${parsedLine.start}:${parsedLine.end}:${parsedLine.title}:${index}`),
      day: currentDay,
      start: parsedLine.start,
      end: parsedLine.end,
      title: parsedLine.title,
      speaker: parsedLine.speaker || inferSpeaker(parsedLine.title),
      location: parsedLine.location || inferLocation(parsedLine.title) || "Needs location",
      audience: inferAudience(parsedLine.title),
      status: "Needs review",
      reminders: "10m"
    });
  });

  return { sessions, skippedOperationalRows, unmatchedTimedRows };
}

export function parseScheduleText(text: string): StaffDraftSession[] {
  return parseScheduleDocument(text).sessions;
}

function parseCsvScheduleDocument(text: string): ScheduleParseResult {
  const records = parseCsv(text, {
    bom: true,
    columns: (headers: string[]) => headers.map(normalizeCsvHeader),
    relax_column_count: true,
    skip_empty_lines: true,
    skip_records_with_empty_values: false,
    trim: true
  }) as Array<Record<string, string>>;

  if (records.length === 0) {
    return { sessions: [], skippedOperationalRows: 0, unmatchedTimedRows: 0 };
  }

  const headers = new Set(Object.keys(records[0] ?? {}));
  const titleHeader = findHeader(headers, ["title", "session", "session_title", "event", "activity", "program"]);
  const startHeader = findHeader(headers, ["start", "start_time", "time", "begins"]);
  if (!titleHeader || !startHeader) {
    throw new Error(
      "CSV files need a title/session column and a start/start time column. Optional columns include day, end, speaker, location, audience, and reminders."
    );
  }

  const dayHeader = findHeader(headers, ["day", "date", "event_day"]);
  const endHeader = findHeader(headers, ["end", "end_time", "ends"]);
  const speakerHeader = findHeader(headers, ["speaker", "presenter", "host", "talent"]);
  const locationHeader = findHeader(headers, ["location", "room", "venue", "stage"]);
  const audienceHeader = findHeader(headers, ["audience", "group", "visibility"]);
  const remindersHeader = findHeader(headers, ["reminders", "reminder", "notification", "notification_offsets"]);
  const occurrences = new Map<string, number>();
  const sessions: StaffDraftSession[] = [];
  let skippedOperationalRows = 0;
  let unmatchedTimedRows = 0;

  records.forEach((record) => {
    const title = cleanTitle(record[titleHeader] ?? "");
    const rawStart = record[startHeader] ?? "";
    const start = normalizeTime(rawStart);
    if (!title || !isRecognizedTime(start)) {
      if (title || rawStart) unmatchedTimedRows += 1;
      return;
    }

    if (isClearlyOperational(title)) {
      skippedOperationalRows += 1;
      return;
    }

    const explicitDay = dayHeader ? inferDayLabel(record[dayHeader] ?? "") : null;
    const day = explicitDay ?? cleanCsvValue(dayHeader ? record[dayHeader] : "") ?? "Needs day";
    const rawEnd = endHeader ? record[endHeader] ?? "" : "";
    const end = rawEnd && isRecognizedTime(normalizeTime(rawEnd)) ? normalizeTime(rawEnd) : addMinutes(start, 45);
    const location = cleanCsvValue(locationHeader ? record[locationHeader] : "") ?? inferLocation(title) ?? "Needs location";
    const speaker = cleanCsvValue(speakerHeader ? record[speakerHeader] : "") ?? inferSpeaker(title);
    const audience = cleanCsvValue(audienceHeader ? record[audienceHeader] : "") ?? inferAudience(title);
    const reminders = cleanCsvValue(remindersHeader ? record[remindersHeader] : "") ?? "10m";
    const fingerprint = `${day}:${start}:${end}:${title}`;
    const occurrence = (occurrences.get(fingerprint) ?? 0) + 1;
    occurrences.set(fingerprint, occurrence);

    sessions.push({
      id: stableImportId(`${fingerprint}:${occurrence}`),
      day,
      start,
      end,
      title,
      speaker,
      location,
      audience,
      status: "Needs review",
      reminders
    });
  });

  return { sessions, skippedOperationalRows, unmatchedTimedRows };
}

export function detectFileType(fileName: string, mimeType = ""): DocumentImportJob["fileType"] {
  const extension = fileName.toLowerCase().split(".").pop();
  if (mimeType === "application/pdf" || extension === "pdf") return "PDF";
  if (mimeType === "text/csv" || extension === "csv") return "CSV";
  if (mimeType.startsWith("text/") || extension === "txt") return "TXT";
  return "UNKNOWN";
}

function parseTimedLine(line: string) {
  const columns = line.split(/\t+/).map((value) => value.trim()).filter(Boolean);
  const primary = columns[0] ?? line;
  const leadingRange = primary.match(
    /^(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s+(.+)$/i
  );

  if (leadingRange?.[1] && leadingRange[2] && leadingRange[3]) {
    const legacyColumns = columns.length === 1 ? leadingRange[3].split(/\s+-\s+/).map((value) => value.trim()) : [];
    return {
      start: normalizeTime(leadingRange[1]),
      end: normalizeTime(leadingRange[2]),
      title: cleanTitle(legacyColumns[0] ?? leadingRange[3]),
      speaker: legacyColumns[1] ?? "",
      location: columns[1] ?? legacyColumns[2] ?? ""
    };
  }

  const leadingTime = primary.match(/^(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s+(.+)$/i);
  if (!leadingTime?.[1] || !leadingTime[2]) {
    return null;
  }

  const titleWithRange = leadingTime[2];
  const embeddedRange = titleWithRange.match(
    /\(\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*\)/i
  );
  const start = embeddedRange?.[1]
    ? normalizeTime(withInheritedMeridiem(embeddedRange[1], embeddedRange[2] ?? ""))
    : normalizeTime(leadingTime[1]);
  const end = embeddedRange?.[2] ? normalizeTime(embeddedRange[2]) : addMinutes(start, 45);
  const title = cleanTitle(titleWithRange.replace(embeddedRange?.[0] ?? "", ""));

  return title ? { start, end, title, speaker: "", location: columns[1] ?? "" } : null;
}

function inferDayLabel(line: string) {
  const match = line.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*,?\s*(?:November|Nov)\s+(\d{1,2})\b/i);
  if (match?.[1] && match[2]) {
    return `${capitalize(match[1])} Nov ${Number(match[2])}`;
  }

  const normalized = line.toLowerCase();
  if (normalized.includes("monday") || normalized.includes("november 2") || normalized.includes("nov 2")) return "Monday Nov 2";
  if (normalized.includes("tuesday") || normalized.includes("november 3") || normalized.includes("nov 3")) return "Tuesday Nov 3";
  if (normalized.includes("wednesday") || normalized.includes("november 4") || normalized.includes("nov 4")) return "Wednesday Nov 4";
  return null;
}

function isClearlyOperational(title: string) {
  return /\b(?:load[ -]?in|loaded in|box truck|loading dock rental|av (?:load|continues|ready)|run[ -]?through|rehearsal|sound check|volunteers?|decor|strike|human arrows?|room clear|final touches|check weather|items consolidated|stanchions|screens\/programming)\b/i.test(title);
}

function inferSpeaker(title: string) {
  const relationship = title.match(/\b(?:with|by)\s+([^()]+)$/i)?.[1]?.trim();
  if (relationship) return relationship;

  const performance = title.match(/^(.+?)\s+(?:Performance|Keynote|Conversation|Talk)\b/i)?.[1]?.trim();
  if (performance && !/^(?:a|an|the|opening|closing|welcome|featured|keynote|community|panel)$/i.test(performance)) {
    return performance;
  }

  return "Unassigned";
}

function inferAudience(title: string) {
  return /\bfounders?'?\b/i.test(title) ? "Founders only" : "All attendees";
}

function inferLocation(value: string) {
  const locationMatch = value.match(/\b(?:at|in)\s+([A-Z][A-Za-z0-9&' ]{3,})$/);
  return locationMatch?.[1]?.trim() ?? null;
}

function normalizeTime(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match?.[1] || !match[3]) return value.trim();
  return `${Number(match[1])}:${match[2] ?? "00"} ${match[3].toUpperCase()}`;
}

function isRecognizedTime(value: string) {
  return /^\d{1,2}:\d{2}\s*(?:AM|PM)$/i.test(value);
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function findHeader(headers: Set<string>, candidates: string[]) {
  return candidates.find((candidate) => headers.has(candidate));
}

function cleanCsvValue(value: string | undefined) {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function addMinutes(value: string, minutesToAdd: number) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match?.[1] || !match[2] || !match[3]) return value;
  const hour12 = Number(match[1]);
  const minute = Number(match[2]);
  const hour24 = match[3].toUpperCase() === "PM" && hour12 !== 12 ? hour12 + 12 : match[3].toUpperCase() === "AM" && hour12 === 12 ? 0 : hour12;
  const totalMinutes = (hour24 * 60 + minute + minutesToAdd) % (24 * 60);
  const nextHour24 = Math.floor(totalMinutes / 60);
  const nextMinute = totalMinutes % 60;
  const nextMeridiem = nextHour24 >= 12 ? "PM" : "AM";
  const nextHour12 = nextHour24 % 12 || 12;
  return `${nextHour12}:${String(nextMinute).padStart(2, "0")} ${nextMeridiem}`;
}

function withInheritedMeridiem(value: string, endValue: string) {
  return /\b(?:AM|PM)\b/i.test(value) ? value : `${value} ${endValue.match(/(AM|PM)\b/i)?.[1] ?? ""}`.trim();
}

function cleanTitle(value: string) {
  return value.replace(/\s+/g, " ").replace(/[|\-]+$/g, "").trim();
}

function normalizeLine(value: string) {
  return value.replace(/\u2013|\u2014/g, "-").replace(/\u00a0/g, " ").trim();
}

function isDocumentChrome(line: string) {
  return /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line) || /^last updated\b/i.test(line) || /^day\s+time\s+activity\b/i.test(line);
}

function hasPdfMagicBytes(bytes: Uint8Array) {
  return bytes.byteLength >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function stableImportId(input: string) {
  const hash = createHash("sha256").update(input).digest("hex");
  return `imported-${hash.slice(0, 12)}`;
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;
}
