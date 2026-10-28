import { createHash, randomUUID } from "node:crypto";
import { programApprovalPayloadSchema, type SubmissionStore, type TextPreferenceRecord, type WorkshopSubmission } from "../staff/store";
import { programId, timeZone, wellnessActivityCatalog, type Activity } from "./catalog";
import { smsPhone } from "./phone";

type Permission = { eventRemindersAllowed: true; scope: "event-only" | "event-and-updates"; permissionBasis: string; evidenceRecordId: string; recordedAt: string };
export type Selection = Activity & { sourceKind: "workshop"; sourceRecordId: string; registrationStatus: "registered" | "confirmed"; reminderEligible: true; sms: Permission };
export type Recipient = { recipientKey: string; name: string; phone: string; sms: Permission; selections: Selection[] };
export type BookingStatus = "registered" | "waitlisted" | "cancelled";
type Lifecycle = { removedAt?: string; cancelledAt?: string; isTest?: boolean; bookingStatus?: BookingStatus };
const normalized = (value: string | undefined) => (value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
const newer = <T extends { submittedAt: string; id: string }>(rows: readonly T[]) => [...rows].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt) || b.id.localeCompare(a.id));

function checked(records: readonly { id: string; submittedAt: string }[]) {
  for (const row of records) if (!row || typeof row.id !== "string" || !row.id || !Number.isFinite(Date.parse(row.submittedAt))) throw new Error("Invalid source record.");
}

function permission(row: WorkshopSubmission, preferences: TextPreferenceRecord[]): Permission | null {
  const phone = smsPhone(row.phone), email = normalized(row.email);
  const matches = newer(preferences.filter(p => smsPhone(p.phone) === phone || (email && normalized(p.email) === email)));
  const lastNo = matches.find(p => p.choice === "no");
  const phoneYes = matches.find(p => p.choice === "yes" && smsPhone(p.phone) === phone);
  if (lastNo && (!phoneYes || Date.parse(phoneYes.submittedAt) <= Date.parse(lastNo.submittedAt))) return null;
  if (phoneYes) return { eventRemindersAllowed: true, scope: "event-and-updates", permissionBasis: "text-preference", evidenceRecordId: phoneYes.id, recordedAt: phoneYes.submittedAt };
  if (row.textConsent) return { eventRemindersAllowed: true, scope: "event-and-updates", permissionBasis: "form-checkbox", evidenceRecordId: row.id, recordedAt: row.submittedAt };
  // Match the site's existing October 12 event-only policy. Imported/staff
  // contacts need their own positive consent evidence; do not borrow numbers.
  if (row.source === "form") return { eventRemindersAllowed: true, scope: "event-only", permissionBasis: "event-only-site-policy", evidenceRecordId: row.id, recordedAt: row.submittedAt };
  return null;
}

