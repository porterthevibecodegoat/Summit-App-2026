import { createHash } from "node:crypto";
import { type SubmissionStore, type TextPreferenceRecord } from "../staff/store";
import { buildWellnessAgenda } from "./agenda";
import { authenticated, integrationJson, limitedBody, PayloadError } from "./http";
import { smsPhone } from "./phone";
import { integrationStore } from "./store";
import { planReminders } from "./planner";
import { testActivities } from './test-activities';
import { bookingStatuses, type VersionedLedgerStore } from "../wellness-booking/ledger";
import { integrationBookingStore } from "./store";

type Dependencies = { store?: SubmissionStore; storeProvider?: () => Promise<SubmissionStore>; bookingStoreProvider?: () => Promise<VersionedLedgerStore | undefined>; env?: Partial<NodeJS.ProcessEnv>; now?: Date };
export async function agendaGet(request: Request, dependencies: Dependencies = {}) {
  const env = dependencies.env ?? process.env;
  if (!authenticated(request, env.INTEGRATION_FEED_TOKEN)) return integrationJson({ error: "Unauthorized." }, 401);
  try {
    const activities = testActivities(env);
    const bookingStore = await (dependencies.bookingStoreProvider ?? (() => integrationBookingStore(env)))();
    const snapshot = bookingStore ? await bookingStore.read() : undefined;
    if (bookingStore && !snapshot) throw new Error("Booking snapshot is not initialized.");
    const agenda = await buildWellnessAgenda(dependencies.store ?? await (dependencies.storeProvider ?? integrationStore)(), {
      activities, now: dependencies.now, bookingStatuses: snapshot ? bookingStatuses(snapshot.value) : undefined,
    });
    const previewJobs = planReminders(agenda, snapshot?.value);
    // Owner approval covers the complete process/build, including test SMS.
    // Reviews, merges, deployments and passing tests do not grant send approval.
    const sendApproved = env.INTEGRATION_SMS_SEND_APPROVED === "true";
    return integrationJson({ ...agenda, sendApproval: sendApproved ? "approved" : "pending", previewJobs, reminderJobs: sendApproved ? previewJobs : [] });
  } catch {
    // Never include partial recipients, raw errors, credentials, or contact details.
    return integrationJson({ error: "A complete reminder snapshot is unavailable. Hold sends and retry." }, 503);
  }
}

function eventTimestamp(value: string, now: Date) {
  let milliseconds: number;
  if (/^\d{10}(\.\d+)?$/.test(value)) milliseconds = Number(value) * 1000;
  else if (/^\d{13}$/.test(value)) milliseconds = Number(value);
  else if (/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)?$/.test(value)) {
    milliseconds = Date.parse(value.replace(" ", "T") + (/(Z|[+-]\d\d:\d\d)$/.test(value) ? "" : "Z"));
  } else throw new PayloadError(400, "Invalid event timestamp.");
  if (!Number.isFinite(milliseconds) || milliseconds < Date.UTC(2020, 0, 1) || milliseconds > now.getTime() + 5 * 60_000) throw new PayloadError(400, "Invalid event timestamp.");
  return new Date(milliseconds).toISOString();
}

export async function clicksendInboundPost(request: Request, dependencies: Dependencies = {}) {
  const env = dependencies.env ?? process.env;
  if (!authenticated(request, env.CLICKSEND_INBOUND_SECRET, true)) return integrationJson({ error: "Unauthorized." }, 401);
  const expectedTo = smsPhone(env.CLICKSEND_DEDICATED_NUMBER);
  if (!expectedTo || !env.CLICKSEND_EXPECTED_USER_ID) return integrationJson({ error: "Inbound integration is not configured." }, 503);
  try {
    const contentType = (request.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    if (contentType !== "application/json" && contentType !== "application/x-www-form-urlencoded") throw new PayloadError(415, "Unsupported encoding.");
    const raw = await limitedBody(request);
    let fields: Record<string, unknown>;
    try {
      const decoded = contentType === "application/json" ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
      if (!decoded || Array.isArray(decoded) || typeof decoded !== "object") throw new Error();
      fields = decoded;
    } catch { throw new PayloadError(400, "Invalid payload."); }
    const field = (key: string) => typeof fields[key] === "string" || typeof fields[key] === "number" ? String(fields[key]).trim() : "";
    if (field("user_id") !== env.CLICKSEND_EXPECTED_USER_ID || smsPhone(field("to")) !== expectedTo ||
        (env.CLICKSEND_EXPECTED_SUBACCOUNT_ID && field("subaccount_id") !== env.CLICKSEND_EXPECTED_SUBACCOUNT_ID)) throw new PayloadError(403, "Unexpected account or destination.");
    const body = field("body").normalize("NFKC").trim().toUpperCase();
    if (!["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(body)) return integrationJson({ ok: true, action: "ignored" });
    const phone = smsPhone(field("from"));
    // ClickSend's current URL callbacks use message_id for the incoming reply.
    // Keep the legacy alias for retries; never use original_message_id (outbound).
    const currentMessageId = field("message_id");
    const legacyMessageId = field("inboundmessage_id");
    if (currentMessageId && legacyMessageId && currentMessageId !== legacyMessageId) throw new PayloadError(400, "Conflicting inbound message IDs.");
    const messageId = currentMessageId || legacyMessageId;
    if (!phone || !/^[A-Za-z0-9_-]{1,160}$/.test(messageId)) throw new PayloadError(400, "Missing sender or inbound message ID.");
    const now = dependencies.now ?? new Date();
    const submittedAt = eventTimestamp(field("timestamp"), now);
    const id = `clicksend-stop-${createHash("sha256").update(`${field("user_id")}:${expectedTo}:${messageId}`).digest("hex")}`;
    const store = dependencies.store ?? await (dependencies.storeProvider ?? integrationStore)();
    const existing = (await store.list("textPreference")).find(p => p.id === id);
    if (existing) {
      if (existing.phone !== phone || existing.submittedAt !== submittedAt || existing.choice !== "no") throw new PayloadError(409, "Conflicting inbound event.");
      return integrationJson({ ok: true, action: "duplicate" });
    }
    const preference: TextPreferenceRecord & { receivedAt: string; providerEventId: string } = {
      id, submittedAt, receivedAt: now.toISOString(), providerEventId: messageId,
      source: "staff", name: "", email: "", phone, choice: "no", via: "stop-reply", note: "ClickSend inbound opt-out",
    };
    await store.add("textPreference", preference);
    return integrationJson({ ok: true, action: "opted-out" });
  } catch (error) {
    if (error instanceof PayloadError) return integrationJson({ error: error.message }, error.status);
    return integrationJson({ error: "Opt-out was not acknowledged. Retry this event." }, 503);
  }
}
