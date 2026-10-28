import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { memorySubmissionStore, type WorkshopSubmission } from "../staff/store";
import { buildWellnessAgenda } from "../integrations/agenda";
import { planReminders } from "../integrations/planner";
import { wellnessSessions } from "../wellness-signups-2026";
import examples from "../../test-fixtures/wellness-capacity.example.json";
import draft from "../../config/wellness-capacity-2026.draft.json";
import { approvedCapacityRules, capacityRules, draftCapacityRules } from "./capacity";
import { applyBookingCommand, bookingStatuses, emptyLedger, memoryBookingStore, type BookingCommand, type VersionedLedgerStore } from "./ledger";

const sessionId = "wellness-nov2-breathwork";
const at = "2026-10-26T22:00:00Z";
const identity = (i: number) => createHash("sha256").update(`fictional-${i}`).digest("hex");
const rules = capacityRules(examples.sessions);
const reserve = (i: number, selections = [{ sessionId, sourceRecordId: `source-${i}` }]): BookingCommand => ({ action: "reserve", requestId: `request-${i}`, attendeeKey: identity(i), at, selections });
const cancel = (i: number, bookingId: string, requestId = `cancel-${i}`): BookingCommand => ({ action: "cancel", requestId, attendeeKey: identity(i), at, bookingId });

describe("editable capacity policy", () => {
  it("loads matched owner limits and unlimited choices while keeping catalog and activation holds", async () => {
    expect(draftCapacityRules.size).toBe(30);
    expect([...draftCapacityRules.values()].filter(rule => rule.mode === "limited")).toHaveLength(20);
    expect([...draftCapacityRules.values()].filter(rule => rule.mode === "unlimited")).toHaveLength(8);
    expect([...draftCapacityRules.values()].filter(rule => rule.mode === "unset")).toHaveLength(2);
    expect(() => approvedCapacityRules()).toThrow();
    expect(() => approvedCapacityRules({ schemaVersion: 1, enabled: true, status: "approved", sessions: examples.sessions })).toThrow("Every session");
    const store = memoryBookingStore();
    await expect(applyBookingCommand(store, draftCapacityRules, reserve(1))).rejects.toThrow("not set");
    expect(await store.read()).toBeNull();
  });
  it("cannot activate an unresolved owner policy merely by flipping draft flags", () => {
    const complete = Object.fromEntries(wellnessSessions.map(session => [session.id, { mode: "unlimited", maxPlaces: null }]));
    expect(() => approvedCapacityRules({ ...draft, status: "approved", enabled: true, sessions: complete })).toThrow("Unresolved owner policy");
  });
  it.each([0, -1, 1.5, null, "2", Infinity])("rejects an invalid cap %s instead of interpreting it as unlimited", cap => {
    expect(() => capacityRules({ [sessionId]: { mode: "limited", maxPlaces: cap } })).toThrow();
  });
  it("requires explicit unlimited policy and rejects unknown IDs", () => {
    expect(() => capacityRules({ retired: { mode: "unlimited", maxPlaces: null } })).toThrow("Unknown");
    const complete = Object.fromEntries(wellnessSessions.map(session => [session.id, { mode: "unlimited", maxPlaces: null }]));
    expect(approvedCapacityRules({ schemaVersion: 1, enabled: true, status: "approved", sessions: complete }).size).toBe(30);
  });
});

