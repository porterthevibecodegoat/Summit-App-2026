import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { getInboxStore, type InboxStore } from "../staff/submission-inbox";
import { fileSubmissionStore, journaledStore, mapWithConcurrency, netlifyBlobsSubmissionStore, withRetry, type SubmissionStore } from "../staff/store";
import { approvedCapacityRules, testCapacityRules } from "./capacity";
import { blobBookingStore } from "./blob-store";
import { ledgerSchema, type VersionedLedgerStore } from "./ledger";
import { createBookingWorkflow, privateIntakeSchema, type IntakeStore } from "./service";

type Env = Partial<NodeJS.ProcessEnv>;
const isolatedPrefix = /^nas-reminders-test-[a-z0-9-]+$/;
const isNetlify = (env: Env) => env.NETLIFY === "true" || Boolean(env.NETLIFY_BLOBS_CONTEXT);

function context(env: Env) {
  const test = env.WELLNESS_BOOKING_MODE === "test";
  if (!test && env.WELLNESS_BOOKING_MODE !== "live") throw new Error("Wellness booking mode is not configured.");
  if (test && env.CONTEXT === "production") throw new Error("The public production website cannot use test booking rules.");
  if (!test && (!isNetlify(env) || env.CONTEXT !== "production" || env.INTEGRATION_TEST_STORE_PREFIX)) throw new Error("Invalid live booking context.");
  if (test && !isolatedPrefix.test(env.INTEGRATION_TEST_STORE_PREFIX ?? "")) throw new Error("An isolated booking test prefix is required.");
  return { test, name: test ? env.INTEGRATION_TEST_STORE_PREFIX! : "staff-portal" };
}

function testDirectory(env: Env) {
  const directory = env.WELLNESS_BOOKING_TEST_DIRECTORY;
  if (!directory || !isolatedPrefix.test(basename(directory))) throw new Error("An explicit isolated booking test directory is required.");
  return directory;
}

// Explicit test files only. A short exclusive lock plus atomic rename prevents
// two localhost processes from overwriting one another during HTTP rehearsals.
export function fileBookingStore(path: string): VersionedLedgerStore {
  const raw = () => existsSync(path) ? readFileSync(path, "utf8") : null;
  const etag = (value: string) => createHash("sha256").update(value).digest("hex");
  return {
    async read() { const value = raw(); return value === null ? null : { value: ledgerSchema.parse(JSON.parse(value)), etag: etag(value) }; },
    async compareAndSet(expected, value) {
      mkdirSync(dirname(path), { recursive: true });
      const lock = `${path}.lock`;
      let handle: number;
      try { handle = openSync(lock, "wx", 0o600); } catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return false; throw error; }
      const temp = `${path}.${randomUUID()}.tmp`;
      try {
        const existing = raw();
        if (expected !== (existing === null ? null : etag(existing))) return false;
        writeFileSync(temp, JSON.stringify(ledgerSchema.parse(value)), { mode: 0o600 });
        renameSync(temp, path); return true;
      } finally { if (existsSync(temp)) unlinkSync(temp); closeSync(handle); unlinkSync(lock); }
    },
  };
}

function fileIntakeStore(directory: string): IntakeStore {
  return {
    async read(id) { const path = join(directory, `${id}.json`); return existsSync(path) ? privateIntakeSchema.parse(JSON.parse(readFileSync(path, "utf8"))) : null; },
    async createIfNew(value) {
      mkdirSync(directory, { recursive: true });
      try { writeFileSync(join(directory, `${value.id}.json`), JSON.stringify(privateIntakeSchema.parse(value)), { flag: "wx", mode: 0o600 }); return true; }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return false; throw error; }
    },
  };
}

