import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { handleWellnessPost } from "../../app/api/wellness/route";
import { handleManagePost } from "../../app/api/wellness/manage/route";
import { siteVisitWaiver } from "../morning-workshops";
import { memorySubmissionStore } from "../staff/store";
import { buildWellnessAgenda } from "../integrations/agenda";
import { planReminders } from "../integrations/planner";
import { agendaGet } from "../integrations/handlers";
import { wellnessSessions } from "../wellness-signups-2026";
import { capacityRules } from "./capacity";
import { bookingStatuses, memoryBookingStore } from "./ledger";
import { createBookingWorkflow, memoryIntakeStore } from "./service";

const sessionId = "wellness-nov2-breathwork";
const secret = "fictional-management-secret-at-least-32-characters";
const body = (i = 0, sessions = [sessionId]) => ({ name: `Example Guest ${i}`, email: `guest${i}@example.com`, phone: `+170255501${String(i).padStart(2, "0")}`, sessions, waiverAccepted: true, signature: `Example Guest ${i}`, waiverVersion: siteVisitWaiver.version, website: "", textConsent: false });
const post = (data: unknown, id = randomUUID()) => new Request("https://example.test/api/wellness", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": id }, body: JSON.stringify(data) });
const token = (url: string) => new URLSearchParams(url.split("#")[1]).get("token")!;
function setup(limit = 2) {
  const source = memorySubmissionStore(), ledger = memoryBookingStore(), intakes = memoryIntakeStore();
  let time = new Date("2026-10-26T22:00:00Z");
  const rules = capacityRules(Object.fromEntries(wellnessSessions.map(session => [session.id, session.id === sessionId ? { mode: "limited", maxPlaces: limit } : { mode: "unlimited", maxPlaces: null }])));
  const workflow = createBookingWorkflow({ source, ledger, intakes, rules, managementSecret: secret, now: () => time });
  return { source, ledger, intakes, rules, workflow, setTime: (value: string) => { time = new Date(value); } };
}

describe("wellness signup binding and recovery", () => {
  it("saves canonical per-class source records and returns a private management link", async () => {
    const { source, ledger, workflow } = setup();
    const response = await handleWellnessPost(post(body(0, [sessionId, "wellness-nov3-pickleball"])), source, workflow);
    expect(response.status).toBe(201);
    const result = await response.json(); expect(result.bookings.map((b: { status: string }) => b.status)).toEqual(["registered", "registered"]);
    expect(result.manageUrl).toMatch(/^\/wellness\/manage.html#token=/);
    const rows = await source.list("workshop"); expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ category: "wellness", waiverAccepted: true, signature: "Example Guest 0", waiverVersion: siteVisitWaiver.version });
    expect((await ledger.read())!.value.intakes[0]!.materializedAt).not.toBeNull();
  });
  it("replays the original IDs and timestamps without consuming seats or writing the signup twice", async () => {
    const { source, ledger, workflow, setTime } = setup(); const requestId = randomUUID();
    const original = await workflow.register(body(), requestId); const before = await source.list("workshop");
    const add = vi.spyOn(source, "add"); setTime("2026-10-27T12:00:00Z");
    const retry = await workflow.register(body(), requestId);
    expect(retry.bookings).toEqual(original.bookings); expect(await source.list("workshop")).toEqual(before); expect(add).not.toHaveBeenCalled();
    expect((await ledger.read())!.value.bookings).toHaveLength(1);
    await expect(workflow.register({ ...body(), phone: "+17025550999" }, requestId)).rejects.toMatchObject({ status: 409 });
  });
  it("recovers a partial source save and holds every reminder until the whole intake is acknowledged", async () => {
    const { source, ledger, workflow } = setup(); const requestId = randomUUID();
    const original = source.add.bind(source); let attempts = 0;
    vi.spyOn(source, "add").mockImplementation(async (kind, value) => { attempts++; if (attempts === 2) throw new Error("simulated connection failure"); await original(kind as "workshop", value as never); });
    const input = body(0, [sessionId, "wellness-nov3-pickleball"]);
    await expect(workflow.register(input, requestId)).rejects.toThrow("simulated");
    expect(await source.list("workshop")).toHaveLength(1);
    expect((await buildWellnessAgenda(source, { bookingStatuses: bookingStatuses((await ledger.read())!.value) })).recipients).toEqual([]);
    await workflow.register(input, requestId);
    expect(await source.list("workshop")).toHaveLength(2); expect((await ledger.read())!.value.bookings).toHaveLength(2);
    expect((await buildWellnessAgenda(source, { bookingStatuses: bookingStatuses((await ledger.read())!.value) })).recipients[0]!.selections).toHaveLength(2);
  });
  it("does not give a new anonymous request access to an existing attendee's management link", async () => {
    const { workflow, ledger } = setup(); await workflow.register(body(), randomUUID());
    await expect(workflow.register(body(), randomUUID())).rejects.toMatchObject({ status: 409 });
    expect((await ledger.read())!.value.bookings).toHaveLength(1);
  });
  it("counts form intakes rather than class rows and preserves the existing three-submission policy", async () => {
    const { workflow, source } = setup(); const original = randomUUID();
    await workflow.register(body(0, [sessionId, "wellness-nov3-pickleball", "wellness-nov4-pickleball"]), original);
    await workflow.register(body(0, ["wellness-nov3-pilates-1"]), randomUUID());
    await workflow.register(body(0, ["wellness-nov4-pilates-1"]), randomUUID());
    await expect(workflow.register({ ...body(1, ["wellness-nov3-pilates-2"]), phone: body().phone }, randomUUID())).rejects.toMatchObject({ status: 409 });
    await workflow.register(body(0, [sessionId, "wellness-nov3-pickleball", "wellness-nov4-pickleball"]), original);
    expect(await source.list("workshop")).toHaveLength(5);
  });
  it("handles simultaneous full signup flows with stable retries and no overbooking", async () => {
    const { source, ledger, workflow } = setup(2);
    await Promise.all(Array.from({ length: 20 }, async (_, i) => {
      const id = randomUUID();
      for (let attempt = 0; attempt < 4; attempt++) {
        try { await workflow.register(body(i), id); return; }
        catch (error) { if (!(error instanceof Error) || !/busy|pending confirmation/.test(error.message) || attempt === 3) throw error; }
      }
    }));
    const state = (await ledger.read())!.value;
    expect(state.bookings.filter(row => row.status === "registered")).toHaveLength(2);
    expect(state.bookings.filter(row => row.status === "waitlisted")).toHaveLength(18);
    expect(state.intakes.every(intake => intake.materializedAt)).toBe(true);
    expect(await source.list("workshop")).toHaveLength(20);
  });
  it("can finish an already reserved pending save after the activity starts without allocating another place", async () => {
    const { source, ledger, workflow, setTime } = setup(); const id = randomUUID();
    vi.spyOn(source, "add").mockRejectedValueOnce(new Error("temporary source failure"));
    await expect(workflow.register(body(), id)).rejects.toThrow();
    setTime("2026-11-02T22:00:00Z");
    await workflow.recover(id);
    expect((await ledger.read())!.value.bookings).toHaveLength(1);
    expect((await ledger.read())!.value.intakes[0]!.materializedAt).not.toBeNull();
    expect(await source.list("workshop")).toHaveLength(1);
  });
});

