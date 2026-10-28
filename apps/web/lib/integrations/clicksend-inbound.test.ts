import { describe, expect, it, vi } from "vitest";
import { memorySubmissionStore, type WorkshopSubmission, type TextPreferenceRecord } from "../staff/store";
import { buildWellnessAgenda as buildAgenda } from "./agenda";
import { clicksendInboundPost } from "./handlers";
const now = new Date("2026-10-22T20:00:00Z");
const phone = "+17025550100";
const env = { INTEGRATION_FEED_TOKEN: "feed-test-credential-32-characters-minimum", CLICKSEND_INBOUND_SECRET: "inbound-test-credential-32-characters-minimum", CLICKSEND_DEDICATED_NUMBER: "+17753072334", CLICKSEND_EXPECTED_USER_ID: "test-account" };
const workshop = (over: Partial<WorkshopSubmission> = {}): WorkshopSubmission => ({ id: "class-1", source: "form", submittedAt: "2026-10-20T10:00:00Z", name: "Alex Example", phone, email: "alex@example.com", category: "wellness", sessionId: "wellness-nov3-pilates-1", sessionTitle: "Stale title ignored", sessionDay: "", sessionTime: "", ...over });
const pref = (choice: "yes" | "no", submittedAt: string, over: Partial<TextPreferenceRecord> = {}): TextPreferenceRecord => ({ id: `${choice}-${submittedAt}`, name: "", email: "", phone, choice, submittedAt, source: "staff", via: "page", ...over });
const inboundFields = { from: phone, to: env.CLICKSEND_DEDICATED_NUMBER, body: "STOP", user_id: env.CLICKSEND_EXPECTED_USER_ID, timestamp: "2026-10-22T19:00:00Z", inboundmessage_id: "inbound-unique-1", original_message_id: "outbound-1" };
function inbound(over: Record<string, unknown> = {}, form = false, token = env.CLICKSEND_INBOUND_SECRET) {
  const fields = { ...inboundFields, ...over };
  return new Request(`https://example.test/api/integrations/clicksend-inbound${form ? `?token=${token}` : ""}`, { method: "POST", headers: { "content-type": form ? "application/x-www-form-urlencoded" : "application/json", ...(form ? {} : { authorization: `Bearer ${token}` }) }, body: form ? new URLSearchParams(fields as Record<string, string>).toString() : JSON.stringify(fields) });
}