describe("atomic reservations and FIFO waitlist", () => {
  it.each([["wellness-nov3-pilates-2", 2], ["wellness-nov4-chiro-1", 1]] as const)("enforces the owner-provided limit for %s under simultaneous requests", async (id, limit) => {
    const store = memoryBookingStore();
    await Promise.all(Array.from({ length: 8 }, (_, i) => applyBookingCommand(store, draftCapacityRules, reserve(i, [{ sessionId: id, sourceRecordId: `owner-limit-${i}` }]))));
    const bookings = (await store.read())!.value.bookings;
    expect(bookings.filter(booking => booking.status === "registered")).toHaveLength(limit);
    expect(bookings.filter(booking => booking.status === "waitlisted")).toHaveLength(8 - limit);
  });
  it("handles 20 simultaneous signups without exceeding a two-place limit", async () => {
    const store = memoryBookingStore();
    await Promise.all(Array.from({ length: 20 }, (_, i) => applyBookingCommand(store, rules, reserve(i))));
    const state = (await store.read())!.value;
    expect(state.bookings.filter(b => b.status === "registered")).toHaveLength(2);
    expect(state.bookings.filter(b => b.status === "waitlisted")).toHaveLength(18);
    expect(new Set(state.bookings.map(b => b.sequence)).size).toBe(20);
    expect(state.audit).toHaveLength(20);
  });
  it("retries network submissions and duplicate selections without consuming another place", async () => {
    const store = memoryBookingStore();
    const first = await applyBookingCommand(store, rules, reserve(1));
    expect((await applyBookingCommand(store, rules, { ...reserve(1), at: "2026-10-27T00:00:00Z" })).replay).toBe(true);
    const duplicate = await applyBookingCommand(store, rules, { ...reserve(1), requestId: "new-network-request" });
    expect(duplicate.bookings[0]!.id).toBe(first.bookings[0]!.id);
    expect((await store.read())!.value.bookings).toHaveLength(1);
    await expect(applyBookingCommand(store, rules, { ...reserve(2), requestId: "request-1" })).rejects.toThrow("different booking command");
  });
  it("cancels once and promotes the oldest waiting person once, including concurrent repeats", async () => {
    const store = memoryBookingStore();
    for (let i = 0; i < 5; i++) await applyBookingCommand(store, rules, reserve(i));
    const before = (await store.read())!.value;
    const first = before.bookings.find(b => b.attendeeKey === identity(0))!;
    const results = await Promise.all([applyBookingCommand(store, rules, cancel(0, first.id)), applyBookingCommand(store, rules, cancel(0, first.id, "second-cancel"))]);
    expect(results.flatMap(result => result.promoted)).toHaveLength(1);
    const after = (await store.read())!.value;
    expect(after.bookings.find(b => b.attendeeKey === identity(2))!.status).toBe("registered");
    expect(after.bookings.filter(b => b.status === "registered")).toHaveLength(2);
    expect(after.bookings.find(b => b.id === first.id)!.status).toBe("cancelled");
  });
  it("does not promote a cancelled waitlist entry or allow another attendee to cancel", async () => {
    const store = memoryBookingStore();
    const entries = [];
    for (let i = 0; i < 4; i++) entries.push((await applyBookingCommand(store, rules, reserve(i))).bookings[0]!);
    await expect(applyBookingCommand(store, rules, cancel(99, entries[0]!.id))).rejects.toThrow("not found");
    await applyBookingCommand(store, rules, cancel(2, entries[2]!.id));
    const result = await applyBookingCommand(store, rules, cancel(0, entries[0]!.id));
    expect(result.promoted.map(b => b.attendeeKey)).toEqual([identity(3)]);
  });
  it("saves no partial batch when another class is unset or clashes", async () => {
    const store = memoryBookingStore();
    await expect(applyBookingCommand(store, rules, reserve(1, [{ sessionId, sourceRecordId: "first" }, { sessionId: "wellness-nov4-pilates-1", sourceRecordId: "second" }]))).rejects.toThrow("not set");
    expect(await store.read()).toBeNull();
    await expect(applyBookingCommand(store, rules, reserve(1, [{ sessionId: "wellness-nov3-pilates-1", sourceRecordId: "first" }, { sessionId: "wellness-nov3-breathwork", sourceRecordId: "second" }]))).rejects.toThrow("overlap");
    expect(await store.read()).toBeNull();
  });
  it("allows unlimited drop-ins beside a timed class, while retaining the two-place cap", async () => {
    const store = memoryBookingStore();
    const unlimited = "wellness-nov3-pickleball";
    await Promise.all(Array.from({ length: 8 }, (_, i) => applyBookingCommand(store, rules, reserve(i, [{ sessionId, sourceRecordId: `timed-${i}` }, { sessionId: unlimited, sourceRecordId: `dropin-${i}` }]))));
    const state = (await store.read())!.value;
    expect(state.bookings.filter(b => b.sessionId === unlimited && b.status === "registered")).toHaveLength(8);
    expect(state.bookings.filter(b => b.sessionId === sessionId && b.status === "registered")).toHaveLength(2);
  });
  it("reports contention rather than acknowledging an uncommitted booking", async () => {
    const store: VersionedLedgerStore = { read: vi.fn(async () => null), compareAndSet: vi.fn(async () => false) };
    await expect(applyBookingCommand(store, rules, reserve(1))).rejects.toThrow("Retry the same request");
    expect(store.compareAndSet).toHaveBeenCalledTimes(32);
  });
  it("rejects corrupted stored state and a source record reused by another person", async () => {
    const store = memoryBookingStore();
    await applyBookingCommand(store, rules, reserve(1));
    await expect(applyBookingCommand(store, rules, reserve(2, [{ sessionId, sourceRecordId: "source-1" }]))).rejects.toThrow("source record");
    const bad = { ...emptyLedger(), schemaVersion: 99 };
    const corrupt = { read: async () => ({ value: bad, etag: "1" }), compareAndSet: vi.fn() } as unknown as VersionedLedgerStore;
    await expect(applyBookingCommand(corrupt, rules, reserve(1))).rejects.toThrow();
    expect(corrupt.compareAndSet).not.toHaveBeenCalled();
  });
});

it("refreshes reminders after waitlisting, cancellation, promotion and STOP without touching the signup", async () => {
  const ledger = memoryBookingStore();
  for (let i = 0; i < 3; i++) await applyBookingCommand(ledger, rules, reserve(i));
  const rows: WorkshopSubmission[] = Array.from({ length: 3 }, (_, i) => ({ id: `source-${i}`, source: "form", submittedAt: at, name: `Example Guest ${i}`, email: `guest${i}@example.com`, phone: `+1702555010${i}`, sessionId, category: "wellness", sessionTitle: "Old title", sessionDay: "", sessionTime: "" }));
  const source = memorySubmissionStore({ workshop: rows });
  const snapshot = async () => buildWellnessAgenda(source, { bookingStatuses: bookingStatuses((await ledger.read())!.value) });
  expect((await snapshot()).recipients.map(r => r.phone).sort()).toEqual(["+17025550100", "+17025550101"]);
  const first = (await ledger.read())!.value.bookings.find(b => b.attendeeKey === identity(0))!;
  await applyBookingCommand(ledger, rules, cancel(0, first.id));
  expect((await snapshot()).recipients.map(r => r.phone).sort()).toEqual(["+17025550101", "+17025550102"]);
  await source.add("textPreference", { id: "stop", source: "staff", submittedAt: at, phone: "+17025550102", email: "", name: "", choice: "no", via: "stop-reply" });
  const final = await snapshot();
  expect(final.recipients.map(r => r.phone)).toEqual(["+17025550101"]);
  expect(planReminders(final)).toHaveLength(2);
  expect(await source.list("workshop")).toEqual(rows);
});
