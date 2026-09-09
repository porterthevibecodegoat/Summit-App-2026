import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { publicAppConfig } from "@not-alone/config";
import {
  attendeeDeviceRegistrationSchema,
  documentImportJobSchema,
  eventSnapshotSchema,
  type AttendeeDeviceRegistration,
  type ChangeSource,
  type DocumentImportJob,
  type EventSnapshot,
  type StaffRole
} from "@not-alone/validation";
import {
  buildPublishedSnapshotFromDraftSessions,
  createNotificationJobs,
  DraftPublishError,
  publishDraftSessions,
  readLiveOpsStore,
  recordDocumentImport,
  registerAttendeeDevice,
  rollbackLastPublishedSnapshot,
  saveDraftSessions,
  type LiveOpsStore,
  type StaffDraftSession
} from "./live-ops-store";
import { createPublishPreview } from "./publish-diff";
import { getBlockingPublishMessages } from "./schedule-quality";
import { canProvisionAdmin, createAdminProfile, type StaffAuthIdentity } from "./staff-access";
import { STAFF_ACCESS_COOKIE } from "./staff-session";

type NotificationJob = LiveOpsStore["notificationJobs"][number];

export type LiveOpsState = {
  mode: "local-adapter" | "supabase";
  eventId: string;
  revision: number;
  draftSessions: StaffDraftSession[];
  publishedSnapshot: EventSnapshot;
  lastPublishedAt?: string;
  lastPublishedMessage?: string;
  attendeeDevices: number;
  notificationJobs: NotificationJob[];
  notificationDelivery: {
    accepted: number;
    delivered: number;
    failed: number;
  };
  activityLog: LiveOpsStore["activityLog"];
  importJobs: DocumentImportJob[];
  adapterWarning?: string;
  degraded?: boolean;
};

export type StaffContext = {
  actorId?: string;
  role: StaffRole;
  mode: "local-adapter" | "supabase";
};

export class StaffAuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = "StaffAuthError";
  }
}

export function getLiveOpsMode() {
  return hasSupabaseServerConfig() ? "supabase" : "local-adapter";
}

export async function getLiveOpsState(): Promise<LiveOpsState> {
  if (hasSupabaseServerConfig()) {
    return readSupabaseState();
  }

  const store = await readLiveOpsStore();
  return withOptionalPublishMeta({
    mode: "local-adapter",
    eventId: store.eventId,
    revision: store.revision,
    draftSessions: store.draftSessions,
    publishedSnapshot: store.publishedSnapshot,
    attendeeDevices: store.attendeeDevices.length,
    notificationJobs: store.notificationJobs,
    notificationDelivery: { accepted: 0, delivered: 0, failed: 0 },
    activityLog: store.activityLog,
    importJobs: store.importJobs
  }, store.lastPublishedAt, store.lastPublishedMessage);
}

export async function getReadOnlyLiveOpsState(): Promise<LiveOpsState> {
  try {
    return await getLiveOpsState();
  } catch (error) {
    const store = await readLiveOpsStore();
    return withOptionalPublishMeta({
      mode: "local-adapter",
      eventId: store.eventId,
      revision: store.revision,
      draftSessions: store.draftSessions,
      publishedSnapshot: store.publishedSnapshot,
      attendeeDevices: store.attendeeDevices.length,
      notificationJobs: store.notificationJobs,
      notificationDelivery: { accepted: 0, delivered: 0, failed: 0 },
      activityLog: store.activityLog,
      importJobs: store.importJobs,
      adapterWarning: `Configured live backend is unavailable: ${redactOperationalError(error)}`,
      degraded: true
    }, store.lastPublishedAt, store.lastPublishedMessage);
  }
}

export async function saveDraft(sessions: StaffDraftSession[], staff: StaffContext) {
  requireRole(staff, ["EDITOR", "PUBLISHER", "ADMIN"]);

  if (hasSupabaseServerConfig()) {
    return saveSupabaseDraft(sessions, staff);
  }

  const store = await saveDraftSessions(sessions);
  return {
    mode: "local-adapter" as const,
    revision: store.revision,
    draftSessions: store.draftSessions,
    message: "Draft saved to the local live-ops adapter."
  };
}

