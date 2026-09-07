import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { demoSnapshot } from "@not-alone/test-fixtures";
import {
  eventSnapshotSchema,
  type AttendeeDeviceRegistration,
  type ChangeSource,
  type EventSnapshot,
  type ScheduleItem
} from "@not-alone/validation";
import { getBlockingPublishMessages } from "./schedule-quality";

export type StaffDraftSession = {
  id: string;
  day: string;
  start: string;
  end: string;
  title: string;
  speaker: string;
  location: string;
  audience: string;
  status: "Draft" | "Ready" | "Needs review";
  reminders: string;
};

export type LiveOpsStore = {
  eventId: string;
  draftSessions: StaffDraftSession[];
  publishedSnapshot: EventSnapshot;
  revisionHistory: EventSnapshot[];
  revision: number;
  lastPublishedAt?: string;
  lastPublishedMessage?: string;
  attendeeDevices: AttendeeDeviceRegistration[];
  notificationJobs: Array<{
    id: string;
    scheduleItemId: string;
    audienceScope: string;
    sendAfterUtc: string;
    status: "scheduled" | "superseded";
    idempotencyKey: string;
  }>;
  activityLog: Array<{
    id: string;
    action: string;
    actorRole: string;
    detail: string;
    createdAt: string;
  }>;
};

const storePath = resolve(process.cwd(), "../../work/live-ops-store.json");

export class DraftPublishError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join(" "));
    this.name = "DraftPublishError";
  }
}

export async function readLiveOpsStore(): Promise<LiveOpsStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as LiveOpsStore;
    return {
      ...parsed,
      publishedSnapshot: eventSnapshotSchema.parse(parsed.publishedSnapshot),
      revisionHistory: (parsed.revisionHistory ?? []).map((snapshot) => eventSnapshotSchema.parse(snapshot)),
      attendeeDevices: parsed.attendeeDevices ?? [],
      notificationJobs: parsed.notificationJobs ?? [],
      activityLog: parsed.activityLog ?? []
    };
  } catch {
    const initialStore: LiveOpsStore = {
      eventId: demoSnapshot.event.id,
      draftSessions: createInitialDraftSessions(),
      publishedSnapshot: eventSnapshotSchema.parse({
        ...demoSnapshot,
        serverTimeUtc: new Date().toISOString()
      }),
      revisionHistory: [],
      revision: demoSnapshot.revision,
      attendeeDevices: [],
      notificationJobs: [],
      activityLog: []
    };
    await writeLiveOpsStore(initialStore);
    return initialStore;
  }
}

export async function writeLiveOpsStore(store: LiveOpsStore) {
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
}

export async function saveDraftSessions(sessions: StaffDraftSession[]) {
  const store = await readLiveOpsStore();
  const nextStore = {
    ...store,
    draftSessions: normalizeDraftSessions(sessions),
    activityLog: addActivity(store.activityLog, {
      action: "SAVE_DRAFT",
      actorRole: "ADMIN",
      detail: `${sessions.length} draft session(s) saved.`
    })
  };
  await writeLiveOpsStore(nextStore);
  return nextStore;
}

export async function publishDraftSessions(
  sessions: StaffDraftSession[],
  options: { source: ChangeSource; notifyAttendees: boolean }
) {
  const normalizedSessions = normalizeDraftSessions(sessions);
  const issues = validateDraftSessionsForPublish(normalizedSessions);
  if (issues.length > 0) {
    throw new DraftPublishError(issues);
  }

  const store = await readLiveOpsStore();
  const nowUtc = new Date().toISOString();
  const nextRevision = store.revision + 1;
  const publishedSnapshot = buildPublishedSnapshotFromDraftSessions(normalizedSessions, nextRevision, nowUtc);
  const notificationJobs = createNotificationJobs(publishedSnapshot);
  const nextStore: LiveOpsStore = {
    ...store,
    draftSessions: normalizedSessions,
    publishedSnapshot,
    revisionHistory: [store.publishedSnapshot, ...store.revisionHistory].slice(0, 10),
    revision: nextRevision,
    lastPublishedAt: nowUtc,
    lastPublishedMessage: options.notifyAttendees
      ? "Published revision and queued attendee notification reconciliation."
      : "Published revision silently. Attendee app snapshot is now available.",
    notificationJobs,
    activityLog: addActivity(store.activityLog, {
      action: "PUBLISH_REVISION",
      actorRole: "PUBLISHER",
      detail: `Revision ${nextRevision} published with ${publishedSnapshot.scheduleItems.length} session(s) and ${notificationJobs.length} reminder job(s).`
    })
  };

  await writeLiveOpsStore(nextStore);
  return nextStore;
}

