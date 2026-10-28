import { afterEach, expect, it, vi } from "vitest";
import { agendaGet, clicksendInboundPost } from "./handlers";
import { sourceSubmissionStore, summitSourceSiteId } from "./source-store";
import type { TextPreferenceRecord, SubmissionKind } from "../staff/store";
const getStore = vi.hoisted(() => vi.fn((_options: unknown) => ({ setJSON: vi.fn(async () => undefined), list: vi.fn(async () => ({ blobs: [{ key: "workshop/fixture.json" }] })), get: vi.fn(async (): Promise<unknown> => ({ id: "fixture", submittedAt: "2026-10-24T00:00:00Z" })) })));
vi.mock("@netlify/blobs", () => ({ getStore }));
const env = { SOURCE_NETLIFY_SITE_ID: summitSourceSiteId, SOURCE_NETLIFY_TOKEN: "fictional-source-token", REMINDER_SOURCE_MODE: "test", INTEGRATION_TEST_STORE_PREFIX: "nas-reminders-test-oct24" };
const stop: TextPreferenceRecord = { id: "clicksend-stop-fictional", submittedAt: "2026-10-24T00:00:00Z", source: "staff", name: "", email: "", phone: "+17025550100", choice: "no", via: "stop-reply" };
afterEach(() => getStore.mockClear());
it("targets the confirmed source project, region and isolated test stores", async () => {
  await sourceSubmissionStore(env);
  expect(getStore.mock.calls.map(c => c[0])).toEqual([
    { siteID: summitSourceSiteId, token: env.SOURCE_NETLIFY_TOKEN, region: "us-east-2", consistency: "strong", name: "nas-reminders-test-oct24" },
    { siteID: summitSourceSiteId, token: env.SOURCE_NETLIFY_TOKEN, region: "us-east-2", consistency: "strong", name: "nas-reminders-test-oct24-journal" },
  ]);
});
it.each([{}, { ...env, SOURCE_NETLIFY_SITE_ID: "another-project" }, { ...env, SOURCE_NETLIFY_TOKEN: "" }, { ...env, INTEGRATION_TEST_STORE_PREFIX: "staff-portal" }, { ...env, REMINDER_SOURCE_MODE: "live" }, { ...env, REMINDER_SOURCE_MODE: "typo" }])("fails closed on unsafe/incomplete source configuration %j", async config => {
  await expect(sourceSubmissionStore(config)).rejects.toThrow(); expect(getStore).not.toHaveBeenCalled();
});
it("uses fresh clients for each request and limits readable record kinds", async () => {
  await sourceSubmissionStore(env); const store = await sourceSubmissionStore(env);
  expect(getStore).toHaveBeenCalledTimes(4);
  const read = store.list as (kind: SubmissionKind) => Promise<unknown[]>;
  for (const kind of ["poker", "rsvp", "vipRsvp", "closingDinner"] as const) {
    await expect(read(kind)).rejects.toThrow("cannot read");
  }
  expect(getStore.mock.results[2]!.value.list).not.toHaveBeenCalled();
});
it("treats a missing blob as a failed snapshot", async () => {
  const store = await sourceSubmissionStore(env); getStore.mock.results[0]!.value.get.mockResolvedValueOnce(null);
  await expect(store.list("workshop")).rejects.toThrow("Incomplete");
});
it("writes only opt-outs and journals them before the primary save", async () => {
  const store = await sourceSubmissionStore(env); await store.add("textPreference", stop);
  const primary = getStore.mock.results[0]!.value.setJSON, journal = getStore.mock.results[1]!.value.setJSON;
  expect(journal.mock.invocationCallOrder[0]).toBeLessThan(primary.mock.invocationCallOrder[0]!);
  expect(primary).toHaveBeenCalledWith(`textPreference/${stop.submittedAt}-${stop.id}.json`, stop);
  await expect(store.add("textPreference", { ...stop, choice: "yes" })).rejects.toThrow("Only inbound");
  await expect(store.delete("workshop", { id: "x", submittedAt: stop.submittedAt })).rejects.toThrow("cannot delete");
});
it("keeps production writes off until explicitly enabled", async () => {
  const live = { ...env, INTEGRATION_TEST_STORE_PREFIX: "", REMINDER_SOURCE_MODE: "live" };
  const store = await sourceSubmissionStore(live);
  await expect(store.add("textPreference", stop)).rejects.toThrow("not been enabled");
  expect(getStore.mock.results[0]!.value.setJSON).not.toHaveBeenCalled();
  const enabled = await sourceSubmissionStore({ ...live, REMINDER_SOURCE_WRITES_ENABLED: "true" });
  await enabled.add("textPreference", stop); expect(getStore.mock.results[2]!.value.setJSON).toHaveBeenCalledOnce();
});
it("never opens a source connection for an unauthenticated request", async () => {
  const storeProvider = vi.fn(() => sourceSubmissionStore(env));
  const req = new Request("https://example.test/api/integrations/agenda");
  expect((await agendaGet(req, { storeProvider, env: {} })).status).toBe(401);
  expect((await clicksendInboundPost(new Request("https://example.test/api/integrations/clicksend-inbound", { method: "POST" }), { storeProvider, env: {} })).status).toBe(401);
  expect(storeProvider).not.toHaveBeenCalled(); expect(getStore).not.toHaveBeenCalled();
});