export async function publishDraft(
  sessions: StaffDraftSession[],
  options: { source: ChangeSource; notifyAttendees: boolean; staff: StaffContext }
) {
  requireRole(options.staff, ["PUBLISHER", "ADMIN"]);

  if (hasSupabaseServerConfig()) {
    return publishSupabaseDraft(sessions, options);
  }

  const store = await publishDraftSessions(sessions, options);
  return {
    mode: "local-adapter" as const,
    revision: store.revision,
    publishedRevision: store.publishedSnapshot.revision,
    lastPublishedAt: store.lastPublishedAt,
    message: store.lastPublishedMessage,
    notificationJobsCount: store.notificationJobs.length,
    snapshotUrl: "/api/snapshot"
  };
}

export async function previewPublish(sessions: StaffDraftSession[], staff: StaffContext) {
  requireRole(staff, ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]);
  const state = await getLiveOpsState();
  return {
    mode: state.mode,
    ...createPublishPreview(state.publishedSnapshot, sessions)
  };
}

export async function rollbackPublishedRevision(options: { notifyAttendees: boolean; staff: StaffContext }) {
  requireRole(options.staff, ["PUBLISHER", "ADMIN"]);

  if (hasSupabaseServerConfig()) {
    return rollbackSupabaseRevision(options);
  }

  const store = await rollbackLastPublishedSnapshot({ notifyAttendees: options.notifyAttendees });
  return {
    mode: "local-adapter" as const,
    revision: store.revision,
    publishedRevision: store.publishedSnapshot.revision,
    lastPublishedAt: store.lastPublishedAt,
    message: store.lastPublishedMessage,
    notificationJobsCount: store.notificationJobs.length,
    snapshotUrl: "/api/snapshot"
  };
}

export async function registerDevice(registration: AttendeeDeviceRegistration) {
  if (hasSupabaseServerConfig()) {
    return registerSupabaseDevice(registration);
  }

  const store = await registerAttendeeDevice(registration);
  return {
    mode: "local-adapter" as const,
    attendeeDevices: store.attendeeDevices.length
  };
}

export async function recordScheduleImport(
  input: {
    id: string;
    fileName: string;
    fileType: DocumentImportJob["fileType"];
    detectedEventCount: number;
    requiresReviewCount: number;
    sessions: StaffDraftSession[];
  },
  staff: StaffContext
) {
  requireRole(staff, ["EDITOR", "PUBLISHER", "ADMIN"]);
  const nowUtc = new Date().toISOString();
  const job = documentImportJobSchema.parse({
    id: input.id,
    eventId: publicAppConfig.eventId,
    fileName: input.fileName,
    fileType: input.fileType,
    status: "READY_FOR_REVIEW",
    detectedEventCount: input.detectedEventCount,
    addedCount: input.detectedEventCount,
    modifiedCount: 0,
    removedCount: 0,
    requiresReviewCount: input.requiresReviewCount,
    createdAt: nowUtc
  });

  if (!hasSupabaseServerConfig()) {
    return recordDocumentImport(job);
  }

  await supabaseFetch("/rest/v1/document_import_jobs", {
    method: "POST",
    body: [{
      id: job.id,
      event_id: job.eventId,
      file_name: job.fileName,
      file_type: job.fileType,
      storage_path: `inline-extraction/${job.id}`,
      status: job.status,
      detected_event_count: job.detectedEventCount,
      added_count: job.addedCount,
      modified_count: job.modifiedCount,
      removed_count: job.removedCount,
      requires_review_count: job.requiresReviewCount,
      extracted_snapshot: { draftSessions: input.sessions },
      diff: { added: job.addedCount, modified: 0, removed: 0 },
      created_by: staff.actorId ?? null,
      created_at: nowUtc,
      updated_at: nowUtc
    }],
    expectedStatus: 201,
    prefer: "return=minimal"
  });

  return job;
}

export async function getStaffContext(request: NextRequest, allowedRoles: StaffRole[]): Promise<StaffContext> {
  if (!hasSupabaseServerConfig()) {
    const localRole = parseLocalRole();
    const context: StaffContext = { role: localRole, mode: "local-adapter" };
    requireRole(context, allowedRoles);
    return context;
  }

  const bearerToken = getBearerToken(request) ?? request.cookies.get(STAFF_ACCESS_COOKIE)?.value;
  if (!bearerToken) {
    throw new StaffAuthError(401, "Staff authentication is required.");
  }

  return authenticateStaffAccessToken(bearerToken, allowedRoles);
}

