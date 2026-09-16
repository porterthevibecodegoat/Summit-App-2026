import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { event2026Snapshot } from "../packages/test-fixtures/src/event-2026.ts";
import { eventSnapshotSchema } from "../packages/validation/src/index.ts";

const root = resolve(import.meta.dirname, "..");
if (existsSync(resolve(root, ".env"))) process.loadEnvFile(resolve(root, ".env"));
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase server configuration is required.");
const eventId = event2026Snapshot.event.id;
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
async function request(path, body) {
  const response = await fetch(`${url}${path}`, { method: body ? "POST" : "GET", headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  return response.json();
}
const rows = await request(`/rest/v1/schedule_revisions?event_id=eq.${eventId}&select=revision,snapshot&order=revision.desc&limit=1`);
const current = eventSnapshotSchema.parse(rows[0]?.snapshot);
// This reviewed one-time replacement must not overwrite later staff publications.
if (current.revision !== 8) throw new Error(`Expected reviewed revision 8; found ${current.revision}. Reconcile intervening changes before publishing.`);
const now = new Date().toISOString();
const snapshot = eventSnapshotSchema.parse({
  ...event2026Snapshot, serverTimeUtc: now,
  scheduleItems: event2026Snapshot.scheduleItems.map(item => ({ ...item, updatedAt: now, publishedAt: now })),
  speakers: event2026Snapshot.speakers.map(person => {
    const previous = current.speakers.find(candidate => candidate.name === person.name || (person.name === "Jewel" && candidate.name === "Jewel Murray"));
    return { ...person, headshotUrl: previous?.headshotUrl ?? null };
  })
});
const report = {
  previousRevision: current.revision, nextRevision: snapshot.revision,
  removedHistoricalSessions: current.scheduleItems.length, timed2026Sessions: snapshot.scheduleItems.length,
  pendingTimingEntries: 5, staffOnlyExcluded: 1, confirmedGuests: snapshot.speakers.length,
  removedGuests: current.speakers.filter(person => !snapshot.speakers.some(next => next.name === person.name || (next.name === "Jewel" && person.name === "Jewel Murray"))).map(person => person.name),
  producerCredits: snapshot.speakers.filter(person => /producer/i.test(person.role)).map(person => `${person.name}: ${person.role}`),
  notificationsEnabled: false, airtableWrites: 0
};
console.log(JSON.stringify(report, null, 2));
if (!process.argv.includes("--apply")) {
  console.log("Preview only. Use --apply to publish the reviewed replacement.");
} else {
  const backupDirectory = resolve(root, "work/acceptance/ros-2026");
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(resolve(backupDirectory, "before-revision-8.json"), JSON.stringify(current, null, 2), { mode: 0o600 });
  const drafts = await request(`/rest/v1/schedule_drafts?event_id=eq.${eventId}&select=*`);
  await writeFile(resolve(backupDirectory, "before-working-drafts.json"), JSON.stringify(drafts, null, 2), { mode: 0o600 });
  await request("/rest/v1/rpc/publish_event_snapshot_revision_v2", {
    p_event_id: eventId, p_expected_previous_revision: current.revision, p_snapshot: snapshot,
    p_source: "DOCUMENT_IMPORT", p_changes_count: current.scheduleItems.length + snapshot.scheduleItems.length,
    p_notification_jobs: [], p_notify_attendees: false, p_actor_id: null, p_actor_role: "ADMIN", p_rollback_of_revision: null
  });
  const verified = await request(`/rest/v1/schedule_revisions?event_id=eq.${eventId}&select=revision,snapshot&order=revision.desc&limit=1`);
  const result = eventSnapshotSchema.parse(verified[0]?.snapshot);
  if (JSON.stringify(result) !== JSON.stringify(snapshot)) throw new Error("Published snapshot did not match the reviewed replacement.");
  await writeFile(resolve(backupDirectory, "after-revision-9.json"), JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log("Verified revision 9. Previous revision retained for audit/rollback; no push jobs created.");
}
