import { getStore } from "@netlify/blobs";
import { mapWithConcurrency, withRetry, type AnySubmission, type SubmissionKind, type SubmissionStore, type TextPreferenceRecord } from "../staff/store";
import { approvedCapacityRules, testCapacityRules } from "../wellness-booking/capacity";
import { blobBookingStore, readOnlyBookingStore } from "../wellness-booking/blob-store";

export const summitSourceSiteId = "dca09595-b5fa-4210-9d36-010bccfb903c";
const readableKinds = new Set(["workshop", "textPreference", "programApproval"]);

// A separate Netlify project can use the existing site's store through the
// documented siteID + token SDK options. This does not redeploy the website.
function sourceConnection(env: Partial<NodeJS.ProcessEnv>) {
  if (env.SOURCE_NETLIFY_SITE_ID !== summitSourceSiteId || !env.SOURCE_NETLIFY_TOKEN) throw new Error("Source connection is not configured.");
  const mode = env.REMINDER_SOURCE_MODE ?? "test";
  if (mode !== "test" && mode !== "live") throw new Error("Invalid source mode.");
  if (mode === "live" && env.INTEGRATION_TEST_STORE_PREFIX) throw new Error("Live source cannot use a test prefix.");
  const name = mode === "live" ? "staff-portal" : env.INTEGRATION_TEST_STORE_PREFIX;
  if (mode === "test" && !/^nas-reminders-test-[a-z0-9-]+$/.test(name ?? "")) throw new Error("An isolated test store is required.");
  const options = { siteID: summitSourceSiteId, token: env.SOURCE_NETLIFY_TOKEN, region: "us-east-2" as const, consistency: "strong" as const };
  return { name: name!, options, mode };
}

export async function sourceBookingStore(env: Partial<NodeJS.ProcessEnv> = process.env) {
  if (env.WELLNESS_BOOKING_ENABLED !== "true") return undefined;
  if (env.WELLNESS_BOOKING_MODE === "test") {
    if (env.REMINDER_SOURCE_MODE !== "test") throw new Error("Test booking rules require an isolated test source.");
    testCapacityRules(env);
  } else approvedCapacityRules();
  const { name, options } = sourceConnection(env);
  return readOnlyBookingStore(blobBookingStore(getStore({ ...options, name }), { allowCreate: false }));
}

export async function sourceSubmissionStore(env: Partial<NodeJS.ProcessEnv> = process.env): Promise<SubmissionStore> {
  const { name, options, mode } = sourceConnection(env);
  // Keep clients request-scoped, including their short-lived runtime context.
  const blobs = getStore({ ...options, name: name! });
  const journal = getStore({ ...options, name: `${name}-journal` });
  return {
    list: (async (kind: SubmissionKind) => {
      if (!readableKinds.has(kind)) throw new Error("This integration cannot read that record kind.");
      const { blobs: entries } = await withRetry(() => blobs.list({ prefix: `${kind}/` }));
      return mapWithConcurrency(entries, 8, async entry => {
        const row: unknown = await withRetry(() => blobs.get(entry.key, { type: "json" }));
        if (!row || typeof row !== "object" || !("id" in row) || !("submittedAt" in row)) throw new Error("Incomplete source data.");
        return row;
      });
    }) as SubmissionStore["list"],
    add: (async (kind: SubmissionKind, value: AnySubmission) => {
      const record = value as TextPreferenceRecord;
      if (kind !== "textPreference" || record.choice !== "no" || record.via !== "stop-reply" || !record.id.startsWith("clicksend-stop-")) throw new Error("Only inbound opt-out writes are supported.");
      if (mode === "live" && env.REMINDER_SOURCE_WRITES_ENABLED !== "true") throw new Error("Live opt-out writes have not been enabled.");
      const key = `${record.submittedAt}-${record.id}`;
      // A failed journal or primary save is retryable and never acknowledged as saved.
      await withRetry(() => journal.setJSON(`${kind}/${key}/${new Date().toISOString()}.json`, record));
      await withRetry(() => blobs.setJSON(`${kind}/${key}.json`, record));
    }) as SubmissionStore["add"],
    async delete() { throw new Error("This integration cannot delete source data."); },
  };
}