export async function authenticateStaffAccessToken(
  accessToken: string,
  allowedRoles: StaffRole[]
): Promise<StaffContext> {
  if (!hasSupabaseServerConfig()) {
    const localRole = parseLocalRole();
    const context: StaffContext = { role: localRole, mode: "local-adapter" };
    requireRole(context, allowedRoles);
    return context;
  }

  let user: StaffAuthIdentity;
  try {
    user = await supabaseFetch<StaffAuthIdentity>("/auth/v1/user", {
      bearerToken: accessToken,
      expectedStatus: 200
    });
  } catch {
    throw new StaffAuthError(401, "The staff session is invalid or expired.");
  }
  const profiles = await supabaseFetch<Array<{ user_id: string; role: StaffRole }>>(
    `/rest/v1/staff_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,role`,
    { expectedStatus: 200 }
  );
  const profile = profiles[0];

  if (!canProvisionAdmin(user, Boolean(profile))) {
    throw new StaffAuthError(403, "This account must be invited by staff before it can access the portal.");
  }

  if (profile?.role !== "ADMIN") {
    await supabaseFetch("/rest/v1/staff_profiles?on_conflict=user_id", {
      method: "POST",
      body: [createAdminProfile(user)],
      expectedStatus: 201,
      prefer: "resolution=merge-duplicates,return=minimal"
    });
  }

  const context: StaffContext = { actorId: user.id, role: "ADMIN", mode: "supabase" };
  requireRole(context, allowedRoles);
  return context;
}

