import { createHash } from "node:crypto";
import { z } from "zod";
import { siteVisitWaiverProblem, wellnessFormSchema, workshopPayloadSchema, programApprovalPayloadSchema, type SubmissionStore } from "../staff/store";
import { isUnlimitedSubmitter, submissionsPerPerson, normalEmail, normalPhone } from "../staff/submission-limit";
import { wellnessSessionById, wellnessClash } from "../wellness-signups-2026";
import { wellnessActivityCatalog } from "../integrations/catalog";
import { applyBookingCommand, bookingStatuses, emptyLedger, ledgerSchema, planBookingCommand, type Booking, type Ledger, type VersionedLedgerStore } from "./ledger";
import { buildWellnessAgenda } from "../integrations/agenda";
import type { CapacityRules } from "./capacity";
import { managementToken, readManagementToken } from "./management";

const hash = (input: string) => createHash("sha256").update(input).digest("hex");
const normalize = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
export const wellnessAttendeeKey = (email: string, name: string) => hash(`not-alone-wellness:${normalize(email)}:${normalize(name)}`);
const recordSchema = workshopPayloadSchema.omit({ website: true }).extend({ id: z.uuid(), source: z.literal("form"), category: z.literal("wellness"), submittedAt: z.iso.datetime(), waiverAcceptedAt: z.iso.datetime() }).strict();
export const privateIntakeSchema = z.object({ id: z.uuid(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), attendeeKey: z.string().regex(/^[a-f0-9]{64}$/), createdAt: z.iso.datetime(), expiresAt: z.iso.datetime(), records: z.array(recordSchema).min(1).max(16) }).strict();
export type PrivateIntake = z.infer<typeof privateIntakeSchema>;
export interface IntakeStore { read(id: string): Promise<PrivateIntake | null>; createIfNew(intake: PrivateIntake): Promise<boolean> }
export class BookingProblem extends Error { constructor(public status: number, message: string) { super(message); } }
export type BookingWorkflow = ReturnType<typeof createBookingWorkflow>;
const recordId = (requestId: string, sessionId: string) => {
  const hex = hash(`${requestId}:${sessionId}`);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

export function createBookingWorkflow(dependencies: {
  ledger: VersionedLedgerStore; intakes: IntakeStore; source: SubmissionStore; rules: CapacityRules;
  managementSecret: string; now?: () => Date;
}) {
  if (dependencies.managementSecret.length < 32) throw new Error("Wellness management is not configured.");
  const now = dependencies.now ?? (() => new Date());
  const read = async () => ledgerSchema.parse((await dependencies.ledger.read())?.value ?? emptyLedger());
  const scoped = (state: Ledger, intake: Ledger["intakes"][number]) => state.bookings.filter(booking => intake.sourceRecordIds.includes(booking.sourceRecordId) && booking.attendeeKey === intake.attendeeKey);
  const promotionHolds = async () => {
    const [rows, approvals] = await Promise.all([dependencies.source.list("workshop"), dependencies.source.list("programApproval")]);
    const blocked = new Set<string>();
    for (const row of rows.filter(row => row.category === "wellness")) {
      const lifecycle = row as typeof row & { removedAt?: string; cancelledAt?: string; isTest?: boolean };
      if (lifecycle.removedAt || lifecycle.cancelledAt || lifecycle.isTest) blocked.add(`${row.id}:${row.sessionId}`);
    }
    const latest = new Map<string, (typeof approvals)[number]>();
    for (const value of [...approvals].sort((a, b) => Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt))) {
      if (!programApprovalPayloadSchema.safeParse(value).success) throw new Error("Incomplete staff decision data.");
      if (value.sourceKind !== "workshop") continue;
      const key = `${value.sourceId}:${value.eventKey}`, current = latest.get(key);
      if (!current || (Date.parse(value.reviewedAt) === Date.parse(current.reviewedAt) && value.decision !== "approved")) latest.set(key, value);
    }
    for (const [key, value] of latest) if (value.decision !== "approved" || value.approvedQuantity < 1) blocked.add(key);
    return blocked;
  };
  const describe = (state: Ledger, bookings: Booking[]) => bookings.map(booking => {
    const activity = wellnessActivityCatalog.get(booking.sessionId);
    const session = wellnessSessionById.get(booking.sessionId);
    const queue = state.bookings.filter(other => other.sessionId === booking.sessionId && other.status === "waitlisted").sort((a, b) => a.sequence - b.sequence);
    return { id: booking.id, sessionId: booking.sessionId, title: session?.title ?? "Activity no longer listed", day: session?.dayLabel ?? "", time: session?.time ?? "", status: !activity && booking.status !== "cancelled" ? "unavailable" : booking.status, waitlistPosition: booking.status === "waitlisted" ? queue.findIndex(other => other.id === booking.id) + 1 : null, canCancel: booking.status !== "cancelled" && (!activity || Date.parse(activity.startsAt) > now().getTime()) };
  });

  async function register(input: unknown, requestId: string) {
    if (!z.uuid().safeParse(requestId).success) throw new BookingProblem(400, "Please refresh the page and try again.");
    const parsed = wellnessFormSchema.safeParse(input);
    if (!parsed.success) throw new BookingProblem(400, "Please check your contact details and selected activities.");
    const data = parsed.data, problem = siteVisitWaiverProblem(data);
    if (problem) throw new BookingProblem(400, problem.error);
    const ids = [...new Set(data.sessions)].sort();
    if (!ids.length || wellnessClash(ids)) throw new BookingProblem(400, "Please choose valid activities that do not overlap.");
    const fingerprint = hash(JSON.stringify({ name: data.name, email: data.email, phone: data.phone, sessions: ids, waiverAccepted: data.waiverAccepted, signature: data.signature, waiverVersion: data.waiverVersion, textConsent: data.textConsent ?? false }));
    const attendeeKey = wellnessAttendeeKey(data.email, data.name);
    const contactKeys = [`email:${normalEmail(data.email)}`, normalPhone(data.phone) ? `phone:${normalPhone(data.phone)}` : null].filter((key): key is string => key !== null).map(hash);
    let intake = await dependencies.intakes.read(requestId);
    if (!intake) {
      if (ids.some(id => !wellnessSessionById.has(id))) throw new BookingProblem(400, "Please refresh the page and choose your activities again.");
      if (ids.some(id => Date.parse(wellnessActivityCatalog.get(id)!.startsAt) <= now().getTime())) throw new BookingProblem(409, "An activity has already started. Please choose a future activity.");
      const at = now().toISOString();
      const { website: _, sessions: __, ...contact } = data;
      const expiresAt = new Date(Math.max(...ids.map(id => Date.parse(wellnessActivityCatalog.get(id)!.endsAt!))) + 24 * 60 * 60_000).toISOString();
      const proposed = privateIntakeSchema.parse({ id: requestId, fingerprint, attendeeKey, createdAt: at, expiresAt,
        records: ids.map(id => { const session = wellnessSessionById.get(id)!; return { ...contact, id: recordId(requestId, id), source: "form", category: "wellness", sessionId: id, sessionTitle: session.title, sessionDay: session.dayLabel, sessionTime: session.time, submittedAt: at, waiverAcceptedAt: at }; }),
      });
      if (await dependencies.intakes.createIfNew(proposed)) intake = proposed;
      else intake = await dependencies.intakes.read(requestId);
    }
    if (!intake) throw new Error("A complete intake is unavailable. Retry the same request.");
    intake = privateIntakeSchema.parse(intake);
    if (intake.fingerprint !== fingerprint || intake.attendeeKey !== attendeeKey) throw new BookingProblem(409, "This request has changed. Please submit it again with a fresh request ID.");
    const blockedPromotionKeys = await promotionHolds();

    let reserved = false;
    for (let attempt = 0; attempt < 32; attempt++) {
      const snapshot = await dependencies.ledger.read(), state = ledgerSchema.parse(snapshot?.value ?? emptyLedger());
      const existing = state.intakes.find(other => other.id === requestId);
      if (existing) {
        if (existing.fingerprint !== fingerprint || existing.attendeeKey !== attendeeKey) throw new BookingProblem(409, "Conflicting signup request.");
        reserved = true; break;
      }
      if (ids.some(id => !wellnessActivityCatalog.has(id) || Date.parse(wellnessActivityCatalog.get(id)!.startsAt) <= now().getTime())) throw new BookingProblem(409, "An activity is no longer available for new registrations.");
      if (!isUnlimitedSubmitter({ email: data.email, phone: data.phone }) && state.intakes.filter(other => other.attendeeKey === attendeeKey || other.contactKeys.some(key => contactKeys.includes(key))).length >= submissionsPerPerson) throw new BookingProblem(409, "We already have your wellness sign-ups. Use your private management link or contact the event team.");
      if (state.bookings.some(booking => booking.attendeeKey === attendeeKey && ids.includes(booking.sessionId) && booking.status !== "cancelled")) throw new BookingProblem(409, "You already have a sign-up for a selected activity. Use your existing private management link to make changes.");
      let next: Ledger;
      try {
        next = planBookingCommand(state, { action: "reserve", requestId, attendeeKey, at: now().toISOString(), selections: intake.records.map(record => ({ sessionId: record.sessionId, sourceRecordId: record.id })) }, dependencies.rules, { blockedPromotionKeys, actor: "guest" }).next;
      } catch (error) {
        if (error instanceof Error && /overlap/.test(error.message)) throw new BookingProblem(409, "An activity overlaps an existing sign-up.");
        throw error;
      }
      next.intakes.push({ id: requestId, fingerprint, attendeeKey, contactKeys, sourceRecordIds: intake.records.map(record => record.id), createdAt: intake.createdAt, expiresAt: intake.expiresAt, materializedAt: null });
      if (Buffer.byteLength(JSON.stringify(next)) > 2_000_000) throw new Error("Booking storage needs review.");
      if (await dependencies.ledger.compareAndSet(snapshot?.etag ?? null, ledgerSchema.parse(next))) { reserved = true; break; }
    }
    if (!reserved) throw new Error("Bookings are busy. Retry the same request.");

    const before = await read();
    if (!before.intakes.find(other => other.id === requestId)!.materializedAt) {
      // Stable IDs and original timestamps make a partial save retry safe. These
      // are new records owned by this intake, never an overwrite of old guests.
      for (const record of intake.records) await dependencies.source.add("workshop", record);
      let acknowledged = false;
      for (let attempt = 0; attempt < 32; attempt++) {
        const snapshot = await dependencies.ledger.read();
        if (!snapshot) throw new Error("Booking snapshot disappeared.");
        const state = ledgerSchema.parse(snapshot.value), item = state.intakes.find(other => other.id === requestId);
        if (!item) throw new Error("Signup is not in the booking ledger.");
        if (item.materializedAt) { acknowledged = true; break; }
        item.materializedAt = now().toISOString(); state.revision++;
        state.audit.push({ requestId: `materialize:${requestId}`, fingerprint, action: "materialize", actor: "system", at: item.materializedAt, bookingIds: scoped(state, item).map(booking => booking.id), promotedIds: [] });
        if (await dependencies.ledger.compareAndSet(snapshot.etag, ledgerSchema.parse(state))) { acknowledged = true; break; }
      }
      if (!acknowledged) throw new Error("Save is pending confirmation. Retry the same request.");
    }
    const state = await read(), meta = state.intakes.find(other => other.id === requestId)!, bookings = scoped(state, meta);
    const expires = new Date(intake.expiresAt);
    return { ok: true as const, bookings: describe(state, bookings), manageUrl: `/wellness/manage.html#token=${managementToken(requestId, attendeeKey, expires, dependencies.managementSecret)}` };
  }

  async function manage(token: string, action: "view" | "cancel", bookingId?: string, requestId?: string) {
    let capability;
    try { capability = readManagementToken(token, dependencies.managementSecret, now()); }
    catch { throw new BookingProblem(401, "This private link is invalid or has expired."); }
    let state = await read();
    const meta = state.intakes.find(intake => intake.id === capability.intakeId && intake.attendeeKey === capability.attendeeKey);
    if (!meta?.materializedAt) throw new BookingProblem(404, "This sign-up is not available yet.");
    const bookings = scoped(state, meta);
    if (action === "cancel") {
      if (!bookingId || !z.uuid().safeParse(requestId).success) throw new BookingProblem(400, "Please choose an activity and try again.");
      const booking = bookings.find(other => other.id === bookingId);
      if (!booking) throw new BookingProblem(404, "This activity is not included in your private link.");
      const activity = wellnessActivityCatalog.get(booking.sessionId);
      if (booking.status !== "cancelled" && activity && Date.parse(activity.startsAt) <= now().getTime()) throw new BookingProblem(409, "This activity has started. Please contact the event team.");
      await applyBookingCommand(dependencies.ledger, dependencies.rules, { action: "cancel", requestId: requestId!, attendeeKey: capability.attendeeKey, bookingId, at: now().toISOString() }, { blockedPromotionKeys: await promotionHolds(), actor: "guest" });
      state = await read();
    }
    return { ok: true as const, bookings: describe(state, scoped(state, meta)) };
  }
  async function recover(intakeId: string) {
    if (!z.uuid().safeParse(intakeId).success) throw new BookingProblem(400, "Invalid signup ID.");
    const state = await read();
    if (!state.intakes.some(item => item.id === intakeId)) throw new BookingProblem(404, "Pending signup was not found.");
    const intake = await dependencies.intakes.read(intakeId);
    if (!intake) throw new Error("Durable intake is unavailable.");
    const first = intake.records[0]!;
    return register({ name: first.name, email: first.email, phone: first.phone, sessions: intake.records.map(record => record.sessionId), waiverAccepted: first.waiverAccepted, signature: first.signature, waiverVersion: first.waiverVersion, textConsent: first.textConsent, website: "" }, intakeId);
  }

  async function summary() {
    const state = await read();
    const [rows, agenda] = await Promise.all([dependencies.source.list("workshop"), buildWellnessAgenda(dependencies.source, { bookingStatuses: bookingStatuses(state) })]);
    const contacts = new Map(rows.map(row => [row.id, row]));
    const eligible = new Set(agenda.recipients.flatMap(recipient => recipient.selections.map(selection => selection.sourceRecordId)));
    return {
      ok: true as const,
      sessions: [...wellnessSessionById.values()].map(session => ({ ...session, capacity: dependencies.rules.get(session.id), registered: state.bookings.filter(row => row.sessionId === session.id && row.status === "registered").length, waitlisted: state.bookings.filter(row => row.sessionId === session.id && row.status === "waitlisted").length })),
      bookings: state.bookings.map(booking => ({ ...describe(state, [booking])[0]!, name: contacts.get(booking.sourceRecordId)?.name ?? "Details pending save", email: contacts.get(booking.sourceRecordId)?.email ?? "", phone: contacts.get(booking.sourceRecordId)?.phone ?? "", smsEligible: eligible.has(booking.sourceRecordId) })),
      pendingIntakes: state.intakes.filter(intake => !intake.materializedAt).map(intake => ({ id: intake.id, createdAt: intake.createdAt, activities: intake.sourceRecordIds.length })),
    };
  }
  async function staffCancel(bookingId: string, requestId: string) {
    if (!z.uuid().safeParse(requestId).success) throw new BookingProblem(400, "Invalid cancellation request.");
    const state = await read(), booking = state.bookings.find(row => row.id === bookingId);
    if (!booking) throw new BookingProblem(404, "Booking was not found.");
    const activity = wellnessActivityCatalog.get(booking.sessionId);
    if (booking.status !== "cancelled" && activity && Date.parse(activity.startsAt) <= now().getTime()) throw new BookingProblem(409, "This activity has started. Review it with the event team.");
    await applyBookingCommand(dependencies.ledger, dependencies.rules, { action: "cancel", requestId, attendeeKey: booking.attendeeKey, bookingId, at: now().toISOString() }, { blockedPromotionKeys: await promotionHolds(), actor: "staff" });
  }
  async function backup() {
    const snapshot = await dependencies.ledger.read();
    if (!snapshot) throw new Error("Booking snapshot is unavailable.");
    const state = ledgerSchema.parse(snapshot.value);
    const intakes = await Promise.all(state.intakes.map(async meta => {
      const value = privateIntakeSchema.parse(await dependencies.intakes.read(meta.id));
      if (value.id !== meta.id || value.fingerprint !== meta.fingerprint || value.attendeeKey !== meta.attendeeKey) throw new Error("Incomplete private booking backup.");
      return value;
    }));
    const [workshop, textPreference, programApproval] = await Promise.all([dependencies.source.list("workshop"), dependencies.source.list("textPreference"), dependencies.source.list("programApproval")]);
    if ((await dependencies.ledger.read())?.etag !== snapshot.etag) throw new Error("Bookings changed during backup; retry.");
    return { schemaVersion: 1 as const, exportedAt: now().toISOString(), ledger: state, intakes, source: { workshop: workshop.filter(row => row.category === "wellness"), textPreference, programApproval: programApproval.filter(row => row.sourceKind === "workshop") } };
  }
  return { register, manage, recover, summary, staffCancel, backup, ledger: dependencies.ledger };
}

export function memoryIntakeStore(): IntakeStore {
  const values = new Map<string, PrivateIntake>();
  return { async read(id) { return values.has(id) ? structuredClone(values.get(id)!) : null; }, async createIfNew(value) { if (values.has(value.id)) return false; values.set(value.id, structuredClone(value)); return true; } };
}
