import type { Store } from "@netlify/blobs";
import { expect, it, vi } from "vitest";
import { blobBookingStore, readOnlyBookingStore, wellnessLedgerKey } from "./blob-store";
import { emptyLedger } from "./ledger";

const provider = () => ({ getWithMetadata: vi.fn(async (): Promise<unknown> => null), setJSON: vi.fn(async () => ({ modified: true })) });
const adapter = (mock: ReturnType<typeof provider>, allowCreate = true) => blobBookingStore(mock as unknown as Pick<Store, "getWithMetadata" | "setJSON">, { allowCreate });
it("uses create-only and exact ETag-match writes instead of unconditional overwrites", async () => {
  const mock = provider(); const store = adapter(mock); const value = emptyLedger();
  await store.compareAndSet(null, value); await store.compareAndSet("etag-1", value);
  expect(mock.setJSON.mock.calls).toEqual([[wellnessLedgerKey, value, { onlyIfNew: true }], [wellnessLedgerKey, value, { onlyIfMatch: "etag-1" }]]);
});
it("returns a conflict for a failed conditional write", async () => {
  const mock = provider(); mock.setJSON.mockResolvedValueOnce({ modified: false });
  expect(await adapter(mock).compareAndSet("old-etag", emptyLedger())).toBe(false);
});
it("requires a strongly read, validated snapshot with an ETag", async () => {
  const mock = provider(); mock.getWithMetadata.mockResolvedValueOnce({ data: emptyLedger(), etag: "fresh-etag" });
  expect(await adapter(mock).read()).toEqual({ value: emptyLedger(), etag: "fresh-etag" });
  expect(mock.getWithMetadata).toHaveBeenCalledWith(wellnessLedgerKey, { type: "json", consistency: "strong" });
  mock.getWithMetadata.mockResolvedValueOnce({ data: emptyLedger() });
  await expect(adapter(mock).read()).rejects.toThrow("concurrency token");
});
it("never creates a missing live ledger without an explicit migration", async () => {
  const mock = provider(); const store = adapter(mock, false);
  await expect(store.read()).rejects.toThrow("reviewed migration");
  await expect(store.compareAndSet(null, emptyLedger())).rejects.toThrow("disabled");
  expect(mock.setJSON).not.toHaveBeenCalled();
});
it("restricts reminder integrations to booking reads", async () => {
  const mock = provider(); const readOnly = readOnlyBookingStore(adapter(mock));
  expect(await readOnly.read()).toBeNull();
  await expect(readOnly.compareAndSet(null, emptyLedger())).rejects.toThrow("cannot write booking");
  expect(mock.setJSON).not.toHaveBeenCalled();
});