export async function hasStaffPageAccess(allowedRoles: StaffRole[] = ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]) {
  if (!hasSupabaseServerConfig()) {
    return true;
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(STAFF_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return false;
  }

  try {
    await authenticateStaffAccessToken(accessToken, allowedRoles);
    return true;
  } catch {
    return false;
  }
}

function requireRole(context: StaffContext, allowedRoles: StaffRole[]) {
  if (!allowedRoles.includes(context.role)) {
    throw new StaffAuthError(403, `Role ${context.role} cannot perform this action.`);
  }
}

async function readSupabaseState(): Promise<LiveOpsState> {
  const [draftRows, revisionRows, deviceRows, notificationRows, auditRows, importRows, deliveryRows] = await Promise.all([
    supabaseFetch<Array<{ working_snapshot: unknown; updated_at: string }>>(
      `/rest/v1/schedule_drafts?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&select=working_snapshot,updated_at&order=updated_at.desc&limit=1`,
      { expectedStatus: 200 }
    ),
    supabaseFetch<Array<{ revision: number; snapshot: unknown; published_at: string }>>(
      `/rest/v1/schedule_revisions?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&select=revision,snapshot,published_at&order=revision.desc&limit=1`,
      { expectedStatus: 200 }
    ),
    supabaseFetch<Array<{ id: string }>>(
      `/rest/v1/attendee_device_registrations?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&select=id`,
      { expectedStatus: 200 }
    ),
    supabaseFetch<Array<{ id: string; schedule_item_id: string | null; audience_scope: string; send_after_utc: string; status: string; idempotency_key: string }>>(
      `/rest/v1/notification_jobs?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&select=id,schedule_item_id,audience_scope,send_after_utc,status,idempotency_key&order=send_after_utc.asc`,
      { expectedStatus: 200 }
    ),
    supabaseFetch<Array<{ id: string; action: string; actor_role: string; created_at: string; publication_revision: number | null }>>(
      `/rest/v1/production_audit_entries?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&select=id,action,actor_role,created_at,publication_revision&order=created_at.desc&limit=25`,
      { expectedStatus: 200 }
    ),
    supabaseFetch<Array<{
      id: string;
      event_id: string;
      file_name: string;
      file_type: DocumentImportJob["fileType"];
      status: DocumentImportJob["status"];
      detected_event_count: number;
      added_count: number;
      modified_count: number;
      removed_count: number;
      requires_review_count: number;
      created_at: string;
    }>>(
      `/rest/v1/document_import_jobs?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&select=id,event_id,file_name,file_type,status,detected_event_count,added_count,modified_count,removed_count,requires_review_count,created_at&order=created_at.desc&limit=25`,
      { expectedStatus: 200 }
    ),
    supabaseFetch<Array<{ status: "accepted" | "delivered" | "failed" }>>(
      `/rest/v1/notification_delivery_attempts?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&select=status`,
      { expectedStatus: 200 }
    )
  ]);

  const revisionRow = revisionRows[0];
  const snapshot = revisionRow ? eventSnapshotSchema.parse(revisionRow.snapshot) : eventSnapshotSchema.parse({ ...demoFallback(), serverTimeUtc: new Date().toISOString() });
  const draftSessions = parseDraftSessions(draftRows[0]?.working_snapshot, snapshot);
  const notificationJobs = notificationRows.map((job) => ({
    id: job.id,
    scheduleItemId: job.schedule_item_id ?? job.idempotency_key.split(":r")[0] ?? "unlinked",
    audienceScope: job.audience_scope,
    sendAfterUtc: job.send_after_utc,
    status: toNotificationJobStatus(job.status),
    idempotencyKey: job.idempotency_key
  }));

  return withOptionalPublishMeta({
    mode: "supabase",
    eventId: publicAppConfig.eventId,
    revision: snapshot.revision,
    draftSessions,
    publishedSnapshot: snapshot,
    attendeeDevices: deviceRows.length,
    notificationJobs,
    notificationDelivery: {
      accepted: deliveryRows.filter((row) => row.status === "accepted").length,
      delivered: deliveryRows.filter((row) => row.status === "delivered").length,
      failed: deliveryRows.filter((row) => row.status === "failed").length
    },
    activityLog: auditRows.map((row) => ({
      id: row.id,
      action: row.action,
      actorRole: row.actor_role,
      detail: row.publication_revision ? `Published revision ${row.publication_revision}.` : row.action,
      createdAt: row.created_at
    })),
    importJobs: importRows.map((row) => documentImportJobSchema.parse({
      id: row.id,
      eventId: row.event_id,
      fileName: row.file_name,
      fileType: row.file_type,
      status: row.status,
      detectedEventCount: row.detected_event_count,
      addedCount: row.added_count,
      modifiedCount: row.modified_count,
      removedCount: row.removed_count,
      requiresReviewCount: row.requires_review_count,
      createdAt: row.created_at
    }))
  }, revisionRow?.published_at, revisionRow ? "Latest published revision loaded from Supabase." : "No Supabase revision has been published yet.");
}

async function saveSupabaseDraft(sessions: StaffDraftSession[], staff: StaffContext) {
  const state = await readSupabaseState();
  const existingDrafts = await supabaseFetch<Array<{ id: string }>>(
    `/rest/v1/schedule_drafts?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&status=neq.ARCHIVED&select=id&order=updated_at.desc&limit=1`,
    { expectedStatus: 200 }
  );
  const body = {
    event_id: publicAppConfig.eventId,
    base_revision: state.publishedSnapshot.revision,
    title: "Staff schedule workbench draft",
    status: sessions.some((session) => session.status === "Needs review") ? "NEEDS_REVIEW" : "DRAFT",
    working_snapshot: { draftSessions: sessions },
    created_by: staff.actorId ?? null,
    updated_by: staff.actorId ?? null
  };

  if (existingDrafts[0]) {
    await supabaseFetch(`/rest/v1/schedule_drafts?id=eq.${existingDrafts[0].id}`, {
      method: "PATCH",
      body: {
        ...body,
        updated_at: new Date().toISOString()
      },
      expectedStatus: 204
    });
  } else {
    await supabaseFetch("/rest/v1/schedule_drafts", {
      method: "POST",
      body: [body],
      expectedStatus: 201
    });
  }

  return {
    mode: "supabase" as const,
    revision: state.publishedSnapshot.revision,
    draftSessions: sessions,
    message: "Draft saved to Supabase."
  };
}

async function publishSupabaseDraft(
  sessions: StaffDraftSession[],
  options: { source: ChangeSource; notifyAttendees: boolean; staff: StaffContext }
) {
  const issues = getBlockingPublishMessages(sessions);
  if (issues.length > 0) {
    throw new DraftPublishError(issues);
  }

  const state = await readSupabaseState();
  const nowUtc = new Date().toISOString();
  const nextRevision = state.publishedSnapshot.revision + 1;
  const snapshot = buildPublishedSnapshotFromDraftSessions(sessions, nextRevision, nowUtc);
  const notificationJobs = createNotificationJobs(snapshot);
  const preview = createPublishPreview(state.publishedSnapshot, sessions, nowUtc);
  const changesCount = preview.counts.added + preview.counts.changed + preview.counts.removed;

  const revision = await publishAtomicSupabaseRevision({
    expectedPreviousRevision: state.publishedSnapshot.revision,
    snapshot,
    source: options.source,
    changesCount,
    notificationJobs,
    notifyAttendees: options.notifyAttendees,
    staff: options.staff,
    rollbackOfRevision: null
  });

  return {
    mode: "supabase" as const,
    revision: revision.revision,
    publishedRevision: revision.revision,
    lastPublishedAt: revision.published_at,
    message: options.notifyAttendees
      ? "Published revision to Supabase and queued notification jobs for server dispatch."
      : "Published revision to Supabase without immediate attendee push dispatch.",
    notificationJobsCount: notificationJobs.length,
    snapshotUrl: "/api/snapshot"
  };
}

async function rollbackSupabaseRevision(options: { notifyAttendees: boolean; staff: StaffContext }) {
  const currentState = await readSupabaseState();
  const revisionRows = await supabaseFetch<Array<{ revision: number; snapshot: unknown; published_at: string }>>(
    `/rest/v1/schedule_revisions?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&select=revision,snapshot,published_at&order=revision.desc&limit=2`,
    { expectedStatus: 200 }
  );
  const previousRevisionRow = revisionRows.find((row) => row.revision < currentState.publishedSnapshot.revision);

  if (!previousRevisionRow) {
    throw new DraftPublishError(["No previous Supabase schedule revision is available to roll back to."]);
  }

  const nowUtc = new Date().toISOString();
  const nextRevision = currentState.publishedSnapshot.revision + 1;
  const previousSnapshot = eventSnapshotSchema.parse(previousRevisionRow.snapshot);
  const rollbackSnapshot = eventSnapshotSchema.parse({
    ...previousSnapshot,
    revision: nextRevision,
    serverTimeUtc: nowUtc,
    scheduleItems: previousSnapshot.scheduleItems.map((item) => ({
      ...item,
      revision: nextRevision,
      updatedAt: nowUtc,
      publishedAt: nowUtc
    }))
  });
  const notificationJobs = createNotificationJobs(rollbackSnapshot);
  const revision = await publishAtomicSupabaseRevision({
    expectedPreviousRevision: currentState.publishedSnapshot.revision,
    snapshot: rollbackSnapshot,
    source: "MANUAL_EDITOR",
    changesCount: rollbackSnapshot.scheduleItems.length,
    notificationJobs,
    notifyAttendees: options.notifyAttendees,
    staff: options.staff,
    rollbackOfRevision: currentState.publishedSnapshot.revision,
    extraJobPayload: {
      restoredRevision: previousRevisionRow.revision
    }
  });

  return {
    mode: "supabase" as const,
    revision: revision.revision,
    publishedRevision: revision.revision,
    lastPublishedAt: revision.published_at,
    message: `Rolled back by publishing revision ${revision.revision}, restoring revision ${previousRevisionRow.revision}.`,
    notificationJobsCount: notificationJobs.length,
    snapshotUrl: "/api/snapshot"
  };
}

async function publishAtomicSupabaseRevision(options: {
  expectedPreviousRevision: number;
  snapshot: EventSnapshot;
  source: ChangeSource;
  changesCount: number;
  notificationJobs: NotificationJob[];
  notifyAttendees: boolean;
  staff: StaffContext;
  rollbackOfRevision: number | null;
  extraJobPayload?: Record<string, unknown>;
}) {
  return supabaseFetch<{ revision: number; published_at: string }>(
    "/rest/v1/rpc/publish_event_snapshot_revision_v2",
    {
      method: "POST",
      body: {
        p_event_id: publicAppConfig.eventId,
        p_expected_previous_revision: options.expectedPreviousRevision,
        p_snapshot: options.snapshot,
        p_source: options.source,
        p_changes_count: options.changesCount,
        p_notification_jobs: options.notificationJobs.map((job) => ({
          id: job.id,
          schedule_item_id: job.scheduleItemId,
          audience_scope: job.audienceScope,
          send_after_utc: job.sendAfterUtc,
          idempotency_key: job.idempotencyKey,
          payload: options.extraJobPayload ?? {}
        })),
        p_notify_attendees: options.notifyAttendees,
        p_actor_id: options.staff.actorId ?? null,
        p_actor_role: options.staff.role,
        p_rollback_of_revision: options.rollbackOfRevision
      },
      expectedStatus: 200
    }
  );
}

async function registerSupabaseDevice(registration: AttendeeDeviceRegistration) {
  const parsed = attendeeDeviceRegistrationSchema.parse(registration);
  await supabaseFetch("/rest/v1/attendee_device_registrations", {
    method: "POST",
    body: [
      {
        id: parsed.id,
        event_id: parsed.eventId,
        attendee_id: parsed.attendeeId ?? null,
        expo_push_token: parsed.expoPushToken,
        audience_groups: parsed.audienceGroups,
        platform: parsed.platform,
        app_version: parsed.appVersion,
        last_seen_at: parsed.lastSeenAt
      }
    ],
    expectedStatus: 201,
    prefer: "resolution=merge-duplicates"
  });

  const state = await readSupabaseState();
  return {
    mode: "supabase" as const,
    attendeeDevices: state.attendeeDevices
  };
}

function parseDraftSessions(value: unknown, snapshot: EventSnapshot): StaffDraftSession[] {
  const candidate = value as { draftSessions?: StaffDraftSession[] } | undefined;
  if (Array.isArray(candidate?.draftSessions)) {
    return candidate.draftSessions;
  }

  return snapshot.scheduleItems.map((item) => ({
    id: item.id,
    day: `Day ${item.dayOrder + 1}`,
    start: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: snapshot.event.timeZone
    }).format(new Date(item.startUtc)),
    end: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: snapshot.event.timeZone
    }).format(new Date(item.endUtc)),
    title: item.title,
    speaker: item.speakerIds.length > 0 ? `${item.speakerIds.length} linked speaker(s)` : "Unassigned",
    location: item.locationName,
    audience: item.visibilityScope.label,
    status: item.published ? "Ready" : "Draft",
    reminders: `${item.notificationOffsetsMinutes.join("m, ")}m`
  }));
}

