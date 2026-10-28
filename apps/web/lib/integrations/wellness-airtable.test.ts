import { describe, expect, it, vi } from "vitest";
import target from "../../config/wellness-airtable-2026.draft.json";
import { memorySubmissionStore, type WorkshopSubmission } from "../staff/store";
import { emptyLedger, memoryBookingStore, type Ledger } from "../wellness-booking/ledger";
import { airtableSourceEnvironment, projectWellnessSignups, wellnessAirtableGet } from "./wellness-airtable";

const now = new Date("2026-10-27T20:00:00Z");
const env = { WELLNESS_AIRTABLE_FEED_TOKEN: "fictional-wellness-airtable-preview-secret-32-chars" };
const request = () => new Request("https://example.test/api/integrations/wellness-airtable", { headers: { authorization: `Bearer ${env.WELLNESS_AIRTABLE_FEED_TOKEN}` } });
const row = (extra: Partial<WorkshopSubmission> & { cancelledAt?: string; removedAt?: string; isTest?: boolean; bookingStatus?: string } = {}): WorkshopSubmission => ({
  id: "signup-1", submittedAt: "2026-10-26T20:00:00Z", source: "form", category: "wellness",
  name: "Alex Example", email: "alex@example.test", phone: "+17025550100", sessionId: "wellness-newer-live-id",
  sessionTitle: "Morning class", sessionDay: "Tuesday", sessionTime: "8:00 AM", ...extra,
});
function ledgerFor(rows: WorkshopSubmission[], statuses: ("registered" | "waitlisted" | "cancelled")[]): Ledger {
  return { ...emptyLedger(), nextSequence: rows.length, bookings: rows.map((source, index) => ({
    id: `booking-${index}`, sourceRecordId: source.id, sessionId: source.sessionId, attendeeKey: String(index + 1).padStart(64, "0"),
    sequence: index, status: statuses[index]!, createdAt: source.submittedAt, updatedAt: "2026-10-27T19:00:00Z",
  })) };
}
const field = (name: keyof typeof target.fields) => target.fields[name];