export async function buildWellnessAgenda(store: SubmissionStore, options: {
  now?: Date | undefined; activities?: ReadonlyMap<string, Activity> | undefined;
  bookingStatuses?: ReadonlyMap<string, BookingStatus> | undefined;
} = {}) {
  const [allWorkshops, preferences, approvals] = await Promise.all([
    store.list("workshop"), store.list("textPreference"), store.list("programApproval"),
  ]);
  const workshops = allWorkshops.filter(row => row.category === "wellness");
  for (const rows of [workshops, preferences, approvals]) checked(rows);
  if (preferences.some(p => (p.choice !== "yes" && p.choice !== "no") || (!smsPhone(p.phone) && !normalized(p.email)))) throw new Error("Invalid text preference source.");
  if (approvals.some(row => !programApprovalPayloadSchema.safeParse(row).success)) throw new Error("Invalid approval source.");
  const activities = new Map([...(options.activities ?? wellnessActivityCatalog)].filter(([id]) =>
    wellnessActivityCatalog.has(id) || /^wellness-test-[a-z0-9-]+$/.test(id)));
  const excludedCounts = { optedOut: 0, missingOrInvalidContact: 0, ambiguousIdentity: 0, removedOrReplaced: 0, unknownActivity: 0, missingPermission: 0, heldByStaff: 0, unconfirmedCapacity: 0 };
  const groups = new Map<string, { row: WorkshopSubmission; activity: Activity; confirmed: boolean }[]>();
  const identities = new Map<string, Set<string>>();
  const keys = new Set<string>();
  for (const row of newer(workshops)) {
    if (typeof row.name !== "string" || typeof row.sessionId !== "string" || !normalized(row.name)) throw new Error("Invalid wellness source.");
    const phone = smsPhone(row.phone), email = normalized(row.email);
    const aliases = [email && `email:${email}`, phone && `phone:${phone}`].filter(Boolean).map(identity => `${identity}:${normalized(row.name)}:${row.sessionId}`);
    if (!aliases.length) aliases.push(`record:${row.id}`);
    const seen = aliases.some(key => keys.has(key));
    for (const key of aliases) keys.add(key);
    if (seen) { excludedCounts.removedOrReplaced++; continue; }
    const lifecycle = row as WorkshopSubmission & Lifecycle;
    if (lifecycle.removedAt || lifecycle.cancelledAt || lifecycle.isTest) { excludedCounts.removedOrReplaced++; continue; }
    if (!phone) { excludedCounts.missingOrInvalidContact++; continue; }
    const names = identities.get(phone) ?? new Set<string>(); names.add(normalized(row.name)); identities.set(phone, names);
    const activity = activities.get(row.sessionId);
    if (!activity) { excludedCounts.unknownActivity++; continue; }
    const bookingStatus = options.bookingStatuses ? options.bookingStatuses.get(row.id) : lifecycle.bookingStatus;
    if ((options.bookingStatuses && !bookingStatus) || (bookingStatus && bookingStatus !== "registered")) { excludedCounts.unconfirmedCapacity++; continue; }
    const decisions = approvals.filter(a => a.sourceKind === "workshop" && a.sourceId === row.id && a.eventKey === row.sessionId)
      .sort((a, b) => Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt) || b.id.localeCompare(a.id));
    // A hold/decline wins a tied approval timestamp. No approval is required for
    // an ordinary wellness signup unless staff have explicitly held/declined it.
    const decision = decisions[0];
    const contactHeld = (value: typeof decision) => value && value.confirmationStatus !== "ready" && value.confirmationStatus !== "sent";
    const tiedHold = decision && decisions.some(a => Date.parse(a.reviewedAt) === Date.parse(decision.reviewedAt) && (a.decision !== "approved" || contactHeld(a)));
    if (decision && (decision.decision !== "approved" || decision.approvedQuantity < 1 || contactHeld(decision) || tiedHold)) { excludedCounts.heldByStaff++; continue; }
    const group = groups.get(phone) ?? []; group.push({ row, activity, confirmed: Boolean(decision) }); groups.set(phone, group);
  }
  const recipients: Recipient[] = [];
  for (const [phone, group] of groups) {
    if (identities.get(phone)?.size !== 1) { excludedCounts.ambiguousIdentity += group.length; continue; }
    const permitted = group.map(candidate => ({ ...candidate, sms: permission(candidate.row, preferences) }));
    // An opt-out applying to any of this person's contact aliases suppresses
    // the entire phone, even when another selection carries a new checkbox.
    const optedOut = group.some(({ row }) => {
      const aliases = preferences.filter(p => smsPhone(p.phone) === phone || (normalized(row.email) && normalized(p.email) === normalized(row.email)));
      const no = newer(aliases.filter(p => p.choice === "no"))[0];
      const yes = newer(aliases.filter(p => p.choice === "yes" && smsPhone(p.phone) === phone))[0];
      return no && (!yes || Date.parse(yes.submittedAt) <= Date.parse(no.submittedAt));
    });
    if (optedOut) { excludedCounts.optedOut += group.length; continue; }
    const selections = new Map<string, Selection>();
    for (const { row, activity, confirmed, sms } of permitted) {
      if (!sms) { excludedCounts.missingPermission++; continue; }
      selections.set(activity.activityOccurrenceId, { ...activity, sourceKind: "workshop", sourceRecordId: row.id, registrationStatus: confirmed ? "confirmed" : "registered", reminderEligible: true, sms });
    }
    if (!selections.size) continue;
    const sorted = [...selections.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.activityId.localeCompare(b.activityId));
    recipients.push({ recipientKey: createHash("sha256").update(`${programId}:${phone}`).digest("hex"), name: group[0]!.row.name, phone, sms: sorted[0]!.sms, selections: sorted });
  }
  return { schemaVersion: 1 as const, programId, scope: "wellness" as const, snapshotId: randomUUID(), generatedAt: (options.now ?? new Date()).toISOString(), complete: true as const, timeZone, recipients: recipients.sort((a, b) => a.recipientKey.localeCompare(b.recipientKey)), excludedCounts };
}

export type Agenda = Awaited<ReturnType<typeof buildWellnessAgenda>>;
