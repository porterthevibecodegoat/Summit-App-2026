import { afterEach, expect, it, vi } from "vitest";
import { integrationStore } from "./store";
const getStore = vi.hoisted(() => vi.fn((_options: unknown) => ({ setJSON: vi.fn(), delete: vi.fn(), list: vi.fn(async () => ({ blobs: [{ key: "workshop/one.json" }] })), get: vi.fn(async (): Promise<unknown> => ({ id: "one", submittedAt: "2026-10-22T00:00:00Z" })) })));
vi.mock("@netlify/blobs", () => ({ getStore }));
afterEach(() => { vi.unstubAllEnvs(); getStore.mockClear(); });
it("refuses a preview that would share the production store", async () => {
  vi.stubEnv("NETLIFY", "true"); vi.stubEnv("CONTEXT", "deploy-preview"); vi.stubEnv("INTEGRATION_TEST_STORE_PREFIX", "");
  await expect(integrationStore()).rejects.toThrow("isolated"); expect(getStore).not.toHaveBeenCalled();
});
it("uses fresh strong stores and a separate journal for a configured test preview", async () => {
  vi.stubEnv("NETLIFY", "true"); vi.stubEnv("CONTEXT", "deploy-preview"); vi.stubEnv("INTEGRATION_TEST_STORE_PREFIX", "nas-reminders-test-oct22");
  await integrationStore(); await integrationStore();
  expect(getStore.mock.calls.map(c => c[0])).toEqual([
    { name: "nas-reminders-test-oct22", consistency: "strong" }, { name: "nas-reminders-test-oct22-journal", consistency: "strong" },
    { name: "nas-reminders-test-oct22", consistency: "strong" }, { name: "nas-reminders-test-oct22-journal", consistency: "strong" },
  ]);
});
it("fails instead of silently omitting an unreadable blob", async () => {
  vi.stubEnv("NETLIFY", "true"); vi.stubEnv("CONTEXT", "production"); vi.stubEnv("INTEGRATION_TEST_STORE_PREFIX", "");
  const store = await integrationStore(); getStore.mock.results[0]!.value.get.mockResolvedValueOnce(null);
  await expect(store.list("workshop")).rejects.toThrow("Incomplete");
});
it("requires explicit local test data", async () => {
  vi.stubEnv("NETLIFY", ""); vi.stubEnv("NETLIFY_BLOBS_CONTEXT", ""); vi.stubEnv("STAFF_PORTAL_FILE", "");
  await expect(integrationStore()).rejects.toThrow("not configured");
});
