import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { withRetry } from "./store";
import { checkSubmissionLimit, rememberAccepted, replaceEarlierSubmissions } from "./submission-limit";

// Owner (Oct 19, 2026): "we should not have any missing submissions ... this entire event is riding on me".
// Every form request is written, word for word, to its own append-only Blobs store (`submission-inbox`)
// the moment it arrives, BEFORE any validation runs. Until now a request the API refused (400: an unsigned
// waiver, a missing title, a cached older form) or that crashed was stored nowhere and logged nowhere, so
// the guest's details were simply gone. Now:
//   received/<endpoint>/<receivedAt>-<id>.json  every request body as sent (never updated or deleted)
//   failed/<endpoint>/<receivedAt>-<id>.json    the same body plus the status and error the guest saw,
//                                                for every request that was NOT saved (any non-2xx answer)
// The staff portal lists failed/ under "Needs attention" so the team can follow up, and the full backup
// (export kind=all) and the Mac ledger carry both. The inbox never blocks or slows a guest: if it cannot be
// written, the request is handled exactly as before and the problem is logged.
export const inboxStoreName = "submission-inbox";
export const inboxMaxBodyBytes = 60_000;

export type InboxEntry = {
  id: string;
  endpoint: string;
  receivedAt: string;
  origin: string;
  userAgent: string;
  body: string;
  // Best-effort contact details read from the body so staff can see who it was at a glance.
  name: string;
  email: string;
  phone: string;
  status?: number;
  error?: string;
  outcomeAt?: string;
  // Oct 20: "already-submitted" = refused as a second submission (the person already has a saved record).
  reason?: "already-submitted";
};

export interface InboxStore {
  set(key: string, value: InboxEntry): Promise<void>;
  list(prefix: string): Promise<InboxEntry[]>;
}

function fileInboxStore(file: string): InboxStore {
  const read = (): Record<string, InboxEntry> => { try { return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {}; } catch { return {}; } };
  return {
    async set(key, value) { const data = read(); data[key] = value; mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(data, null, 2)); },
    async list(prefix) { return Object.entries(read()).filter(([key]) => key.startsWith(prefix)).map(([, value]) => value); }
  };
}

let testInbox: InboxStore | null = null;
/** Tests replace the inbox with an in-memory one. */
export function setInboxForTests(store: InboxStore | null) { testInbox = store; }
export function memoryInboxStore(): InboxStore & { data: Map<string, InboxEntry> } {
  const data = new Map<string, InboxEntry>();
  return { data, async set(key, value) { data.set(key, value); }, async list(prefix) { return [...data.entries()].filter(([key]) => key.startsWith(prefix)).map(([, value]) => value); } };
}

// Like the submission store, the Blobs store is created for every request (a kept store's token expires).
export async function getInboxStore(): Promise<InboxStore> {
  if (testInbox) return testInbox;
  if (process.env.NETLIFY === "true" || process.env.NETLIFY_BLOBS_CONTEXT) {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: inboxStoreName, consistency: "strong" });
    return {
      async set(key, value) { await withRetry(() => store.setJSON(key, value)); },
      async list(prefix) {
        const { blobs } = await withRetry(() => store.list({ prefix }));
        const out: InboxEntry[] = [];
        for (const blob of blobs) { const value = await withRetry(() => store.get(blob.key, { type: "json" })) as InboxEntry | null; if (value) out.push(value); }
        return out;
      }
    };
  }
  return fileInboxStore(process.env.SUBMISSION_INBOX_FILE ?? join(process.cwd(), "work", "submission-inbox.json"));
}

const pick = (value: unknown, keys: string[]): string => {
  if (!value || typeof value !== "object") return "";
  for (const key of keys) { const found = (value as Record<string, unknown>)[key]; if (typeof found === "string" && found.trim()) return found.trim().slice(0, 254); }
  return "";
};
export function contactFromBody(body: string): { name: string; email: string; phone: string } {
  let parsed: unknown = null;
  try { parsed = JSON.parse(body); } catch { /* not JSON: keep the raw text only */ }
  const requester = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).requester : undefined;
  const firstBooking = parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).bookings)
    ? ((parsed as Record<string, unknown>).bookings as unknown[])[0] : undefined;
  return {
    name: pick(parsed, ["name", "nominatorName", "requesterName"]) || pick(requester, ["name"]) || pick(firstBooking, ["guestName"]),
    email: pick(parsed, ["email", "nominatorEmail", "requesterEmail"]) || pick(requester, ["email"]) || pick(firstBooking, ["email"]),
    phone: pick(parsed, ["phone", "nominatorPhone", "requesterPhone"]) || pick(requester, ["phone"])
  };
}

const keyFor = (folder: "received" | "failed", entry: InboxEntry) => `${folder}/${entry.endpoint}/${entry.receivedAt}-${entry.id}.json`;

