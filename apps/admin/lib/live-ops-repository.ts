import { NextRequest } from "next/server";
import { publicAppConfig } from "@not-alone/config";
import {
  attendeeDeviceRegistrationSchema,
  eventSnapshotSchema,
  type AttendeeDeviceRegistration,
  type ChangeSource,
  type EventSnapshot,
  type StaffRole
} from "@not-alone/validation";
import {
  buildPublishedSnapshotFromDraftSessions,
  createNotificationJobs,
  DraftPublishError,
  publishDraftSessions,
  readLiveOpsStore,
  registerAttendeeDevice,
  rollbackLastPublishedSnapshot,
  saveDraftSessions,
  type LiveOpsStore,
  type StaffDraftSession
} from "./live-ops-store";
import { createPublishPreview } from "./publish-diff";
import { getBlockingPublishMessages } from "./schedule-quality";

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
  activityLog: LiveOpsStore["activityLog"];
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
    activityLog: store.activityLog
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
      activityLog: store.activityLog,
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

export async function getStaffContext(request: NextRequest, allowedRoles: StaffRole[]): Promise<StaffContext> {
  if (!hasSupabaseServerConfig()) {
    const localRole = parseLocalRole();
    const context: StaffContext = { role: localRole, mode: "local-adapter" };
    requireRole(context, allowedRoles);
    return context;
  }

  const bearerToken = getBearerToken(request);
  if (!bearerToken) {
    throw new StaffAuthError(401, "Staff authentication is required.");
  }

  const user = await supabaseFetch<{ id: string }>("/auth/v1/user", {
    bearerToken,
    expectedStatus: 200
  });
  const profiles = await supabaseFetch<Array<{ user_id: string; role: StaffRole }>>(
    `/rest/v1/staff_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,role`,
    { expectedStatus: 200 }
  );
  const profile = profiles[0];

  if (!profile) {
    throw new StaffAuthError(403, "This account does not have a staff profile.");
  }

  const context: StaffContext = { actorId: profile.user_id, role: profile.role, mode: "supabase" };
  requireRole(context, allowedRoles);
  return context;
}

function requireRole(context: StaffContext, allowedRoles: StaffRole[]) {
  if (!allowedRoles.includes(context.role)) {
    throw new StaffAuthError(403, `Role ${context.role} cannot perform this action.`);
  }
}

async function readSupabaseState(): Promise<LiveOpsState> {
  const [draftRows, revisionRows, deviceRows, notificationRows, auditRows] = await Promise.all([
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
    supabaseFetch<Array<{ id: string; schedule_item_id: string; audience_scope: string; send_after_utc: string; status: string; idempotency_key: string }>>(
      `/rest/v1/notification_jobs?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&select=id,schedule_item_id,audience_scope,send_after_utc,status,idempotency_key&order=send_after_utc.asc`,
      { expectedStatus: 200 }
    ),
    supabaseFetch<Array<{ id: string; action: string; actor_role: string; created_at: string; publication_revision: number | null }>>(
      `/rest/v1/production_audit_entries?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&select=id,action,actor_role,created_at,publication_revision&order=created_at.desc&limit=25`,
      { expectedStatus: 200 }
    )
  ]);

  const revisionRow = revisionRows[0];
  const snapshot = revisionRow ? eventSnapshotSchema.parse(revisionRow.snapshot) : eventSnapshotSchema.parse({ ...demoFallback(), serverTimeUtc: new Date().toISOString() });
  const draftSessions = parseDraftSessions(draftRows[0]?.working_snapshot, snapshot);
  const notificationJobs = notificationRows.map((job) => ({
    id: job.id,
    scheduleItemId: job.schedule_item_id,
    audienceScope: job.audience_scope,
    sendAfterUtc: job.send_after_utc,
    status: job.status === "superseded" ? "superseded" as const : "scheduled" as const,
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
    activityLog: auditRows.map((row) => ({
      id: row.id,
      action: row.action,
      actorRole: row.actor_role,
      detail: row.publication_revision ? `Published revision ${row.publication_revision}.` : row.action,
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

  const revision = await supabaseFetch<{ revision: number; published_at: string }>(
    "/rest/v1/rpc/publish_event_snapshot_revision",
    {
      method: "POST",
      body: {
        p_event_id: publicAppConfig.eventId,
        p_expected_previous_revision: state.publishedSnapshot.revision,
        p_snapshot: snapshot,
        p_source: options.source,
        p_changes_count: changesCount,
        p_notification_jobs_updated: notificationJobs.length
      },
      expectedStatus: 200
    }
  );

  if (notificationJobs.length > 0) {
    await supabaseFetch("/rest/v1/notification_jobs", {
      method: "POST",
      body: notificationJobs.map((job) => ({
        id: job.id,
        event_id: publicAppConfig.eventId,
        schedule_item_id: job.scheduleItemId,
        schedule_revision: revision.revision,
        audience_scope: job.audienceScope,
        send_after_utc: job.sendAfterUtc,
        status: "scheduled",
        idempotency_key: job.idempotencyKey,
        source: options.source,
        payload: {
          revision: revision.revision,
          notifyAttendees: options.notifyAttendees
        }
      })),
      expectedStatus: 201,
      prefer: "resolution=ignore-duplicates"
    });
  }

  await supabaseFetch(
    `/rest/v1/schedule_drafts?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&status=neq.ARCHIVED`,
    {
      method: "PATCH",
      body: {
        status: "PUBLISHED",
        updated_by: options.staff.actorId ?? null,
        updated_at: nowUtc
      },
      expectedStatus: 204
    }
  );

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
  const revision = await supabaseFetch<{ revision: number; published_at: string }>(
    "/rest/v1/rpc/publish_event_snapshot_revision",
    {
      method: "POST",
      body: {
        p_event_id: publicAppConfig.eventId,
        p_expected_previous_revision: currentState.publishedSnapshot.revision,
        p_snapshot: rollbackSnapshot,
        p_source: "MANUAL_EDITOR",
        p_changes_count: rollbackSnapshot.scheduleItems.length,
        p_notification_jobs_updated: notificationJobs.length
      },
      expectedStatus: 200
    }
  );

  if (notificationJobs.length > 0) {
    await supabaseFetch("/rest/v1/notification_jobs", {
      method: "POST",
      body: notificationJobs.map((job) => ({
        id: job.id,
        event_id: publicAppConfig.eventId,
        schedule_item_id: job.scheduleItemId,
        schedule_revision: revision.revision,
        audience_scope: job.audienceScope,
        send_after_utc: job.sendAfterUtc,
        status: "scheduled",
        idempotency_key: job.idempotencyKey,
        source: "MANUAL_EDITOR",
        payload: {
          revision: revision.revision,
          rollbackOfRevision: currentState.publishedSnapshot.revision,
          restoredRevision: previousRevisionRow.revision,
          notifyAttendees: options.notifyAttendees
        }
      })),
      expectedStatus: 201,
      prefer: "resolution=ignore-duplicates"
    });
  }

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

  return response.json() as Promise<T>;
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
