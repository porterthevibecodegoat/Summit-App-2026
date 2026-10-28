import { describe, expect, it, vi } from "vitest";
import { memorySubmissionStore, programApprovalPayloadSchema, type ProgramApprovalSubmission, type SubmissionStore, type TextPreferenceRecord, type WorkshopSubmission } from "../staff/store";
import { wellnessSessions } from "../wellness-signups-2026";
import { buildWellnessAgenda } from "./agenda";
import { wellnessActivityCatalog } from "./catalog";
import { agendaGet } from "./handlers";
import { planReminders } from "./planner";
import { smsPhone } from "./phone";

const phone = "+17025550100";
const env = { INTEGRATION_FEED_TOKEN: "fictional-feed-credential-at-least-32-characters" };
const request = () => new Request("https://example.test/api/integrations/agenda", { headers: { authorization: `Bearer ${env.INTEGRATION_FEED_TOKEN}` } });
const row = (over: Partial<WorkshopSubmission> & { cancelledAt?: string; removedAt?: string; bookingStatus?: string } = {}): WorkshopSubmission => ({ id: "signup-1", source: "form", submittedAt: "2026-10-20T10:00:00Z", name: "Alex Example", email: "alex@example.com", phone, sessionId: "wellness-nov3-pilates-1", sessionTitle: "Old title", sessionDay: "Old day", sessionTime: "Old time", category: "wellness", ...over });
const preference = (choice: "yes" | "no", at: string, extra: Partial<TextPreferenceRecord> = {}): TextPreferenceRecord => ({ id: `${choice}-${at}`, source: "staff", name: "", email: "", phone, choice, submittedAt: at, via: "page", ...extra });
const approval = (decision: "approved" | "hold" | "declined", at = "2026-10-22T10:00:00Z", extra: Partial<ProgramApprovalSubmission> = {}): ProgramApprovalSubmission => ({
  ...programApprovalPayloadSchema.parse({ sourceKind: "workshop", sourceId: "signup-1", eventKey: "wellness-nov3-pilates-1", eventLabel: "Wellness", name: "Alex Example", email: "alex@example.com", form: "Wellness", requestedQuantity: 1, approvedQuantity: decision === "approved" ? 1 : 0, decision, confirmationStatus: "ready", fulfillment: "check-in", formVersion: "current", reviewedAt: at }),
  id: `${decision}-${at}`, source: "staff", submittedAt: at, ...extra,
});