describe("private Airtable wellness preparation", () => {
  it("keeps live Airtable reads separate from reminder/STOP rehearsals and disables source writes", () => {
    const original = { REMINDER_SOURCE_MODE: "test", INTEGRATION_TEST_STORE_PREFIX: "nas-reminders-test-keep", REMINDER_SOURCE_WRITES_ENABLED: "true" };
    expect(airtableSourceEnvironment(original)).toMatchObject({ REMINDER_SOURCE_MODE: "test", INTEGRATION_TEST_STORE_PREFIX: "nas-reminders-test-keep", REMINDER_SOURCE_WRITES_ENABLED: "false" });
    const live = airtableSourceEnvironment({ ...original, WELLNESS_AIRTABLE_SOURCE_MODE: "live" });
    expect(live).toMatchObject({ REMINDER_SOURCE_MODE: "live", REMINDER_SOURCE_WRITES_ENABLED: "false" });
    expect(live).not.toHaveProperty("INTEGRATION_TEST_STORE_PREFIX");
    expect(original.REMINDER_SOURCE_MODE).toBe("test");
    expect(original.INTEGRATION_TEST_STORE_PREFIX).toBe("nas-reminders-test-keep");
    expect(() => airtableSourceEnvironment({ WELLNESS_AIRTABLE_SOURCE_MODE: "unexpected" })).toThrow();
  });
  it("retains legacy and newer unknown session IDs without inventing confirmed seats", () => {
    const records = projectWellnessSignups([row(), row({ id: "other", category: "siteVisit" })], { now });
    expect(records).toHaveLength(1);
    expect(records[0]!.fields).toMatchObject({
      [field("Source Record ID")]: "signup-1", [field("Website Session ID")]: "wellness-newer-live-id",
      [field("Booking Status")]: "Signup received", [field("Text Permission")]: "Not evaluated",
      [field("Signup")]: "Alex Example · Morning class · Tuesday · 8:00 AM",
    });
    expect(records[0]!.issues).toEqual(["unmatched-guest", "unmatched-session"]);
  });
  it("never exports contact details, signatures, waiver bodies or private management data", () => {
    const source = { ...row({ waiverAccepted: true, signature: "Alex Example", waiverVersion: "activity-v1" }),
      managementToken: "private-cancellation-token", requesterPhone: "+17025550101", notes: "Private note", eventWaiver: { body: "Full private waiver" } };
    const [record] = projectWellnessSignups([source], { now });
    const output = JSON.stringify(record);
    for (const value of [source.email, source.phone, source.requesterPhone, source.managementToken, source.notes, source.eventWaiver.body]) expect(output).not.toContain(value);
    expect(Object.keys(record!.fields).sort()).toEqual(Object.values(target.fields).filter(id => ![field("Guest"), field("Session"), field("Staff Notes")].includes(id)).sort());
    expect(record!.fields[field("Waiver Status")]).toBe("Recorded");
  });
  it("preserves staff notes and existing links by omitting unverified fields", () => {
    const record = projectWellnessSignups([row()], { now })[0]!;
    for (const key of ["Staff Notes", "Guest", "Session"] as const) expect(record.fields).not.toHaveProperty(field(key));
    const links = { guestsBySourceRecordId: new Map([["signup-1", "rec11111111111111"]]), sessionsByWebsiteSessionId: new Map([[row().sessionId, "rec22222222222222"]]) };
    const linked = projectWellnessSignups([row()], { ...links, now })[0]!;
    expect(linked.fields[field("Guest")]).toEqual(["rec11111111111111"]);
    expect(linked.fields[field("Session")]).toEqual(["rec22222222222222"]);
    expect(linked.fields[field("Sync State")]).toBe("Current");
    expect(() => projectWellnessSignups([row()], { guestsBySourceRecordId: new Map([["signup-1", "Alex Example"]]) })).toThrow();
  });
  it("excludes explicitly marked test records and dedicated test session IDs", () => {
    expect(projectWellnessSignups([row({ isTest: true }), row({ id: "test-2", sessionId: "wellness-test-rehearsal" })])).toEqual([]);
  });
  it("flags reviewed source differences without changing original labels, contacts or guest admission", () => {
    const [record] = projectWellnessSignups([row()], {
      guestsBySourceRecordId: new Map([["signup-1", "rec11111111111111"]]),
      sessionsByWebsiteSessionId: new Map([[row().sessionId, "rec22222222222222"]]),
      reviewReasonsBySourceRecordId: new Map([["signup-1", ["activity-title-changed", "contact-details-differ"]]]), now,
    });
    expect(record!.fields[field("Sync State")]).toBe("Needs attention");
    expect(record!.fields[field("Sync Details")]).toContain("original selection label is preserved");
    expect(record!.fields[field("Signup")]).toContain("Morning class");
    expect(record!.fields[field("Booking Status")]).toBe("Signup received");
    expect(JSON.stringify(record)).not.toContain(row().phone);
  });
  it("keeps source keys and revisions stable across retries while identifying real source changes", () => {
    const one = projectWellnessSignups([row()], { now })[0]!;
    const two = projectWellnessSignups([row()], { now: new Date("2026-10-28T20:00:00Z") })[0]!;
    expect(two.sourceRecordId).toBe(one.sourceRecordId); expect(two.sourceRevision).toBe(one.sourceRevision);
    expect(two.fields[field("Last Synced At")]).not.toBe(one.fields[field("Last Synced At")]);
    expect(projectWellnessSignups([row({ sessionTime: "9:00 AM" })])[0]!.sourceRevision).not.toBe(one.sourceRevision);
  });
  it("includes cancellation tombstones and clears obsolete waitlist positions", () => {
    for (const cancellation of [{ cancelledAt: "2026-10-27T18:00:00Z" }, { removedAt: "2026-10-27T18:00:00Z" }]) {
      const record = projectWellnessSignups([row(cancellation)], { now })[0]!;
      expect(record.fields[field("Booking Status")]).toBe("Cancelled");
      expect(record.fields[field("Waitlist Position")]).toBeNull();
      expect(record.fields[field("Source Updated At")]).toBe("2026-10-27T18:00:00.000Z");
    }
  });
  it("uses the ledger for places, FIFO waitlist order and later cancellation or promotion", () => {
    const sources = [row(), row({ id: "signup-2" }), row({ id: "signup-3" })];
    const ledger = ledgerFor(sources, ["registered", "waitlisted", "waitlisted"]);
    const initial = projectWellnessSignups(sources, { ledger, now });
    expect(initial.map(record => record.fields[field("Booking Status")])).toEqual(["Registered", "Waitlisted", "Waitlisted"]);
    expect(initial.map(record => record.fields[field("Waitlist Position")])).toEqual([null, 1, 2]);
    ledger.bookings[0]!.status = "cancelled"; ledger.bookings[1]!.status = "registered";
    const updated = projectWellnessSignups(sources, { ledger, now });
    expect(updated.map(record => record.fields[field("Booking Status")])).toEqual(["Cancelled", "Registered", "Waitlisted"]);
    expect(updated.map(record => record.fields[field("Waitlist Position")])).toEqual([null, null, 1]);
  });
  it("does not claim a place for pending intakes or un-migrated legacy records", () => {
    const source = row({ id: "11111111-1111-4111-8111-111111111111" });
    const ledger = ledgerFor([source], ["registered"]);
    ledger.intakes.push({ id: "22222222-2222-4222-8222-222222222222", fingerprint: "a".repeat(64), attendeeKey: ledger.bookings[0]!.attendeeKey, contactKeys: [], sourceRecordIds: [source.id], createdAt: source.submittedAt, expiresAt: "2026-10-28T20:00:00Z", materializedAt: null });
    for (const input of [{ source, ledger }, { source: row(), ledger: emptyLedger() }, { source: row({ bookingStatus: "registered" }), ledger: undefined }]) {
      const [record] = projectWellnessSignups([input.source], input.ledger ? { ledger: input.ledger } : {});
      expect(record!.fields[field("Booking Status")]).toBe("Needs review");
      expect(record!.fields[field("Sync State")]).toBe("Needs attention");
    }
  });
  it("fails a complete snapshot on duplicate identities, missing source records or mismatched sessions", () => {
    expect(() => projectWellnessSignups([row(), row()])).toThrow();
    expect(() => projectWellnessSignups([], { ledger: ledgerFor([row()], ["registered"]) })).toThrow();
    const ledger = ledgerFor([row({ sessionId: "other-session" })], ["registered"]);
    expect(() => projectWellnessSignups([row()], { ledger })).toThrow();
    expect(() => projectWellnessSignups([row({ submittedAt: "not-a-date" })])).toThrow();
  });
  it("authenticates before opening either store and does not accept query credentials", async () => {
    const provider = vi.fn(async () => memorySubmissionStore());
    const bookings = vi.fn(async () => undefined);
    expect((await wellnessAirtableGet(request(), { env: {}, storeProvider: provider, bookingStoreProvider: bookings })).status).toBe(401);
    expect((await wellnessAirtableGet(new Request(`https://example.test/?token=${env.WELLNESS_AIRTABLE_FEED_TOKEN}`), { env, storeProvider: provider })).status).toBe(401);
    expect(provider).not.toHaveBeenCalled(); expect(bookings).not.toHaveBeenCalled();
  });
  it("provides private previews with no writable queue, sender or source mutations", async () => {
    const store = memorySubmissionStore({ workshop: [row()] });
    const read = vi.spyOn(store, "list"), add = vi.spyOn(store, "add"), remove = vi.spyOn(store, "delete");
    const response = await wellnessAirtableGet(request(), { env: { ...env, INTEGRATION_SMS_SEND_APPROVED: "true" }, store, now });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("netlify-cdn-cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({ complete: true, mode: "preview-only", syncEnabled: false, sendApproval: "pending", records: [], target: { baseId: target.baseId, tableId: target.tableId } });
    expect(body.previewRecords).toHaveLength(1);
    expect(read.mock.calls).toEqual([["workshop"]]); expect(add).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  });
  it("returns no partial records or private error details when either source is unavailable", async () => {
    const failing = memorySubmissionStore(); failing.list = async () => { throw new Error("private-source-failure alex@example.test"); };
    for (const options of [{ store: failing }, { store: memorySubmissionStore({ workshop: [row()] }), bookingStoreProvider: async () => memoryBookingStore() }]) {
      const response = await wellnessAirtableGet(request(), { env, ...options });
      expect(response.status).toBe(503);
      const body = await response.text(); expect(body).not.toContain("previewRecords"); expect(body).not.toContain("alex@example.test");
    }
  });
});
