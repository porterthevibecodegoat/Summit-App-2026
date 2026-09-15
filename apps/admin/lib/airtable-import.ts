import { createHash } from "node:crypto";
import { parse as parseCsv } from "csv-parse/sync";
import type { Speaker } from "@not-alone/validation";

export type AirtableGuestImportResult = {
  speakers: Speaker[];
  confirmedRows: number;
  withheldRows: number;
  duplicateRows: number;
};

export function parseAirtableGuestCsv(text: string, eventId: string): AirtableGuestImportResult {
  const records = parseCsv(text, {
    bom: true,
    columns: (headers: string[]) => headers.map(normalizeHeader),
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true
  }) as Array<Record<string, string>>;

  const headers = new Set(Object.keys(records[0] ?? {}));
  const nameField = findHeader(headers, ["name", "guest", "talent"]);
  const statusField = findHeader(headers, ["summit_status", "status"]);
  if (!nameField || !statusField) {
    throw new Error("Airtable guest CSV files need Name and Summit Status columns.");
  }

  const roleField = findHeader(headers, ["occupation", "summit_role", "role"]);
  const bioField = findHeader(headers, ["bio", "biography"]);
  const headshotField = findHeader(headers, ["headshot", "photo", "image"]);
  const speakers: Speaker[] = [];
  const seen = new Set<string>();
  let confirmedRows = 0;
  let withheldRows = 0;
  let duplicateRows = 0;

  for (const record of records) {
    const name = clean(record[nameField]);
    const status = clean(record[statusField]).toLowerCase();
    if (status !== "confirmed" || !name || /\bTBC\b/i.test(name)) {
      withheldRows += 1;
      continue;
    }

    confirmedRows += 1;
    const key = name.toLowerCase();
    if (seen.has(key)) {
      duplicateRows += 1;
      continue;
    }
    seen.add(key);

    speakers.push({
      id: stableUuid(`${eventId}:${key}`),
      eventId,
      name,
      role: clean(roleField ? record[roleField] : "") || "Confirmed 2026 summit guest",
      bio: clean(bioField ? record[bioField] : ""),
      headshotUrl: firstUrl(headshotField ? record[headshotField] : ""),
      published: false
    });
  }

  return { speakers, confirmedRows, withheldRows, duplicateRows };
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function findHeader(headers: Set<string>, candidates: string[]) {
  return candidates.find((candidate) => headers.has(candidate));
}

function clean(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function firstUrl(value: string | undefined) {
  return value?.match(/https?:\/\/[^\s,)]+/i)?.[0] ?? null;
}

function stableUuid(value: string) {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16] ?? "0", 16) % 4] ?? "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}