describe("wellness-only source and canonical schedule", () => {
  it("uses all canonical choices and UTC instants without retaining removed sessions", () => {
    expect([...wellnessActivityCatalog.keys()]).toEqual(wellnessSessions.map(s => s.id));
    expect(wellnessActivityCatalog.size).toBe(30);
    expect(wellnessActivityCatalog.has("wellness-nov3-pet-partners")).toBe(false);
    expect(wellnessActivityCatalog.get("wellness-nov4-fitness-1")).toMatchObject({ startsAt: "2026-11-04T17:00:00.000Z", endsAt: "2026-11-04T17:20:00.000Z" });
  });
  it("reads only workshops, opt-outs and staff program decisions, with no writes", async () => {
    const store = memorySubmissionStore({ workshop: [row(), row({ id: "site", category: "siteVisit", sessionId: "site-visit-tennis" })] });
    const read = vi.spyOn(store, "list"); const add = vi.spyOn(store, "add"); const remove = vi.spyOn(store, "delete");
    const result = await buildWellnessAgenda(store);
    expect(read.mock.calls.map(([kind]) => kind)).toEqual(["workshop", "textPreference", "programApproval"]);
    expect(result.recipients[0]!.selections).toHaveLength(1);
    expect(result.recipients[0]!.selections[0]).toMatchObject({ title: "Reformer Pilates with Olympian Yvette Baker", startsAt: "2026-11-03T16:00:00.000Z", registrationStatus: "registered" });
    expect(add).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  });
  it("authenticates before opening a connection and never sends a partial source", async () => {
    const provider = vi.fn(async () => memorySubmissionStore());
    expect((await agendaGet(request(), { env: {}, storeProvider: provider })).status).toBe(401);
    expect(provider).not.toHaveBeenCalled();
    for (const kind of ["workshop", "textPreference", "programApproval"]) {
      const store = memorySubmissionStore({ workshop: [row()] });
      const original = store.list.bind(store);
      store.list = (async name => { if (name === kind) throw new Error("unavailable source"); return original(name as "workshop"); }) as SubmissionStore["list"];
      const response = await agendaGet(request(), { env, store });
      expect(response.status).toBe(503); expect(await response.text()).not.toContain(phone);
    }
  });
  it("returns a private noncached feed with stable reminder keys", async () => {
    const store = memorySubmissionStore({ workshop: [row()] });
    const response = await agendaGet(request(), { env: { ...env, INTEGRATION_SMS_SEND_APPROVED: "true" }, store, now: new Date("2026-10-26T21:00:00Z") });
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    const data = await response.json(); expect(data).toMatchObject({ complete: true, scope: "wellness", generatedAt: "2026-10-26T21:00:00.000Z" });
    expect(data.reminderJobs).toHaveLength(2);
    expect(data.reminderJobs.map((job: { dueAt: string }) => job.dueAt)).toEqual(["2026-11-03T03:00:00.000Z", "2026-11-03T15:00:00.000Z"]);
  });
  it("returns previews and no dispatch jobs until the whole SMS process/build is explicitly approved", async () => {
    const store = memorySubmissionStore({ workshop: [row()] });
    for (const setting of [undefined, "false", "yes"]) {
      const response = await agendaGet(request(), { env: { ...env, INTEGRATION_SMS_SEND_APPROVED: setting }, store });
      const data = await response.json();
      expect(data.sendApproval).toBe("pending");
      expect(data.reminderJobs).toEqual([]);
      expect(data.previewJobs).toHaveLength(2);
    }
  });
  it("does not allow isolated test activities to bypass the SMS approval gate", async () => {
    const settings = { ...env, REMINDER_SOURCE_MODE: "test", INTEGRATION_TEST_STORE_PREFIX: "nas-reminders-test-approval", INTEGRATION_TEST_ACTIVITIES_JSON: JSON.stringify([{ activityId: "wellness-test-approval", title: "TEST: No sending before approval", startsAt: "2026-10-28T18:00:00Z" }]) };
    const response = await agendaGet(request(), { env: settings, store: memorySubmissionStore({ workshop: [row({ sessionId: "wellness-test-approval" })] }) });
    const data = await response.json();
    expect(data.previewJobs).toHaveLength(2); expect(data.reminderJobs).toEqual([]); expect(data.sendApproval).toBe("pending");
  });
  it("does not revive a cancelled or held selection through an older duplicate", async () => {
    const store = memorySubmissionStore({ workshop: [row(), row({ id: "new", submittedAt: "2026-10-22T10:00:00Z", cancelledAt: "2026-10-22T11:00:00Z" })] });
    expect((await buildWellnessAgenda(store)).recipients).toEqual([]);
  });
  it("keeps the latest signup across email or phone changes, including cancellation tombstones", async () => {
    for (const change of [{ email: "new@example.com" }, { phone: "+17025550101" }]) {
      const latest = row({ id: "new", submittedAt: "2026-10-23T10:00:00Z", ...change });
      const store = memorySubmissionStore({ workshop: [row(), latest] });
      expect((await buildWellnessAgenda(store)).recipients[0]!.selections[0]!.sourceRecordId).toBe("new");
      await store.add("workshop", { ...latest, cancelledAt: "2026-10-23T11:00:00Z" } as WorkshopSubmission);
      expect((await buildWellnessAgenda(store)).recipients).toEqual([]);
    }
  });
});