export async function rollbackLastPublishedSnapshot(options: { notifyAttendees: boolean }) {
  const store = await readLiveOpsStore();
  const previousSnapshot = store.revisionHistory[0];

  if (!previousSnapshot) {
    throw new DraftPublishError(["No previous published revision is available to roll back to."]);
  }

  const nowUtc = new Date().toISOString();
  const nextRevision = store.revision + 1;
  const publishedSnapshot = eventSnapshotSchema.parse({
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
  const notificationJobs = createNotificationJobs(publishedSnapshot);
  const nextStore: LiveOpsStore = {
    ...store,
    draftSessions: publishedSnapshot.scheduleItems.map((item) => ({
      id: item.id,
      day: `Day ${item.dayOrder + 1}`,
      start: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: publishedSnapshot.event.timeZone
      }).format(new Date(item.startUtc)),
      end: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: publishedSnapshot.event.timeZone
      }).format(new Date(item.endUtc)),
      title: item.title,
      speaker: item.speakerIds.length > 0 ? `${item.speakerIds.length} linked speaker(s)` : "Unassigned",
      location: item.locationName,
      audience: item.visibilityScope.label,
      status: "Ready",
      reminders: `${item.notificationOffsetsMinutes.join("m, ")}m`
    })),
    publishedSnapshot,
    revisionHistory: [store.publishedSnapshot, ...store.revisionHistory.slice(1)].slice(0, 10),
    revision: nextRevision,
    lastPublishedAt: nowUtc,
    lastPublishedMessage: options.notifyAttendees
      ? `Rolled back by publishing revision ${nextRevision}; notification reconciliation was queued.`
      : `Rolled back by publishing revision ${nextRevision} without attendee push dispatch.`,
    notificationJobs,
    activityLog: addActivity(store.activityLog, {
      action: "ROLLBACK_REVISION",
      actorRole: "PUBLISHER",
      detail: `Revision ${nextRevision} restored the prior published schedule.`
    })
  };

  await writeLiveOpsStore(nextStore);
  return nextStore;
}

export function buildPublishedSnapshotFromDraftSessions(
  sessions: StaffDraftSession[],
  revision: number,
  nowUtc = new Date().toISOString()
) {
  const normalizedSessions = normalizeDraftSessions(sessions);
  return eventSnapshotSchema.parse({
    ...demoSnapshot,
    revision,
    serverTimeUtc: nowUtc,
    scheduleItems: normalizedSessions.map((session, index) => createScheduleItem(session, index, revision, nowUtc)),
    locations: createLocations(normalizedSessions)
  });
}

export async function registerAttendeeDevice(registration: AttendeeDeviceRegistration) {
  const store = await readLiveOpsStore();
  const attendeeDevices = [
    ...store.attendeeDevices.filter((device) => device.expoPushToken !== registration.expoPushToken),
    registration
  ];
  const nextStore = {
    ...store,
    attendeeDevices,
    activityLog: addActivity(store.activityLog, {
      action: "REGISTER_DEVICE",
      actorRole: "SYSTEM",
      detail: `${registration.platform} device registered for ${registration.audienceGroups.join(", ")}.`
    })
  };
  await writeLiveOpsStore(nextStore);
  return nextStore;
}

function createInitialDraftSessions(): StaffDraftSession[] {
  return [
    {
      id: "draft-wozniak-keynote",
      day: "Mon Nov 2",
      start: "3:00 PM",
      end: "4:00 PM",
      title: "Innovation, Humanity, and Not Being Alone",
      speaker: "Steve Wozniak",
      location: "Encore Theater",
      audience: "All attendees",
      status: "Draft",
      reminders: "30m, 10m"
    },
    {
      id: "draft-reset-lounge",
      day: "Mon Nov 2",
      start: "4:20 PM",
      end: "4:50 PM",
      title: "Guided Reset and Reflection",
      speaker: "Wellness Team",
      location: "Reflection Lounge",
      audience: "All attendees",
      status: "Needs review",
      reminders: "10m"
    },
    {
      id: "draft-founder-reception",
      day: "Mon Nov 2",
      start: "6:00 PM",
      end: "7:30 PM",
      title: "Founder Circle Reception",
      speaker: "Host Committee",
      location: "Terrace Salon",
      audience: "Founders only",
      status: "Draft",
      reminders: "30m"
    }
  ];
}

