import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { event2026Snapshot } from "../packages/test-fixtures/src/event-2026.ts";
import { eventSnapshotSchema } from "../packages/validation/src/index.ts";
import { snapshotToDraftSessions } from "../apps/admin/lib/live-ops-store.ts";

// This only replaces the local development store. It never publishes to Supabase.
const root = resolve(import.meta.dirname, "..");
const path = resolve(root, "work/live-ops-store.json");
const before = await readFile(path, "utf8");
const store = JSON.parse(before);
const response = await fetch("https://summit-app-2026-admin.vercel.app/api/snapshot", { cache: "no-store" });
if (!response.ok) throw new Error(`Published snapshot returned HTTP ${response.status}.`);
const snapshot = eventSnapshotSchema.parse(await response.json());
if (store.eventId !== snapshot.event.id || snapshot.event.id !== event2026Snapshot.event.id || snapshot.revision < event2026Snapshot.revision) {
  throw new Error("Event identity or reviewed 2026 revision did not match.");
}
const expectedRevision = Number(process.argv.find(value => value.startsWith("--expected-local-revision="))?.split("=")[1]);
if (store.revision !== expectedRevision) throw new Error(`Expected local revision must match ${store.revision}. Review local edits first.`);
console.log(JSON.stringify({ localRevision: store.revision, publishedRevision: snapshot.revision, previousSessions: store.publishedSnapshot.scheduleItems.length, publishedSessions: snapshot.scheduleItems.length, confirmedGuests: snapshot.speakers.length, cloudWrites: 0 }));
if (!process.argv.includes("--apply")) {
  console.log("Preview only. --apply replaces local drafts and active content after making a private backup.");
} else {
  const now = new Date().toISOString();
  const backupDirectory = resolve(root, "work/acceptance/ros-2026");
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(resolve(backupDirectory, `local-store-before-${now.replaceAll(":", "-")}.json`), before, { mode: 0o600, flag: "wx" });
  const next = {
    ...store,
    revision: snapshot.revision,
    publishedSnapshot: snapshot,
    draftSessions: snapshotToDraftSessions(snapshot),
    revisionHistory: [store.publishedSnapshot, ...(store.revisionHistory ?? [])].slice(0, 10),
    lastPublishedAt: now,
    lastPublishedMessage: `Local development copy refreshed from published revision ${snapshot.revision}. No cloud publication or push dispatch.`,
    notificationJobs: (store.notificationJobs ?? []).map(job => ["queued", "scheduled", "processing"].includes(job.status) ? { ...job, status: "superseded" } : job),
    activityLog: [{ id: randomUUID(), action: "SYNC_LOCAL_FROM_PUBLISHED", actorRole: "ADMIN", detail: `Replaced local active content and drafts with published revision ${snapshot.revision}.`, createdAt: now }, ...(store.activityLog ?? [])]
  };
  if (await readFile(path, "utf8") !== before) throw new Error("Local store changed during review; refusing to overwrite it.");
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(next, null, 2), { mode: 0o600, flag: "wx" });
  await rename(temporaryPath, path);
  const verified = JSON.parse(await readFile(path, "utf8"));
  if (JSON.stringify(verified) !== JSON.stringify(next)) throw new Error("Local replacement verification failed.");
  console.log("Verified local content and working drafts; backup and revision history retained. No push sent.");
}