export async function getWellnessWorkflow(env: Env = process.env) {
  if (env.WELLNESS_BOOKING_ENABLED !== "true") return undefined;
  const { test, name } = context(env);
  const secret = env.WELLNESS_MANAGEMENT_SECRET;
  if (!secret || secret.length < 32) throw new Error("Wellness management is not configured.");
  const rules = test ? testCapacityRules(env) : approvedCapacityRules();
  if (!isNetlify(env)) {
    const directory = testDirectory(env), sourcePath = join(directory, "source.json");
    const base = fileSubmissionStore(sourcePath);
    const validate = () => {
      if (existsSync(sourcePath)) { const existing = JSON.parse(readFileSync(sourcePath, "utf8")); if (!existing || !Array.isArray(existing.workshop)) throw new Error("Invalid local source fixture."); }
    };
    const source: SubmissionStore = { ...base, list: (async kind => { validate(); return base.list(kind as "workshop"); }) as SubmissionStore["list"], add: (async (kind, value) => {
      validate();
      await base.add(kind as "workshop", value as never);
    }) as SubmissionStore["add"] };
    return createBookingWorkflow({ ledger: fileBookingStore(join(directory, "ledger.json")), intakes: fileIntakeStore(join(directory, "intakes")), source, rules, managementSecret: secret });
  }
  const { getStore } = await import("@netlify/blobs");
  const blobs = getStore({ name, consistency: "strong" }), journal = getStore({ name: `${name}-journal`, consistency: "strong" });
  const intakes: IntakeStore = {
    async read(id) {
      const raw: unknown = await blobs.get(`wellness-intakes/${id}.json`, { type: "json", consistency: "strong" });
      if (!raw) return null;
      const value = privateIntakeSchema.parse(raw);
      // A retry repairs a missing journal copy before assigning any place.
      await journal.setJSON(`wellness-intakes/${id}.json`, value, { onlyIfNew: true });
      return value;
    },
    async createIfNew(value) {
      const result = await blobs.setJSON(`wellness-intakes/${value.id}.json`, value, { onlyIfNew: true });
      if (result.modified) await journal.setJSON(`wellness-intakes/${value.id}.json`, value, { onlyIfNew: true });
      return result.modified;
    },
  };
  const ledger = blobBookingStore(blobs, { allowCreate: test });
  if (!test) await ledger.read(); // Never accept live intake against an uninitialized migration.
  const base = journaledStore(netlifyBlobsSubmissionStore(blobs), journal);
  const source: SubmissionStore = { ...base, list: (async kind => {
    const { blobs: entries } = await withRetry(() => blobs.list({ prefix: `${kind}/` }));
    return mapWithConcurrency(entries, 8, async entry => {
      const value: unknown = await withRetry(() => blobs.get(entry.key, { type: "json", consistency: "strong" }));
      if (!value || typeof value !== "object" || !("id" in value) || !("submittedAt" in value)) throw new Error("A complete source snapshot is unavailable.");
      return value;
    });
  }) as SubmissionStore["list"] };
  return createBookingWorkflow({ ledger, intakes, source, rules, managementSecret: secret });
}

// Only the wellness wrapper opts in. Every other form keeps its existing inbox
// and limit behavior. Test previews cannot send fictional bodies to live inboxes.
export async function wellnessInboxStore(env: Env = process.env): Promise<InboxStore> {
  if (env.WELLNESS_BOOKING_ENABLED !== "true") return getInboxStore();
  const { test, name } = context(env);
  if (!test) return getInboxStore();
  if (isNetlify(env)) {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: `${name}-inbox`, consistency: "strong" });
    return { async set(key, value) { await store.setJSON(key, value); }, async list(prefix) { const { blobs } = await store.list({ prefix }); return Promise.all(blobs.map(async item => (await store.get(item.key, { type: "json" }))!)); } };
  }
  const path = join(testDirectory(env), "inbox.json");
  return {
    async set(key, value) { const data = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {}; data[key] = value; mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(data), { mode: 0o600 }); },
    async list(prefix) { const data = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {}; return Object.entries(data).filter(([key]) => key.startsWith(prefix)).map(([, value]) => value as never); },
  };
}
