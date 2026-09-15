import { existsSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const envPath = resolve(rootDir, ".env");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") process.loadEnvFile(envPath);

const [{ confirmedSummitGuests2026 }, { eventSnapshotSchema }] = await Promise.all([
  import("../packages/config/src/index.ts"),
  import("../packages/validation/src/index.ts")
]);

const apply = process.argv.includes("--apply");
const supabaseUrl = requiredEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const eventId = process.env.EVENT_ID ?? "not-alone-summit-2026-prototype";
const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json"
};

const revisionRows = await request(
  `/rest/v1/schedule_revisions?event_id=eq.${encodeURIComponent(eventId)}&select=revision,snapshot&order=revision.desc&limit=1`
);
const current = eventSnapshotSchema.parse(revisionRows[0]?.snapshot);
const approvedSpeakerIds = new Set(
  current.speakers
    .filter((speaker) => confirmedSummitGuests2026.includes(speaker.name))
    .map((speaker) => speaker.id)
);
const copyReplacements = new Map([
  ["Harry Hudson Performance", ["Opening Night Performance", "Opening Performance", "A short opening-night music performance."]],
  ["Jewel Performance", ["Featured Main-Stage Performance", "Featured Performance", "A featured main-stage performance."]],
  ["Mindfulness and Music by Jewel", ["Mindfulness and Music", "Mindfulness Music", "A closing main-stage mindfulness and music moment."]],
  ["Closing Dinner and Rachel Platten Concert", ["Closing Dinner and Concert", "Closing Dinner", "A closing dinner followed by a featured concert."]]
]);
const unsupportedNameReplacements = [
  [/Harry Hudson/gi, "featured artist"],
  [/\bJewel\b/gi, "featured artist"],
  [/Kelsey Patel/gi, "meditation guide"],
  [/Tallulah Willis/gi, "featured guest"],
  [/Rachel Platten/gi, "featured artist"]
];
const nowUtc = new Date().toISOString();
const nextRevision = current.revision + 1;
let changedRows = 0;
const scheduleItems = current.scheduleItems.map((item) => {
  const replacement = copyReplacements.get(item.title);
  const speakerIds = item.speakerIds.filter((id) => approvedSpeakerIds.has(id));
  const title = scrubUnsupportedNames(replacement?.[0] ?? item.title);
  const shortTitle = scrubUnsupportedNames(replacement?.[1] ?? item.shortTitle);
  const summary = scrubUnsupportedNames((replacement?.[2] ?? item.summary)
    .replace(/^Kelsey Patel at /, "Guided meditation at ")
    .replace(/^Tallulah Willis at /, "Art and healing session at "));
  const description = scrubUnsupportedNames(replacement?.[2] ?? item.description);
  const changed = title !== item.title || shortTitle !== item.shortTitle || summary !== item.summary ||
    description !== item.description || speakerIds.length !== item.speakerIds.length;
  if (changed) changedRows += 1;
  return {
    ...item,
    title,
    shortTitle,
    summary,
    description,
    speakerIds,
    revision: nextRevision,
    updatedAt: nowUtc,
    publishedAt: nowUtc
  };
});
const snapshot = eventSnapshotSchema.parse({ ...current, revision: nextRevision, serverTimeUtc: nowUtc, scheduleItems });
const report = { currentRevision: current.revision, nextRevision, changedRows, scheduleItems: scheduleItems.length, action: apply ? "publish" : "preview" };

if (!apply) {
  console.log(JSON.stringify(report, null, 2));
  console.log("No changes made. Re-run with --apply to publish the reviewed schedule correction.");
  process.exit(0);
}

const result = await request("/rest/v1/rpc/publish_event_snapshot_revision_v2", {
  method: "POST",
  body: {
    p_event_id: eventId,
    p_expected_previous_revision: current.revision,
    p_snapshot: snapshot,
    p_source: "MANUAL_EDITOR",
    p_changes_count: changedRows,
    p_notification_jobs: [],
    p_notify_attendees: false,
    p_actor_id: null,
    p_actor_role: "ADMIN",
    p_rollback_of_revision: null
  }
});
console.log(JSON.stringify({ ...report, result }, null, 2));

function requiredEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment value: ${names.join(" or ")}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

function scrubUnsupportedNames(value) {
  return unsupportedNameReplacements.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    value
  );
}