describe("durable ClickSend STOP sync", () => {
  it.each([false, true])("accepts the captured current message_id field and suppresses reminders (%s)", async form => {
    const store = memorySubmissionStore({ workshop: [workshop()] });
    const fields = { inboundmessage_id: "", message_id: "2B304769-47A8-47C7-9AC7-05B96205B51F", timestamp: String(Date.parse(inboundFields.timestamp) / 1000), body: "Stop" };
    expect(await (await clicksendInboundPost(inbound(fields, form), { store, env, now })).json()).toEqual({ ok: true, action: "opted-out" });
    expect((await store.list("textPreference"))[0]).toMatchObject({ phone, choice: "no", providerEventId: fields.message_id });
    expect((await buildAgenda(store)).recipients).toEqual([]);
    expect(await (await clicksendInboundPost(inbound(fields, form), { store, env, now })).json()).toEqual({ ok: true, action: "duplicate" });
    expect(await store.list("textPreference")).toHaveLength(1);
  });
  it("deduplicates across current and legacy ID aliases, while keeping distinct replies to one outbound message", async () => {
    const store = memorySubmissionStore();
    await clicksendInboundPost(inbound(), { store, env, now });
    const retry = await clicksendInboundPost(inbound({ inboundmessage_id: "", message_id: inboundFields.inboundmessage_id }), { store, env, now });
    expect(await retry.json()).toEqual({ ok: true, action: "duplicate" });
    await clicksendInboundPost(inbound({ inboundmessage_id: "", message_id: "another-incoming-reply" }), { store, env, now });
    expect(await store.list("textPreference")).toHaveLength(2);
  });
  it.each([{ message_id: "conflicting-reply" }, { message_id: "invalid/id" }])("rejects ambiguous or malformed current IDs %j", async fields => {
    const store = memorySubmissionStore();
    expect((await clicksendInboundPost(inbound(fields), { store, env, now })).status).toBe(400);
    expect(await store.list("textPreference")).toEqual([]);
  });
  it.each([false, true])("accepts configured JSON/form encoding (%s), persists then suppresses the feed", async form => {
    const store = memorySubmissionStore({ workshop: [workshop()] });
    expect((await clicksendInboundPost(inbound({ body: "  stop  " }, form), { store, env, now })).status).toBe(200);
    const records = await store.list("textPreference"); expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ phone, choice: "no", via: "stop-reply", submittedAt: "2026-10-22T19:00:00.000Z", receivedAt: now.toISOString() });
    expect((await buildAgenda(store)).recipients).toEqual([]);
  });
  it("rejects wrong credentials before parsing or reading storage", async () => {
    const store = memorySubmissionStore(); const list = vi.spyOn(store, "list");
    expect((await clicksendInboundPost(inbound({}, false, env.INTEGRATION_FEED_TOKEN), { store, env, now })).status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });
  it.each([{ user_id: "another-account" }, { to: "+17025550101" }])("rejects wrong account/destination %j", async fields => {
    const store = memorySubmissionStore(); expect((await clicksendInboundPost(inbound(fields), { store, env, now })).status).toBe(403); expect(await store.list("textPreference")).toEqual([]);
  });
  it("requires the expected account and dedicated number to be configured", async () => {
    expect((await clicksendInboundPost(inbound(), { store: memorySubmissionStore(), env: { CLICKSEND_INBOUND_SECRET: env.CLICKSEND_INBOUND_SECRET }, now })).status).toBe(503);
  });
  it.each(["Can we stop by at 9?", "Please cancel my dinner reservation", "START", "HELP"])("does not mistake %s for an opt-out", async body => {
    const store = memorySubmissionStore(); const response = await clicksendInboundPost(inbound({ body }), { store, env, now });
    expect(await response.json()).toEqual({ ok: true, action: "ignored" }); expect(await store.list("textPreference")).toEqual([]);
  });
  it("deduplicates inbound ID rather than original outbound ID", async () => {
    const store = memorySubmissionStore();
    await clicksendInboundPost(inbound(), { store, env, now });
    const duplicate = await clicksendInboundPost(inbound(), { store, env, now: new Date("2026-10-23T20:00:00Z") });
    expect(await duplicate.json()).toEqual({ ok: true, action: "duplicate" });
    await clicksendInboundPost(inbound({ inboundmessage_id: "inbound-unique-2" }), { store, env, now });
    expect(await store.list("textPreference")).toHaveLength(2);
  });
  it("does not let delayed or replayed STOP override a later explicit yes", async () => {
    const store = memorySubmissionStore({ workshop: [workshop()], textPreference: [pref("yes", "2026-10-22T19:30:00Z")] });
    await clicksendInboundPost(inbound(), { store, env, now });
    await clicksendInboundPost(inbound(), { store, env, now: new Date("2026-10-23T20:00:00Z") });
    expect((await buildAgenda(store)).recipients).toHaveLength(1);
  });
  it("returns a retryable failure if durable saving fails", async () => {
    const store = memorySubmissionStore(); vi.spyOn(store, "add").mockRejectedValue(new Error("storage failure"));
    expect((await clicksendInboundPost(inbound(), { store, env, now })).status).toBe(503);
  });
  it.each([{ timestamp: "" }, { timestamp: "2099-01-01T00:00:00Z" }, { inboundmessage_id: "" }, { from: "5550100" }])("requires usable chronology and identity %j", async fields => {
    expect((await clicksendInboundPost(inbound(fields), { store: memorySubmissionStore(), env, now })).status).toBe(400);
  });
  it("enforces actual body size without relying on Content-Length", async () => {
    expect((await clicksendInboundPost(inbound({ body: "x".repeat(20_000) }), { store: memorySubmissionStore(), env, now })).status).toBe(413);
  });
  it("supports provider Unix timestamps and UTC timestamp strings", async () => {
    for (const timestamp of [String(Date.parse(inboundFields.timestamp) / 1000), "2026-10-22 19:00:00"]) {
      const store = memorySubmissionStore(); expect((await clicksendInboundPost(inbound({ timestamp }), { store, env, now })).status).toBe(200);
      expect((await store.list("textPreference"))[0]!.submittedAt).toBe("2026-10-22T19:00:00.000Z");
    }
  });
});