describe("staff decisions and capacity suppression", () => {
  it.each(["hold", "declined"] as const)("suppresses a %s decision and permits a later explicit approval", async decision => {
    const store = memorySubmissionStore({ workshop: [row()], programApproval: [approval(decision)] });
    expect((await buildWellnessAgenda(store)).recipients).toEqual([]);
    await store.add("programApproval", approval("approved", "2026-10-23T10:00:00Z"));
    expect((await buildWellnessAgenda(store)).recipients[0]!.selections[0]!.registrationStatus).toBe("confirmed");
  });
  it("a newer decline or tied hold suppresses a previous approval", async () => {
    for (const decision of [approval("declined", "2026-10-23T10:00:00Z"), approval("hold")]) {
      const data = await buildWellnessAgenda(memorySubmissionStore({ workshop: [row()], programApproval: [approval("approved"), decision] }));
      expect(data.recipients).toEqual([]);
    }
  });
  it("matches a decision to the exact source record and class", async () => {
    const data = await buildWellnessAgenda(memorySubmissionStore({ workshop: [row()], programApproval: [approval("declined", undefined, { eventKey: "wellness-nov4-pilates-1" })] }));
    expect(data.recipients).toHaveLength(1);
  });
  it("respects an approved request's contact hold until staff marks it ready", async () => {
    const held = approval("approved", undefined, { confirmationStatus: "hold" });
    const store = memorySubmissionStore({ workshop: [row()], programApproval: [held] });
    expect((await buildWellnessAgenda(store)).recipients).toEqual([]);
    await store.add("programApproval", approval("approved", "2026-10-23T10:00:00Z"));
    expect((await buildWellnessAgenda(store)).recipients).toHaveLength(1);
  });
  it("requires a registered ledger entry when a capacity snapshot is supplied", async () => {
    const store = memorySubmissionStore({ workshop: [row()] });
    for (const status of ["waitlisted", "cancelled"] as const) expect((await buildWellnessAgenda(store, { bookingStatuses: new Map([["signup-1", status]]) })).recipients).toEqual([]);
    expect((await buildWellnessAgenda(store, { bookingStatuses: new Map() })).recipients).toEqual([]);
    expect((await buildWellnessAgenda(store, { bookingStatuses: new Map([["signup-1", "registered"]]) })).recipients).toHaveLength(1);
  });
  it("holds malformed staff data rather than accidentally authorizing a reminder", async () => {
    const store = memorySubmissionStore({ workshop: [row()], programApproval: [approval("approved", undefined, { reviewedAt: "invalid" })] });
    expect((await agendaGet(request(), { env, store })).status).toBe(503);
  });
  it("fails closed if capacity is enabled without approved limits or a readable ledger", async () => {
    const store = memorySubmissionStore({ workshop: [row()] });
    expect((await agendaGet(request(), { env: { ...env, WELLNESS_BOOKING_ENABLED: "true" }, store })).status).toBe(503);
    const bookingStoreProvider = vi.fn(async () => { throw new Error("ledger unavailable"); });
    expect((await agendaGet(request(), { env, store, bookingStoreProvider })).status).toBe(503);
    bookingStoreProvider.mockClear();
    expect((await agendaGet(request(), { env: {}, store, bookingStoreProvider })).status).toBe(401);
    expect(bookingStoreProvider).not.toHaveBeenCalled();
  });
});

describe("contact identity and consent", () => {
  it.each([["(702) 555-0100", phone], ["+44 20 7946 0000", "+442079460000"], ["020 7946 0000", null], ["5550100", null], ["+1 123 456 7890", null]])("normalizes %s without guessing foreign numbers", (input, expected) => expect(smsPhone(input)).toBe(expected));
  it("holds a phone shared by different named guests", async () => {
    const result = await buildWellnessAgenda(memorySubmissionStore({ workshop: [row(), row({ id: "other", name: "Sam Example", email: "sam@example.com" })] }));
    expect(result.recipients).toEqual([]);
  });
  it("distinguishes a submitted form's event-only permission from the updates checkbox", async () => {
    for (const textConsent of [false, true]) {
      const result = await buildWellnessAgenda(memorySubmissionStore({ workshop: [row({ textConsent })] }));
      expect(result.recipients[0]!.sms.scope).toBe(textConsent ? "event-and-updates" : "event-only");
    }
    expect((await buildWellnessAgenda(memorySubmissionStore({ workshop: [row({ source: "import" })] }))).recipients).toEqual([]);
  });
  it("STOP beats a newer checkbox, and a yes on another phone cannot undo it", async () => {
    const no = preference("no", "2026-10-22T10:00:00Z");
    for (const yes of [preference("yes", no.submittedAt), preference("yes", "2026-10-23T10:00:00Z", { phone: "+17025550101", email: "alex@example.com" })]) {
      expect((await buildWellnessAgenda(memorySubmissionStore({ workshop: [row({ textConsent: true })], textPreference: [no, yes] }))).recipients).toEqual([]);
    }
    const result = await buildWellnessAgenda(memorySubmissionStore({ workshop: [row()], textPreference: [no, preference("yes", "2026-10-23T10:00:00Z")] }));
    expect(planReminders(result)).toHaveLength(2);
  });
});