function createScheduleItem(session: StaffDraftSession, index: number, revision: number, nowUtc: string): ScheduleItem {
  const startUtc = localEventTimeToUtc(session.day, session.start);
  const endUtc = localEventTimeToUtc(session.day, session.end);
  const visibility = audienceToScope(session.audience);
  const title = session.title.trim();
  const speaker = session.speaker.trim() || "Unassigned";
  const location = session.location.trim();

  return {
    id: stableUuid(session.id),
    eventId: demoSnapshot.event.id,
    title,
    shortTitle: title.slice(0, 36),
    summary: `${speaker} at ${location}.`,
    description: "Published from the staff live-ops control room. Replace this with approved production copy.",
    startUtc,
    endUtc,
    eventTimeZone: demoSnapshot.event.timeZone,
    dayOrder: index,
    locationId: stableUuid(`location:${location}`),
    locationName: location,
    speakerIds: [stableUuid(`speaker:${speaker}`)],
    status: "scheduled",
    visibilityScope: visibility,
    eligibilityScope: visibility,
    notificationScope: visibility,
    notificationOffsetsMinutes: parseReminderOffsets(session.reminders),
    featured: index === 0,
    published: true,
    revision,
    updatedAt: nowUtc,
    publishedAt: nowUtc
  };
}

function createLocations(sessions: StaffDraftSession[]) {
  return [...new Set(sessions.map((session) => session.location.trim()).filter(Boolean))].map((locationName, index, locations) => ({
    id: stableUuid(`location:${locationName}`),
    eventId: demoSnapshot.event.id,
    name: locationName,
    description: "Published staff-controlled event location.",
    mapX: locations.length <= 1 ? 0.5 : 0.18 + (index / Math.max(locations.length - 1, 1)) * 0.64,
    mapY: 0.36 + (index % 3) * 0.18
  }));
}

export function createNotificationJobs(snapshot: EventSnapshot) {
  return snapshot.scheduleItems.flatMap((item) =>
    item.notificationOffsetsMinutes.map((offset) => ({
      id: stableUuid(`${item.id}:notification:${offset}:r${snapshot.revision}`),
      scheduleItemId: item.id,
      audienceScope: item.notificationScope.id,
      sendAfterUtc: new Date(new Date(item.startUtc).getTime() - offset * 60 * 1000).toISOString(),
      status: "scheduled" as const,
      idempotencyKey: `${item.id}:r${snapshot.revision}:offset-${offset}`
    }))
  );
}

function localEventTimeToUtc(day: string, time: string) {
  const match = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match?.[1] || !match?.[3]) {
    return "2026-11-02T20:00:00.000Z";
  }

  const hour12 = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3].toUpperCase();
  const hour24 = meridiem === "PM" && hour12 !== 12 ? hour12 + 12 : meridiem === "AM" && hour12 === 12 ? 0 : hour12;
  const dayOfMonth = parseEventDay(day);

  return new Date(Date.UTC(2026, 10, dayOfMonth, hour24 + 8, minute, 0)).toISOString();
}

function audienceToScope(audience: string) {
  const id = audience.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "all_attendees";
  return { id: id === "all_attendees" ? "public" : id, label: audience };
}

function parseReminderOffsets(value: string) {
  const offsets = value
    .split(",")
    .map((part) => Number(part.replace(/[^0-9]/g, "")))
    .filter((offset) => Number.isInteger(offset) && offset > 0);

  return offsets.length > 0 ? offsets : [10];
}

function stableUuid(input: string) {
  const hash = createHash("sha256").update(input).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function normalizeDraftSessions(sessions: StaffDraftSession[]): StaffDraftSession[] {
  return sessions.map((session, index) => ({
    id: session.id || stableUuid(`draft:${index}:${session.title}:${session.start}`),
    day: session.day.trim() || "Mon Nov 2",
    start: session.start.trim(),
    end: session.end.trim(),
    title: session.title.trim(),
    speaker: session.speaker.trim() || "Unassigned",
    location: session.location.trim(),
    audience: session.audience.trim() || "All attendees",
    status: session.status,
    reminders: session.reminders.trim() || "10m"
  }));
}

function validateDraftSessionsForPublish(sessions: StaffDraftSession[]) {
  return getBlockingPublishMessages(sessions);
}

function parseEventDay(day: string) {
  const match = day.match(/\b(?:Nov(?:ember)?\s*)?([2-4])\b/i);
  return match?.[1] ? Number(match[1]) : 2;
}

function addActivity(
  current: LiveOpsStore["activityLog"],
  entry: { action: string; actorRole: string; detail: string }
) {
  return [
    {
      id: stableUuid(`${entry.action}:${entry.detail}:${Date.now()}`),
      createdAt: new Date().toISOString(),
      ...entry
    },
    ...current
  ].slice(0, 100);
}