describe("private cancellation and automatic promotion", () => {
  it("promotes the first waiting guest once and removes the cancelled activity from reminder planning", async () => {
    const { workflow, ledger, source } = setup(1);
    const first = await workflow.register(body(0), randomUUID());
    const second = await workflow.register(body(1), randomUUID());
    const third = await workflow.register(body(2), randomUUID());
    expect(second.bookings[0]!.status).toBe("waitlisted"); expect(third.bookings[0]!.waitlistPosition).toBe(2);
    const requestId = randomUUID();
    await workflow.manage(token(first.manageUrl), "cancel", first.bookings[0]!.id, requestId);
    await workflow.manage(token(first.manageUrl), "cancel", first.bookings[0]!.id, requestId);
    const state = (await ledger.read())!.value;
    expect((await workflow.manage(token(second.manageUrl), "view")).bookings[0]!.status).toBe("registered");
    expect((await workflow.manage(token(third.manageUrl), "view")).bookings[0]!.waitlistPosition).toBe(1);
    const agenda = await buildWellnessAgenda(source, { bookingStatuses: bookingStatuses(state) });
    expect(agenda.recipients.map(r => r.phone)).toEqual([body(1).phone]);
    const promotions = planReminders(agenda, state).filter(job => job.kind === "promotion"); expect(promotions).toHaveLength(1);
    expect(promotions[0]!.body).toContain("now registered");
    const request = new Request("https://example.test/api/integrations/agenda", { headers: { authorization: "Bearer fictional-feed-secret-at-least-32-characters" } });
    const response = await agendaGet(request, { store: source, bookingStoreProvider: async () => ledger, env: { INTEGRATION_FEED_TOKEN: "fictional-feed-secret-at-least-32-characters" } });
    const preview = await response.json(); expect(preview.reminderJobs).toEqual([]); expect(preview.previewJobs.some((job: { kind: string }) => job.kind === "promotion")).toBe(true);
  });
  it("does not reveal another intake or permit cross-intake cancellation", async () => {
    const { workflow } = setup();
    const first = await workflow.register(body(0), randomUUID()), second = await workflow.register(body(1), randomUUID());
    await expect(workflow.manage(token(first.manageUrl), "cancel", second.bookings[0]!.id, randomUUID())).rejects.toMatchObject({ status: 404 });
    const view = await workflow.manage(token(first.manageUrl), "view");
    expect(view.bookings).toHaveLength(1); expect(JSON.stringify(view)).not.toContain(body(1).email);
    await expect(workflow.manage(token(first.manageUrl).slice(0, -3) + "bad", "view")).rejects.toMatchObject({ status: 401 });
  });
  it("rejects expired links and cancellation after the class begins", async () => {
    const { workflow, setTime } = setup(); const booking = await workflow.register(body(), randomUUID());
    setTime("2026-11-02T21:30:00Z");
    await expect(workflow.manage(token(booking.manageUrl), "cancel", booking.bookings[0]!.id, randomUUID())).rejects.toMatchObject({ status: 409 });
    setTime("2026-11-04T00:00:00Z"); await expect(workflow.manage(token(booking.manageUrl), "view")).rejects.toMatchObject({ status: 401 });
  });
  it("enforces JSON, Origin, body size and private response headers at the HTTP boundary", async () => {
    const { workflow } = setup(); const booking = await workflow.register(body(), randomUUID());
    const request = (origin: string | null, payload: unknown) => new Request("https://example.test/api/wellness/manage", { method: "POST", headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }, body: JSON.stringify(payload) });
    const fields = { token: token(booking.manageUrl), action: "view" };
    for (const origin of [null, "https://other.test"]) expect((await handleManagePost(request(origin, fields), workflow)).status).toBe(403);
    const response = await handleManagePost(request("https://example.test", fields), workflow);
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await handleManagePost(request("https://example.test", { ...fields, token: "x".repeat(6000) }), workflow)).status).toBe(413);
  });
  it("previews an immediate promotion even when the one-hour reminder window has already passed", async () => {
    const { workflow, ledger, source, setTime } = setup(1);
    const first = await workflow.register(body(0), randomUUID()); await workflow.register(body(1), randomUUID());
    setTime("2026-11-02T21:00:00Z");
    await workflow.manage(token(first.manageUrl), "cancel", first.bookings[0]!.id, randomUUID());
    const state = (await ledger.read())!.value, agenda = await buildWellnessAgenda(source, { bookingStatuses: bookingStatuses(state) });
    const job = planReminders(agenda, state).find(row => row.kind === "promotion")!;
    expect(job.dueAt).toBe("2026-11-02T21:00:00.000Z"); expect(job.sendBefore).toBe("2026-11-02T21:15:00.000Z");
    expect(job.to).toBe(body(1).phone);
  });
});
