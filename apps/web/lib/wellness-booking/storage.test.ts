import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it, vi } from "vitest";
import { getWellnessWorkflow, wellnessInboxStore, fileBookingStore } from "./workflow-store";
import { applyBookingCommand, emptyLedger } from "./ledger";
import { capacityRules } from "./capacity";
import { siteVisitWaiver } from "../morning-workshops";

const getStore = vi.hoisted(() => vi.fn(() => ({ getWithMetadata: vi.fn(async () => null), get: vi.fn(async () => null), setJSON: vi.fn(async () => ({ modified: true })), list: vi.fn(async () => ({ blobs: [] })), delete: vi.fn() })));
vi.mock("@netlify/blobs", () => ({ getStore }));
const directories: string[] = [];
const directory = () => { const path = join(tmpdir(), `nas-reminders-test-${randomUUID()}`); mkdirSync(path); directories.push(path); return path; };
const env = { WELLNESS_BOOKING_ENABLED: "true", WELLNESS_BOOKING_MODE: "test", INTEGRATION_TEST_STORE_PREFIX: "nas-reminders-test-booking", WELLNESS_MANAGEMENT_SECRET: "fictional-local-management-secret-32-characters", WELLNESS_BOOKING_TEST_CAPACITY_JSON: JSON.stringify({ status: "test-only", sessions: { "wellness-nov2-breathwork": { mode: "limited", maxPlaces: 1 } } }) };
afterEach(() => { getStore.mockClear(); for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });

it("does nothing when booking is disabled and refuses unsafe live/test combinations", async () => {
  expect(await getWellnessWorkflow({})).toBeUndefined();
  for (const settings of [{ ...env, CONTEXT: "production" }, { ...env, INTEGRATION_TEST_STORE_PREFIX: "staff-portal" }, { ...env, WELLNESS_BOOKING_MODE: "live" }, { ...env, WELLNESS_MANAGEMENT_SECRET: "short" }]) await expect(getWellnessWorkflow(settings)).rejects.toThrow();
  expect(getStore).not.toHaveBeenCalled();
});
it("keeps preview booking writes and raw inbox copies inside isolated provider stores", async () => {
  await getWellnessWorkflow({ ...env, NETLIFY: "true", CONTEXT: "deploy-preview" });
  await wellnessInboxStore({ ...env, NETLIFY: "true", CONTEXT: "deploy-preview" });
  expect(getStore.mock.calls.map(call => (call as unknown as [{ name: string }])[0].name)).toEqual(["nas-reminders-test-booking", "nas-reminders-test-booking-journal", "nas-reminders-test-booking-inbox"]);
  expect(getStore.mock.results.flatMap(result => result.value.setJSON.mock.calls)).toEqual([]);
});
it("persists a recoverable local signup only in an explicitly named test directory", async () => {
  const path = directory(); const workflow = (await getWellnessWorkflow({ ...env, WELLNESS_BOOKING_TEST_DIRECTORY: path }))!;
  const requestId = randomUUID();
  const body = { name: "Example Guest", email: "guest@example.com", phone: "+17025550100", sessions: ["wellness-nov2-breathwork"], waiverAccepted: true, signature: "Example Guest", waiverVersion: siteVisitWaiver.version };
  await workflow.register(body, requestId);
  const reopened = (await getWellnessWorkflow({ ...env, WELLNESS_BOOKING_TEST_DIRECTORY: path }))!;
  await reopened.register(body, requestId);
  expect(JSON.parse(readFileSync(join(path, "source.json"), "utf8")).workshop).toHaveLength(1);
  expect((await reopened.summary()).pendingIntakes).toEqual([]);
  expect(getStore).not.toHaveBeenCalled();
});
it("rejects stale ETags across separate file-store instances", async () => {
  const path = join(directory(), "ledger.json"), first = fileBookingStore(path), second = fileBookingStore(path);
  expect(await first.compareAndSet(null, emptyLedger())).toBe(true);
  expect(await second.compareAndSet(null, emptyLedger())).toBe(false);
  const snapshot = (await first.read())!;
  await applyBookingCommand(first, capacityRules({ "wellness-nov2-breathwork": { mode: "limited", maxPlaces: 1 } }), { action: "reserve", requestId: "file-rehearsal", attendeeKey: "1".repeat(64), at: "2026-10-26T22:00:00Z", selections: [{ sessionId: "wellness-nov2-breathwork", sourceRecordId: "file-source" }] });
  expect(await second.compareAndSet(snapshot.etag, emptyLedger())).toBe(false);
  expect((await first.read())!.value.bookings).toHaveLength(1);
});
