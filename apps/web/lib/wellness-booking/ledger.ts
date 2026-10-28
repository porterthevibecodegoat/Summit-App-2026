import { createHash } from "node:crypto";
import { z } from "zod";
import { wellnessClash, wellnessSessionById } from "../wellness-signups-2026";
import type { CapacityRules } from "./capacity";

const id = z.string().min(1).max(180);
const attendeeKey = z.string().regex(/^[a-f0-9]{64}$/);
const bookingSchema = z.object({
  id, sessionId: id, sourceRecordId: id, attendeeKey,
  status: z.enum(["registered", "waitlisted", "cancelled"]),
  sequence: z.number().int().nonnegative(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
}).strict();
const auditSchema = z.object({
  requestId: id, fingerprint: z.string().length(64), action: z.enum(["reserve", "cancel", "materialize"]),
  at: z.iso.datetime(), bookingIds: z.array(id), promotedIds: z.array(id),
  actor: z.enum(["guest", "staff", "system"]).default("system"),
}).strict();
export const ledgerSchema = z.object({
  schemaVersion: z.literal(1), revision: z.number().int().nonnegative(), nextSequence: z.number().int().nonnegative(),
  bookings: z.array(bookingSchema), audit: z.array(auditSchema),
  intakes: z.array(z.object({
    id: z.uuid(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), attendeeKey,
    contactKeys: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(2).default([]),
    sourceRecordIds: z.array(z.uuid()).min(1).max(16), createdAt: z.iso.datetime(), expiresAt: z.iso.datetime(), materializedAt: z.iso.datetime().nullable(),
  }).strict()).default([]),
}).strict().superRefine((state, context) => {
  const ids = state.bookings.map(booking => booking.id);
  if (new Set(ids).size !== ids.length || new Set(state.audit.map(event => event.requestId)).size !== state.audit.length) context.addIssue({ code: "custom", message: "Duplicate ledger identity." });
  if (new Set(state.bookings.map(booking => booking.sequence)).size !== state.bookings.length || state.revision !== state.audit.length || state.audit.some(event => [...event.bookingIds, ...event.promotedIds].some(bookingId => !ids.includes(bookingId)))) context.addIssue({ code: "custom", message: "Invalid ledger audit history." });
  const active = state.bookings.filter(booking => booking.status !== "cancelled").map(booking => `${booking.attendeeKey}:${booking.sessionId}`);
  if (new Set(active).size !== active.length || state.bookings.some(booking => booking.sequence >= state.nextSequence)) context.addIssue({ code: "custom", message: "Invalid booking sequence or session." });
  if (new Set(state.intakes.map(intake => intake.id)).size !== state.intakes.length || state.intakes.some(intake => intake.sourceRecordIds.some(sourceId => !state.bookings.some(booking => booking.sourceRecordId === sourceId && booking.attendeeKey === intake.attendeeKey)))) context.addIssue({ code: "custom", message: "Invalid intake references." });
});
export type Booking = z.infer<typeof bookingSchema>;
export type Ledger = z.infer<typeof ledgerSchema>;
export type VersionedLedgerStore = {
  read(): Promise<{ value: Ledger; etag: string } | null>;
  compareAndSet(expectedEtag: string | null, value: Ledger): Promise<boolean>;
};
type Reservation = { sessionId: string; sourceRecordId: string };
export type BookingCommand =
  | { action: "reserve"; requestId: string; attendeeKey: string; selections: Reservation[]; at: string }
  | { action: "cancel"; requestId: string; attendeeKey: string; bookingId: string; at: string };
export type BookingResult = { bookings: Booking[]; promoted: Booking[]; replay: boolean };
export const emptyLedger = (): Ledger => ({ schemaVersion: 1, revision: 0, nextSequence: 0, bookings: [], audit: [], intakes: [] });
const hash = (input: string) => createHash("sha256").update(input).digest("hex");

function validateCommand(command: BookingCommand) {
  id.parse(command.requestId); attendeeKey.parse(command.attendeeKey); z.iso.datetime().parse(command.at);
  if (command.action === "reserve") {
    if (!command.selections.length || command.selections.length > 16 || new Set(command.selections.map(s => s.sessionId)).size !== command.selections.length) throw new Error("Invalid wellness selections.");
    for (const selection of command.selections) {
      id.parse(selection.sourceRecordId);
      if (!wellnessSessionById.has(selection.sessionId)) throw new Error("Unknown wellness session.");
    }
    if (wellnessClash(command.selections.map(selection => selection.sessionId))) throw new Error("Selected classes overlap.");
  } else if (command.action === "cancel") id.parse(command.bookingId);
  else throw new Error("Invalid booking action.");
}

function fingerprint(command: BookingCommand) {
  // Request time is deliberately excluded so a network retry keeps its identity.
  return hash(JSON.stringify(command.action === "reserve" ? {
    action: command.action, attendeeKey: command.attendeeKey,
    selections: command.selections.map(s => ({ sessionId: s.sessionId, sourceRecordId: s.sourceRecordId })).sort((a, b) => a.sessionId.localeCompare(b.sessionId)),
  } : { action: command.action, attendeeKey: command.attendeeKey, bookingId: command.bookingId }));
}

type BookingOptions = { blockedPromotionKeys?: ReadonlySet<string>; actor?: "guest" | "staff" | "system" };
export function planBookingCommand(state: Ledger, command: BookingCommand, rules: CapacityRules, options: BookingOptions = {}): { next: Ledger; result: BookingResult } {
  validateCommand(command);
  const digest = fingerprint(command);
  const previous = state.audit.find(event => event.requestId === command.requestId);
  if (previous) {
    if (previous.fingerprint !== digest) throw new Error("This request ID was already used for a different booking command.");
    return { next: state, result: { bookings: state.bookings.filter(b => previous.bookingIds.includes(b.id)), promoted: state.bookings.filter(b => previous.promotedIds.includes(b.id)), replay: true } };
  }
  const next = structuredClone(state);
  const bookingIds: string[] = [], promotedIds: string[] = [];
  const policy = (sessionId: string) => {
    const rule = rules.get(sessionId);
    if (!rule || rule.mode === "unset") throw new Error("Capacity is not set for this session.");
    return rule;
  };
  const promote = (sessionId: string) => {
    const rule = policy(sessionId);
    const registered = next.bookings.filter(b => b.sessionId === sessionId && b.status === "registered").length;
    const waiting = next.bookings.filter(b => b.sessionId === sessionId && b.status === "waitlisted").sort((a, b) => a.sequence - b.sequence);
    let available = rule.mode === "limited" ? Math.max(0, rule.maxPlaces - registered) : waiting.length;
    for (const booking of waiting) {
      if (available === 0) break;
      if (options.blockedPromotionKeys?.has(`${booking.sourceRecordId}:${booking.sessionId}`)) continue;
      const otherClasses = next.bookings.filter(b => b.attendeeKey === booking.attendeeKey && b.id !== booking.id && b.status !== "cancelled").map(b => b.sessionId);
      // A promotion must never create a clash with a later booking.
      if (wellnessClash([...otherClasses, sessionId])) continue;
      booking.status = "registered"; booking.updatedAt = command.at;
      promotedIds.push(booking.id); available--;
    }
  };
  if (command.action === "reserve") {
    const existingClasses = next.bookings.filter(b => b.attendeeKey === command.attendeeKey && b.status !== "cancelled").map(b => b.sessionId);
    if (wellnessClash([...new Set([...existingClasses, ...command.selections.map(s => s.sessionId)])])) throw new Error("A selected class overlaps an existing booking.");
    for (const selection of command.selections) {
      const rule = policy(selection.sessionId);
      if (next.bookings.some(b => b.sourceRecordId === selection.sourceRecordId && (b.attendeeKey !== command.attendeeKey || b.sessionId !== selection.sessionId))) throw new Error("A source record cannot belong to different attendees or sessions.");
      const existing = next.bookings.find(b => b.attendeeKey === command.attendeeKey && b.sessionId === selection.sessionId && b.status !== "cancelled");
      if (existing) { bookingIds.push(existing.id); continue; }
      promote(selection.sessionId);
      const used = next.bookings.filter(b => b.sessionId === selection.sessionId && b.status === "registered").length;
      const booking: Booking = {
        id: hash(`${command.requestId}:${selection.sessionId}`), ...selection, attendeeKey: command.attendeeKey,
        status: rule.mode === "unlimited" || used < rule.maxPlaces ? "registered" : "waitlisted",
        sequence: next.nextSequence++, createdAt: command.at, updatedAt: command.at,
      };
      next.bookings.push(booking); bookingIds.push(booking.id);
    }
  } else {
    const booking = next.bookings.find(b => b.id === command.bookingId && b.attendeeKey === command.attendeeKey);
    if (!booking) throw new Error("Booking was not found for this attendee.");
    bookingIds.push(booking.id);
    if (booking.status !== "cancelled") {
      booking.status = "cancelled"; booking.updatedAt = command.at;
      if (wellnessSessionById.has(booking.sessionId)) promote(booking.sessionId);
    }
  }
  next.revision++;
  next.audit.push({ requestId: command.requestId, fingerprint: digest, action: command.action, actor: options.actor ?? "system", at: command.at, bookingIds, promotedIds });
  return { next, result: { bookings: next.bookings.filter(b => bookingIds.includes(b.id)), promoted: next.bookings.filter(b => promotedIds.includes(b.id)), replay: false } };
}

// One conditional write contains the whole batch, seat assignments, cancellation,
// promotion and audit event. No count-then-write race or half-saved class batch.
export async function applyBookingCommand(store: VersionedLedgerStore, rules: CapacityRules, command: BookingCommand, options: BookingOptions = {}): Promise<BookingResult> {
  validateCommand(command);
  for (let attempt = 0; attempt < 32; attempt++) {
    const snapshot = await store.read();
    const state = snapshot ? ledgerSchema.parse(snapshot.value) : emptyLedger();
    const { next, result } = planBookingCommand(state, command, rules, options);
    if (result.replay) return result;
    if (Buffer.byteLength(JSON.stringify(next)) > 2_000_000) throw new Error("Booking ledger needs archival review before further writes.");
    if (await store.compareAndSet(snapshot?.etag ?? null, ledgerSchema.parse(next))) return result;
  }
  throw new Error("Bookings are busy. Retry the same request ID.");
}

export function bookingStatuses(ledger: Ledger) {
  const result = new Map<string, Booking["status"]>();
  const parsed = ledgerSchema.parse(ledger);
  const pending = new Set(parsed.intakes.filter(intake => !intake.materializedAt).flatMap(intake => intake.sourceRecordIds));
  // When a source is intentionally re-registered, the newest ledger entry wins.
  for (const booking of [...parsed.bookings].sort((a, b) => a.sequence - b.sequence)) if (!pending.has(booking.sourceRecordId)) result.set(booking.sourceRecordId, booking.status);
  return result;
}

// Isolated tests only: no filesystem, provider connection or attendee data.
export function memoryBookingStore(initial?: Ledger): VersionedLedgerStore {
  let value = initial ? ledgerSchema.parse(structuredClone(initial)) : null;
  let version = value ? 1 : 0;
  return {
    async read() { return value ? { value: structuredClone(value), etag: String(version) } : null; },
    async compareAndSet(expected, next) {
      if (expected !== (value ? String(version) : null)) return false;
      value = structuredClone(next); version++; return true;
    },
  };
}
