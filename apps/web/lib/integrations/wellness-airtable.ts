import { createHash } from "node:crypto";
import target from "../../config/wellness-airtable-2026.draft.json";
import { siteVisitWaiverProblem, type SubmissionStore, type WorkshopSubmission } from "../staff/store";
import { ledgerSchema, type Ledger, type VersionedLedgerStore } from "../wellness-booking/ledger";
import { authenticated, integrationJson } from "./http";
import { integrationBookingStore, integrationStore } from "./store";

type SourceRow = WorkshopSubmission & { removedAt?: string; cancelledAt?: string; isTest?: boolean; bookingStatus?: string };
type SourceReviewReason = "contact-name-conflict" | "contact-details-differ" | "activity-title-changed" | "activity-time-changed";
type VerifiedLinks = { guestsBySourceRecordId?: ReadonlyMap<string, string>; sessionsByWebsiteSessionId?: ReadonlyMap<string, string>; reviewReasonsBySourceRecordId?: ReadonlyMap<string, readonly SourceReviewReason[]> };
const reviewNotes = {
  "unmatched-guest": "Guest Tracker identity needs verification; no guest link was assigned.",
  "unmatched-session": "Programming activity link needs verification.",
  "booking-needs-review": "Booking state needs review; this row does not confirm a place.",
  "contact-name-conflict": "Signup contact matches a different roster name. Keep this signup separate until identity is verified.",
  "contact-details-differ": "Signup and contact-sheet details differ. Original contacts are preserved; verify before any future sending.",
  "activity-title-changed": "The current programming title differs from the original signup. The original selection label is preserved.",
  "activity-time-changed": "The current programming time differs from the original signup. The original selection time is preserved.",
} as const;
type Fields = Record<string, string | number | null | string[]>;
// This new read-only feed can use live source data without switching the
// existing reminder rehearsal or STOP callback out of its isolated test source.
export function airtableSourceEnvironment(env: Partial<NodeJS.ProcessEnv>) {
  const mode = env.WELLNESS_AIRTABLE_SOURCE_MODE ?? "test";
  if (mode !== "test" && mode !== "live") throw new Error("Invalid Airtable source mode.");
  const result: Partial<NodeJS.ProcessEnv> = { ...env, REMINDER_SOURCE_MODE: mode, REMINDER_SOURCE_WRITES_ENABLED: "false" };
  if (mode === "live") delete result.INTEGRATION_TEST_STORE_PREFIX;
  return result;
}
const recordId = /^rec[A-Za-z0-9]{14}$/;
const timestamp = (value: string) => {
  if (!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error("Invalid source timestamp.");
  return new Date(value).toISOString();
};

/** Private operational projection only. Never a recipient list or a booking writer. */
export function projectWellnessSignups(workshops: readonly SourceRow[], options: VerifiedLinks & { ledger?: Ledger; now?: Date } = {}) {
  const now = (options.now ?? new Date()).toISOString();
  const ledger = options.ledger ? ledgerSchema.parse(options.ledger) : undefined;
  const pending = new Set(ledger?.intakes.filter(intake => !intake.materializedAt).flatMap(intake => intake.sourceRecordIds));
  const latestBookings = new Map<string, NonNullable<typeof ledger>["bookings"][number]>();
  for (const booking of [...(ledger?.bookings ?? [])].sort((a, b) => a.sequence - b.sequence)) latestBookings.set(booking.sourceRecordId, booking);
  const waitlistPositions = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const booking of [...latestBookings.values()].sort((a, b) => a.sequence - b.sequence)) {
    if (booking.status !== "waitlisted") continue;
    const position = (counts.get(booking.sessionId) ?? 0) + 1;
    counts.set(booking.sessionId, position); waitlistPositions.set(booking.sourceRecordId, position);
  }
  const sourceIds = new Set<string>();
  const rows = workshops.filter(row => row.category === "wellness");
  for (const row of rows) {
    if (!row.id || sourceIds.has(row.id)) throw new Error("Missing or duplicate source identity.");
    sourceIds.add(row.id);
  }
  // A missing, fully materialized source is a broken snapshot, not a deletion instruction.
  if ([...latestBookings.values()].some(booking => !pending.has(booking.sourceRecordId) && !sourceIds.has(booking.sourceRecordId))) throw new Error("Incomplete booking source.");

  return rows.filter(row => row.isTest !== true && !row.sessionId?.startsWith("wellness-test-")).sort((a, b) => a.id.localeCompare(b.id)).map(row => {
    if (typeof row.name !== "string" || !row.name.trim() || typeof row.sessionId !== "string" || !row.sessionId.trim() || typeof row.sessionTitle !== "string" || !row.sessionTitle.trim()) throw new Error("Invalid wellness source.");
    const submittedAt = timestamp(row.submittedAt);
    const booking = latestBookings.get(row.id);
    if (booking && booking.sessionId !== row.sessionId) throw new Error("Mismatched booking session.");
    const cancellationAt = row.cancelledAt ? timestamp(row.cancelledAt) : row.removedAt ? timestamp(row.removedAt) : undefined;
    const status = cancellationAt ? "Cancelled" : pending.has(row.id) ? "Needs review" : booking ? {
      registered: "Registered", waitlisted: "Waitlisted", cancelled: "Cancelled",
    }[booking.status] : ledger || row.bookingStatus ? "Needs review" : "Signup received";
    const guestId = options.guestsBySourceRecordId?.get(row.id);
    const sessionId = options.sessionsByWebsiteSessionId?.get(row.sessionId);
    if ((guestId && !recordId.test(guestId)) || (sessionId && !recordId.test(sessionId))) throw new Error("Invalid verified link.");
    const issues = [...(!guestId ? ["unmatched-guest" as const] : []), ...(!sessionId ? ["unmatched-session" as const] : []), ...(status === "Needs review" ? ["booking-needs-review" as const] : []), ...(options.reviewReasonsBySourceRecordId?.get(row.id) ?? [])];
    const anyWaiver = row.waiverAccepted !== undefined || Boolean(row.signature || row.waiverVersion);
    const fields: Fields = {
      [target.fields.Signup]: [row.name.trim(), row.sessionTitle.trim(), row.sessionDay, row.sessionTime].filter(Boolean).join(" · "),
      [target.fields["Source Record ID"]]: row.id,
      [target.fields["Guest Name"]]: row.name.trim(),
      [target.fields["Website Session ID"]]: row.sessionId,
      [target.fields["Booking Status"]]: status,
      [target.fields["Source Submitted At"]]: submittedAt,
      [target.fields["Source Updated At"]]: [submittedAt, booking?.updatedAt, cancellationAt].filter((v): v is string => Boolean(v)).map(timestamp).sort().at(-1)!,
      [target.fields["Waitlist Position"]]: status === "Waitlisted" ? waitlistPositions.get(row.id)! : null,
      [target.fields["Waiver Status"]]: !anyWaiver ? "Not supplied" : siteVisitWaiverProblem(row) ? "Needs review" : "Recorded",
      // A cell is never consent evidence. The final sender must freshly reconcile
      // website STOP records, ClickSend suppression and All Summit Data Do Not Text.
      [target.fields["Text Permission"]]: "Not evaluated",
      [target.fields["Booking ID"]]: booking?.id ?? null,
      [target.fields["Sync State"]]: status === "Needs review" ? "Needs attention" : !guestId ? "Unmatched guest" : !sessionId ? "Unmatched session" : issues.length ? "Needs attention" : "Current",
      [target.fields["Sync Details"]]: issues.map(issue => reviewNotes[issue]).join(" "),
      ...(guestId ? { [target.fields.Guest]: [guestId] } : {}),
      ...(sessionId ? { [target.fields.Session]: [sessionId] } : {}),
    };
    const revision = createHash("sha256").update(JSON.stringify(fields)).digest("hex");
    fields[target.fields["Source Revision"]] = revision;
    fields[target.fields["Last Synced At"]] = now;
    // Staff Notes and unverified links are deliberately omitted, never cleared.
    return { sourceRecordId: row.id, sourceRevision: revision, issues, fields };
  });
}

