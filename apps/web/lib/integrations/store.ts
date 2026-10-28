import { readFileSync } from "node:fs";
import { fileSubmissionStore, journaledStore, mapWithConcurrency, netlifyBlobsSubmissionStore, withRetry, type SubmissionStore } from "../staff/store";
import { approvedCapacityRules } from "../wellness-booking/capacity";
import { blobBookingStore, readOnlyBookingStore } from "../wellness-booking/blob-store";
import { ledgerSchema, type VersionedLedgerStore } from "../wellness-booking/ledger";
import { getWellnessWorkflow } from "../wellness-booking/workflow-store";

export async function integrationBookingStore(env: Partial<NodeJS.ProcessEnv> = process.env): Promise<VersionedLedgerStore | undefined> {
  if (env.WELLNESS_BOOKING_ENABLED !== "true") return undefined;
  if (env.WELLNESS_BOOKING_MODE === "test") {
    const workflow = await getWellnessWorkflow(env);
    if (!workflow) throw new Error("Test booking workflow is unavailable.");
    return readOnlyBookingStore(workflow.ledger);
  }
  approvedCapacityRules();
  if (!(env.NETLIFY === "true" || env.NETLIFY_BLOBS_CONTEXT)) {
    if (!env.WELLNESS_BOOKING_FIXTURE_FILE) throw new Error("An explicit local booking fixture is required.");
    const path = env.WELLNESS_BOOKING_FIXTURE_FILE;
    return {
      async read() { return { value: ledgerSchema.parse(JSON.parse(readFileSync(path, "utf8"))), etag: "local-read-only" }; },
      async compareAndSet() { throw new Error("Integration booking reads cannot write."); },
    };
  }
  const testPrefix = env.INTEGRATION_TEST_STORE_PREFIX;
  const production = env.CONTEXT === "production";
  if ((!production && !/^nas-reminders-test-[a-z0-9-]+$/.test(testPrefix ?? "")) || (production && testPrefix)) throw new Error("Invalid booking integration storage context.");
  const { getStore } = await import("@netlify/blobs");
  return readOnlyBookingStore(blobBookingStore(getStore({ name: production ? "staff-portal" : testPrefix!, consistency: "strong" }), { allowCreate: false }));
}

export async function integrationStore(): Promise<SubmissionStore> {
  if (!(process.env.NETLIFY === "true" || process.env.NETLIFY_BLOBS_CONTEXT)) {
    // Local routes require an explicit local file; they never fall back to an operational portal file.
    const file = process.env.STAFF_PORTAL_FILE;
    if (!file) throw new Error("Integration test store is not configured.");
    const local = fileSubmissionStore(file);
    return { ...local, list: (async (kind: string) => {
      // Missing/corrupt local fixtures must fail like a production source failure.
      const data = JSON.parse(readFileSync(file, "utf8"));
      if (!data || typeof data !== "object" || (data[kind] !== undefined && !Array.isArray(data[kind]))) throw new Error("Invalid local integration source.");
      return data[kind] ?? [];
    }) as SubmissionStore["list"] };
  }
  const { getStore } = await import("@netlify/blobs");
  const testPrefix = process.env.INTEGRATION_TEST_STORE_PREFIX;
  const production = process.env.CONTEXT === "production";
  if (!production && !/^nas-reminders-test-[a-z0-9-]+$/.test(testPrefix ?? "")) {
    throw new Error("Preview integrations require an isolated test store.");
  }
  if (production && testPrefix) throw new Error("Production cannot use an integration test prefix.");
  const name = production ? "staff-portal" : testPrefix!;
  const blobs = getStore({ name, consistency: "strong" });
  const journal = getStore({ name: `${name}-journal`, consistency: "strong" });
  const base = journaledStore(netlifyBlobsSubmissionStore(blobs), journal);
  // Unlike the portal's display reader, a reminder snapshot must not silently omit
  // an unreadable/missing blob and then cancel a guest's pending reminder.
  return {
    ...base,
    list: (async (kind: string) => {
      const { blobs: entries } = await withRetry(() => blobs.list({ prefix: `${kind}/` }));
      return mapWithConcurrency(entries, 8, async entry => {
        const record = await withRetry(() => blobs.get(entry.key, { type: "json" }));
        if (!record || typeof record !== "object" || !("id" in record) || !("submittedAt" in record)) {
          throw new Error("Incomplete integration source.");
        }
        return record;
      });
    }) as SubmissionStore["list"],
  };
}
