import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = findRepoRoot(process.cwd());
const envPath = resolve(rootDir, ".env");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}

const supabaseUrl = trimTrailingSlash(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const eventId = process.env.EVENT_ID ?? "not-alone-summit-2026-prototype";

if (!supabaseUrl || !serviceKey || !publishableKey) {
  console.error("Supabase URL, service-role key, and publishable key are required in .env.");
  process.exit(1);
}

const runId = randomUUID();
const password = `Rls-${randomUUID()}-Aa1!`;
const roles = ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"];
const users = new Map();
const cleanupPaths = [];
const checks = [];

try {
  const state = await serviceFetch(`/rest/v1/schedule_drafts?event_id=eq.${encodeURIComponent(eventId)}` +
    "&status=neq.ARCHIVED&select=id,working_snapshot&order=updated_at.desc&limit=1");
  assertCheck("staging contains an active schedule draft", state.ok && state.body.length === 1, state.status);

  for (const role of roles) {
    const identity = await createTemporaryStaff(role);
    users.set(role, identity);
  }

  const deviceId = randomUUID();
  const jobId = randomUUID();
  const proposalId = randomUUID();
  cleanupPaths.push(
    `/rest/v1/event_change_proposals?id=eq.${proposalId}`,
    `/rest/v1/notification_delivery_attempts?notification_job_id=eq.${jobId}`,
    `/rest/v1/notification_jobs?id=eq.${jobId}`,
    `/rest/v1/attendee_device_registrations?id=eq.${deviceId}`
  );

  await requireServiceWrite("seed temporary attendee device", "/rest/v1/attendee_device_registrations", [{
    id: deviceId,
    event_id: eventId,
    expo_push_token: `ExponentPushToken[rls_${runId.replaceAll("-", "")}]`,
    audience_groups: ["public"],
    platform: "ios",
    app_version: "rls-verification"
  }]);
  await requireServiceWrite("seed temporary notification job", "/rest/v1/notification_jobs", [{
    id: jobId,
    event_id: eventId,
    schedule_item_id: null,
    audience_scope: "public",
    send_after_utc: new Date(Date.now() + 86_400_000).toISOString(),
    status: "scheduled",
    idempotency_key: `rls-verification:${runId}`,
    source: "SYSTEM",
    payload: { verification: true }
  }]);

  const anonymousEvents = await publicFetch(`/rest/v1/events?id=eq.${encodeURIComponent(eventId)}&select=id`);
  assertCheck("anonymous attendees can read published event metadata", anonymousEvents.ok && anonymousEvents.body.length === 1, anonymousEvents.status);
  const anonymousDrafts = await publicFetch(`/rest/v1/schedule_drafts?event_id=eq.${encodeURIComponent(eventId)}&select=id`);
  assertCheck(
    "anonymous attendees cannot read schedule drafts",
    (anonymousDrafts.ok && anonymousDrafts.body.length === 0) || [401, 403].includes(anonymousDrafts.status),
    anonymousDrafts.status
  );

  const viewer = users.get("VIEWER");
  const viewerDrafts = await userFetch(viewer.accessToken, `/rest/v1/schedule_drafts?event_id=eq.${encodeURIComponent(eventId)}&select=id`);
  assertCheck("VIEWER can read schedule drafts", viewerDrafts.ok && viewerDrafts.body.length > 0, viewerDrafts.status);
  const viewerProposal = await userFetch(viewer.accessToken, "/rest/v1/event_change_proposals", {
    method: "POST",
    body: [proposalRow(proposalId, viewer.id)],
    prefer: "return=minimal"
  });
  assertCheck("VIEWER cannot create change proposals", !viewerProposal.ok, viewerProposal.status);

  const forbiddenRpc = await userFetch(viewer.accessToken, "/rest/v1/rpc/publish_event_snapshot_revision_v2", {
    method: "POST",
    body: {
      p_event_id: eventId,
      p_expected_previous_revision: 0,
      p_snapshot: {},
      p_source: "SYSTEM",
      p_changes_count: 0,
      p_notification_jobs: [],
      p_notify_attendees: false,
      p_actor_id: viewer.id,
      p_actor_role: "VIEWER",
      p_rollback_of_revision: null
    }
  });
  assertCheck("authenticated browser users cannot execute the privileged publish RPC", !forbiddenRpc.ok, forbiddenRpc.status);

  const editor = users.get("EDITOR");
  const editorProposal = await userFetch(editor.accessToken, "/rest/v1/event_change_proposals", {
    method: "POST",
    body: [proposalRow(proposalId, editor.id)],
    prefer: "return=minimal"
  });
  assertCheck("EDITOR can create a review-required change proposal", editorProposal.status === 201, editorProposal.status);
  const editorDevices = await userFetch(editor.accessToken,
    `/rest/v1/attendee_device_registrations?id=eq.${deviceId}&select=id`);
  assertCheck("EDITOR cannot read attendee device registrations", editorDevices.ok && editorDevices.body.length === 0, editorDevices.status);

  const publisher = users.get("PUBLISHER");
  const publisherDevices = await userFetch(publisher.accessToken,
    `/rest/v1/attendee_device_registrations?id=eq.${deviceId}&select=id`);
  assertCheck("PUBLISHER can read attendee device registrations", publisherDevices.ok && publisherDevices.body.length === 1, publisherDevices.status);
  const publisherJobUpdate = await userFetch(publisher.accessToken,
    `/rest/v1/notification_jobs?id=eq.${jobId}`, {
      method: "PATCH",
      body: { status: "canceled", updated_at: new Date().toISOString() },
      prefer: "return=minimal"
    });
  assertCheck("PUBLISHER can manage notification jobs", publisherJobUpdate.status === 204, publisherJobUpdate.status);

  const admin = users.get("ADMIN");
  const adminProfileUpdate = await userFetch(admin.accessToken,
    `/rest/v1/staff_profiles?user_id=eq.${viewer.id}`, {
      method: "PATCH",
      body: { display_name: "RLS verification viewer updated by admin", updated_at: new Date().toISOString() },
      prefer: "return=minimal"
    });
  assertCheck("ADMIN can manage staff profiles", adminProfileUpdate.status === 204, adminProfileUpdate.status);
} catch (error) {
  checks.push({ name: "verification run completed", passed: false, detail: safeError(error) });
} finally {
  for (const path of cleanupPaths) {
    await serviceFetch(path, { method: "DELETE", prefer: "return=minimal" }).catch(() => undefined);
  }
  for (const user of users.values()) {
    await serviceFetch(`/rest/v1/staff_profiles?user_id=eq.${user.id}`, {
      method: "DELETE",
      prefer: "return=minimal"
    }).catch(() => undefined);
    await authAdminFetch(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" }).catch(() => undefined);
  }
}

for (const check of checks) {
  console.log(`${check.passed ? "PASS" : "FAIL"} - ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
}

const failed = checks.filter((check) => !check.passed);
console.log(`\nRLS verification: ${failed.length === 0 ? "PASS" : "FAIL"} (${checks.length - failed.length}/${checks.length} checks)`);
if (failed.length > 0) process.exitCode = 1;

async function createTemporaryStaff(role) {
  const email = `not-alone-rls-${runId}-${role.toLowerCase()}@example.com`;
  const created = await authAdminFetch("/auth/v1/admin/users", {
    method: "POST",
    body: { email, password, email_confirm: true, user_metadata: { rlsVerification: true } }
  });
  if (!created.ok || !created.body?.id) {
    throw new Error(`Unable to create temporary ${role} identity (${created.status}).`);
  }

  const id = created.body.id;
  await requireServiceWrite(`create ${role} staff profile`, "/rest/v1/staff_profiles", [{
    user_id: id,
    display_name: `RLS verification ${role.toLowerCase()}`,
    role,
    emergency_broadcast_enabled: role === "ADMIN"
  }]);

  const signedIn = await publicFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password }
  });
  if (!signedIn.ok || !signedIn.body?.access_token) {
    throw new Error(`Unable to sign in temporary ${role} identity (${signedIn.status}).`);
  }
  return { id, accessToken: signedIn.body.access_token };
}

function proposalRow(id, createdBy) {
  return {
    id,
    event_id: eventId,
    draft_id: null,
    source: "MANUAL_EDITOR",
    command_text: "RLS verification proposal",
    operations: [],
    validation_messages: [],
    notification_impact: [],
    status: "DRAFT",
    requires_human_approval: true,
    created_by: createdBy
  };
}

async function requireServiceWrite(name, path, body) {
  const response = await serviceFetch(path, { method: "POST", body, prefer: "return=minimal" });
  assertCheck(name, response.status === 201, response.status);
  if (response.status !== 201) throw new Error(`${name} failed (${response.status}).`);
}

function assertCheck(name, passed, detail) {
  checks.push({ name, passed, detail: String(detail ?? "") });
}

function publicFetch(path, options = {}) {
  return request(path, { ...options, apiKey: publishableKey });
}

function userFetch(accessToken, path, options = {}) {
  return request(path, { ...options, apiKey: publishableKey, bearerToken: accessToken });
}

function serviceFetch(path, options = {}) {
  return request(path, { ...options, apiKey: serviceKey, bearerToken: serviceKey });
}

function authAdminFetch(path, options = {}) {
  return request(path, { ...options, apiKey: serviceKey, bearerToken: serviceKey });
}

async function request(path, options = {}) {
  const headers = { apikey: options.apiKey, Accept: "application/json" };
  if (options.bearerToken) headers.Authorization = `Bearer ${options.bearerToken}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.prefer) headers.Prefer = options.prefer;
  const response = await fetch(`${supabaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store"
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  return { ok: response.ok, status: response.status, body };
}

function trimTrailingSlash(value) {
  return value.trim().replace(/\/+$/, "");
}

function safeError(error) {
  return error instanceof Error ? error.message.replace(/(token|key|authorization)\s*[:=]\s*\S+/gi, "$1=[redacted]") : "Unknown error";
}

function findRepoRoot(startDir) {
  const candidates = [startDir, resolve(startDir, "../.."), resolve(startDir, "../../..")];
  return candidates.find((candidate) => existsSync(resolve(candidate, "pnpm-workspace.yaml"))) ?? startDir;
}