type Dependencies = VerifiedLinks & {
  store?: SubmissionStore; storeProvider?: () => Promise<SubmissionStore>;
  bookingStoreProvider?: () => Promise<VersionedLedgerStore | undefined>;
  env?: Partial<NodeJS.ProcessEnv>; now?: Date;
};

export async function wellnessAirtableGet(request: Request, dependencies: Dependencies = {}) {
  const env = dependencies.env ?? process.env;
  if (!authenticated(request, env.WELLNESS_AIRTABLE_FEED_TOKEN)) return integrationJson({ error: "Unauthorized." }, 401);
  try {
    const store = dependencies.store ?? await (dependencies.storeProvider ?? integrationStore)();
    const bookingStore = await (dependencies.bookingStoreProvider ?? (() => integrationBookingStore(env)))();
    const snapshot = bookingStore ? await bookingStore.read() : undefined;
    if (bookingStore && !snapshot) throw new Error("Booking snapshot is not initialized.");
    const workshops = await store.list("workshop");
    const previewRecords = projectWellnessSignups(workshops, { ...dependencies, ...(snapshot ? { ledger: snapshot.value } : {}) });
    return integrationJson({
      schemaVersion: 1, scope: "wellness", complete: true, generatedAt: (dependencies.now ?? new Date()).toISOString(),
      mode: "preview-only", syncEnabled: false, sendApproval: "pending", records: [], previewRecords,
      target: { baseId: target.baseId, tableId: target.tableId, mergeField: target.fields["Source Record ID"] },
    });
  } catch {
    return integrationJson({ error: "A complete wellness signup snapshot is unavailable. Hold syncing and retry." }, 503);
  }
}
