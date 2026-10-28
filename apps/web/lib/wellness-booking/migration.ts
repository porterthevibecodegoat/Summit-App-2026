import { wellnessSessionById } from "../wellness-signups-2026";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { WorkshopSubmission } from "../staff/store";
import type { CapacityRules } from "./capacity";
import { wellnessAttendeeKey } from "./service";

// A read-only plan, never an import. Existing guests are not automatically
// downgraded to a waitlist to make a proposed cap fit.
export function planWellnessMigration(rows: readonly WorkshopSubmission[], rules: CapacityRules) {
  const issues: { sourceRecordId: string; reason: string }[] = [];
  const active: { sourceRecordId: string; sessionId: string; attendeeKey: string; preserveExistingPlace: true }[] = [];
  const seen = new Set<string>();
  for (const row of [...rows].filter(row => row.category === "wellness").sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))) {
    const status = row as WorkshopSubmission & { removedAt?: string; cancelledAt?: string; isTest?: boolean };
    const aliases = [row.email ? `email:${row.email.trim().toLowerCase()}` : null, row.phone ? `phone:${row.phone.replace(/\D/g, "")}` : null].filter(Boolean).map(value => `${value}:${row.name.trim().toLowerCase()}:${row.sessionId}`);
    const duplicate = aliases.some(key => seen.has(key));
    for (const key of aliases) seen.add(key);
    if (duplicate) { issues.push({ sourceRecordId: row.id, reason: "Older duplicate or cancellation history; review before importing." }); continue; }
    if (status.removedAt || status.cancelledAt || status.isTest) continue;
    if (!z.uuid().safeParse(row.id).success || !Number.isFinite(Date.parse(row.submittedAt))) { issues.push({ sourceRecordId: row.id, reason: "Legacy record identity/date needs a reviewed mapping." }); continue; }
    if (!wellnessSessionById.has(row.sessionId)) { issues.push({ sourceRecordId: row.id, reason: "Retired or unknown activity; review without deleting the original record." }); continue; }
    if (!row.email || !row.phone || !row.name) { issues.push({ sourceRecordId: row.id, reason: "Missing identity/contact details; preserve for staff review." }); continue; }
    const attendeeKey = wellnessAttendeeKey(row.email, row.name), key = `${attendeeKey}:${row.sessionId}`;
    if (seen.has(key)) { issues.push({ sourceRecordId: row.id, reason: "Older duplicate; review identity and history before importing." }); continue; }
    seen.add(key);
    active.push({ sourceRecordId: row.id, sessionId: row.sessionId, attendeeKey, preserveExistingPlace: true });
    if (!row.waiverAccepted || !row.signature || !row.waiverVersion) issues.push({ sourceRecordId: row.id, reason: "Legacy waiver needs review; do not silently remove an existing place." });
  }
  const sessions = [...wellnessSessionById.values()].map(session => {
    const existing = active.filter(row => row.sessionId === session.id).length, policy = rules.get(session.id);
    return { sessionId: session.id, existing, capacity: policy ?? { mode: "unset", maxPlaces: null }, needsCapacityDecision: !policy || policy.mode === "unset", overProposedCapacity: policy?.mode === "limited" ? Math.max(0, existing - policy.maxPlaces) : 0 };
  });
  const snapshot = [...rows].sort((a, b) => a.id.localeCompare(b.id)).map(row => Object.fromEntries(Object.keys(row).sort().map(key => [key, row[key as keyof WorkshopSubmission]])));
  return { dryRun: true as const, requiresOwnerApproval: true as const, existingRecordsChanged: false as const, sourceSnapshotHash: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"), active, issues, sessions, readyForReviewedMigration: issues.length === 0 && sessions.every(session => !session.needsCapacityDecision && session.overProposedCapacity === 0) };
}
