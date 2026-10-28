import type { Store } from "@netlify/blobs";
import { ledgerSchema, type VersionedLedgerStore } from "./ledger";

export const wellnessLedgerKey = "wellness/ledger-v1.json";

export function readOnlyBookingStore(store: VersionedLedgerStore): VersionedLedgerStore {
  return {
    read: () => store.read(),
    async compareAndSet() { throw new Error("Reminder integrations cannot write booking data."); },
  };
}

// Receive an explicitly chosen request-scoped, strongly consistent store. This
// module never opens a production connection, seeds data or selects credentials.
export function blobBookingStore(blobs: Pick<Store, "getWithMetadata" | "setJSON">, options: { allowCreate: boolean }): VersionedLedgerStore {
  return {
    async read() {
      const result = await blobs.getWithMetadata(wellnessLedgerKey, { type: "json", consistency: "strong" });
      if (!result) {
        if (!options.allowCreate) throw new Error("The booking ledger must be initialized through a reviewed migration.");
        return null;
      }
      if (!result.etag) throw new Error("Booking snapshot has no concurrency token.");
      return { value: ledgerSchema.parse(result.data), etag: result.etag };
    },
    async compareAndSet(expectedEtag, value) {
      if (!expectedEtag && !options.allowCreate) throw new Error("Automatic ledger creation is disabled.");
      const result = await blobs.setJSON(wellnessLedgerKey, ledgerSchema.parse(value), expectedEtag ? { onlyIfMatch: expectedEtag } : { onlyIfNew: true });
      return result.modified;
    },
  };
}