function toNotificationJobStatus(value: string): NotificationJob["status"] {
  return value === "processing" || value === "accepted" || value === "failed" ||
    value === "canceled" || value === "superseded"
    ? value
    : "scheduled";
}

async function supabaseFetch<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
    bearerToken?: string;
    expectedStatus: number;
    prefer?: string;
  }
): Promise<T> {
  const url = `${getSupabaseUrl()}${path}`;
  const headers: Record<string, string> = {
    apikey: getSupabaseServiceRoleKey(),
    Authorization: `Bearer ${options.bearerToken ?? getSupabaseServiceRoleKey()}`,
    "Content-Type": "application/json"
  };

  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    headers
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, requestInit);

  if (response.status !== options.expectedStatus) {
    throw new Error(`Supabase ${path} returned ${response.status}: ${await response.text()}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();
  return (responseText ? JSON.parse(responseText) : undefined) as T;
}

function hasSupabaseServerConfig() {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function parseLocalRole(): StaffRole {
  const candidate = process.env.LOCAL_STAFF_ROLE;
  return candidate === "VIEWER" || candidate === "EDITOR" || candidate === "PUBLISHER" || candidate === "ADMIN"
    ? candidate
    : "ADMIN";
}

function redactOperationalError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown backend error.";
  return message
    .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, "[redacted-key]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted-token]")
    .slice(0, 240);
}

function demoFallback() {
  return {
    event: {
      id: publicAppConfig.eventId,
      name: publicAppConfig.appName,
      organizationName: publicAppConfig.organizationName,
      timeZone: publicAppConfig.eventTimeZone,
      dateLabel: "November 2-4, 2026",
      venueName: "Wynn Las Vegas",
      city: "Las Vegas, Nevada",
      positioning: "A premier national convening advancing emotional and mental health.",
      presentedBy: "Inspiring Children Foundation",
      poweredBy: "Inspiring Children Foundation",
      tracks: [],
      featuredPeople: [],
      demo: true
    },
    revision: 1,
    serverTimeUtc: new Date().toISOString(),
    scheduleItems: [],
    locations: [],
    contentPages: []
  };
}

function withOptionalPublishMeta(
  state: Omit<LiveOpsState, "lastPublishedAt" | "lastPublishedMessage">,
  lastPublishedAt: string | undefined,
  lastPublishedMessage: string | undefined
): LiveOpsState {
  return {
    ...state,
    ...(lastPublishedAt ? { lastPublishedAt } : {}),
    ...(lastPublishedMessage ? { lastPublishedMessage } : {})
  };
}