/**
 * Wraps a form API's POST handler: the request body is stored before the handler runs, and any request that
 * is not answered with a 2xx is stored again under failed/ with the answer the guest saw.
 */
export function withSubmissionInbox(endpoint: string, handler: (request: Request) => Promise<Response>, options: {
  storeProvider?: () => Promise<InboxStore>;
  limitHandledByWorkflow?: () => boolean;
} = {}) {
  return async function POST(request: Request): Promise<Response> {
    let body = "";
    try { body = (await request.text()).slice(0, inboxMaxBodyBytes); } catch { body = ""; }
    const entry: InboxEntry = {
      id: randomUUID(), endpoint, receivedAt: new Date().toISOString(),
      origin: request.headers.get("origin") ?? "", userAgent: (request.headers.get("user-agent") ?? "").slice(0, 300),
      body, ...contactFromBody(body)
    };
    const inbox = await (options.storeProvider ?? getInboxStore)().catch(error => { console.error(`[submission-inbox] ${endpoint}: inbox unavailable`, error instanceof Error ? error.message : error); return null; });
    await inbox?.set(keyFor("received", entry), entry).catch(error => console.error(`[submission-inbox] ${endpoint}: could not store received copy`, error instanceof Error ? error.message : error));
    // The handler gets an identical, unread request (the original body was consumed above).
    const replay = new Request(request.url, { method: request.method, headers: request.headers, body });
    let response: Response;
    // Oct 20 (owner): one submission per person per form type, except the unlimited test submitters (submission-limit.ts).
    const workflowLimit = options.limitHandledByWorkflow?.() ?? false;
    const refused = workflowLimit ? null : await checkSubmissionLimit(endpoint, body, entry);
    if (refused) response = refused;
    else try { response = await handler(replay); }
    catch (error) {
      console.error(`[submission-inbox] ${endpoint}: handler crashed`, error instanceof Error ? error.message : error);
      response = Response.json({ ok: false, error: "We could not save your request. Please try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
    if (response.status < 300) {
      if (!workflowLimit) rememberAccepted(endpoint, body, entry);
      // Oct 20 (owner): a resubmitted RSVP replaces the guest's earlier one (no duplicates; nothing deleted).
      await replaceEarlierSubmissions(endpoint, entry.receivedAt, entry, body);
    }
    if (response.status >= 300) {
      let error = "";
      try { const answer = await response.clone().json() as { error?: unknown }; error = typeof answer?.error === "string" ? answer.error : ""; } catch { /* non-JSON answer */ }
      const failed: InboxEntry = { ...entry, status: response.status, error, outcomeAt: new Date().toISOString(), ...(refused ? { reason: "already-submitted" as const } : {}) };
      console.warn(`[submission-inbox] NOT SAVED ${endpoint} ${response.status} ${error} | ${entry.email || entry.name || "unknown sender"}`);
      await inbox?.set(keyFor("failed", failed), failed).catch(err => console.error(`[submission-inbox] ${endpoint}: could not store failed copy`, err instanceof Error ? err.message : err));
    }
    return response;
  };
}

export async function listFailedSubmissions(): Promise<InboxEntry[]> {
  const inbox = await getInboxStore();
  return (await inbox.list("failed/")).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}
export async function listReceivedSubmissions(): Promise<InboxEntry[]> {
  const inbox = await getInboxStore();
  return (await inbox.list("received/")).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

/** A failed request is resolved once the same email (or phone) has a saved record received after it. */
export function unresolvedFailures(failed: InboxEntry[], saved: { email?: string; phone?: string; submittedAt: string; requesterEmail?: string }[]): InboxEntry[] {
  const digits = (value?: string) => (value ?? "").replace(/\D/g, "").slice(-10);
  return failed.filter(entry => {
    const email = entry.email.toLowerCase(), phone = digits(entry.phone);
    // Oct 21 (Cherrial's guest "resubmitted but it didn't update"): a request refused as "already submitted" is a lost
    // update (the Oct 20 one-per-person rule turned four guests away). It stays here until a record for the same
    // person is saved AFTER the refusal (a staff replay or their own resubmission); their older record never resolves it.
    const refusedResubmission = entry.reason === "already-submitted";
    return !saved.some(record => {
      const sameEmail = Boolean(email) && [record.email, record.requesterEmail].some(value => (value ?? "").toLowerCase() === email);
      const samePhone = phone.length >= 7 && digits(record.phone) === phone;
      const later = refusedResubmission ? record.submittedAt > entry.receivedAt : record.submittedAt >= entry.receivedAt.slice(0, 10);
      return (sameEmail || samePhone) && later;
    });
  });
}
export const inboxCsvColumns = ["receivedAt", "endpoint", "status", "error", "name", "email", "phone", "origin", "body", "id"];
