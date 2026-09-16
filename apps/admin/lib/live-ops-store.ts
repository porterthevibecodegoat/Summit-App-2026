import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { originalProducerCredit } from "@not-alone/config";
import { event2026Snapshot as demoSnapshot } from "@not-alone/test-fixtures/event-2026";
import {
  fromEventLocalTime,
  isLocationPlaceholderCopy,
  isSchedulePlaceholderCopy,
  sanitizePublishedSnapshotContent
} from "@not-alone/domain";
import {
  eventSnapshotSchema,
  directoryCategorySchema,
  type AttendeeDeviceRegistration,
  type ChangeSource,
  type DocumentImportJob,
  type EventSnapshot,
  type ScheduleItem
} from "@not-alone/validation";
import { getBlockingPublishMessages } from "./schedule-quality";

export const staffDraftSessionSchema = z.object({
  id: z.string().trim().min(1).max(200),
  day: z.string().trim().max(100),
  start: z.string().trim().max(40),
  end: z.string().trim().max(40),
  title: z.string().trim().max(300),
  speaker: z.string().trim().max(300),
  location: z.string().trim().max(300),
  audience: z.string().trim().max(100),
  status: z.enum(["Draft", "Ready", "Needs review"]),
  reminders: z.string().trim().max(200)
}).strict();

export const staffDraftSessionsSchema = z.array(staffDraftSessionSchema).max(1000);

export const staffContentSchema = z.object({
  event: z.object({
    name: z.string().trim().min(1).max(120),
    organizationName: z.string().trim().min(1).max(160),
    dateLabel: z.string().trim().min(1).max(120),
    venueName: z.string().trim().min(1).max(160),
    city: z.string().trim().min(1).max(160),
    positioning: z.string().trim().min(1).max(600),
    presentedBy: z.string().trim().min(1).max(160),
    poweredBy: z.string().trim().min(1).max(160),
    tracks: z.array(z.string().trim().min(1).max(80)).max(30),
    featuredPeople: z.array(z.object({
      name: z.string().trim().min(1).max(160),
      role: z.string().trim().min(1).max(200),
      group: z.string().trim().min(1).max(120)
    })).max(100),
    demo: z.boolean(),
    directoryEnabled: z.boolean().optional()
  }),
  speakers: z.array(z.object({
    id: z.string().uuid(),
    eventId: z.string().min(1),
    name: z.string().trim().min(1).max(160),
    role: z.string().trim().min(1).max(200),
    bio: z.string().trim().max(2000),
    headshotUrl: z.string().url().nullable(),
    published: z.boolean(),
    directoryCategories: z.array(directoryCategorySchema).max(12).optional(),
    roleSource: z.string().trim().max(1000).optional()
  })).max(250),
  faqs: z.array(z.object({
    id: z.string().uuid(),
    question: z.string().trim().min(1).max(300),
    answer: z.string().trim().min(1).max(3000),
    category: z.string().trim().min(1).max(100),
    published: z.boolean()
  })).max(250),
  sponsors: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    tier: z.string().trim().min(1).max(100),
    websiteUrl: z.string().url().nullable(),
    logoUrl: z.string().url().nullable(),
    published: z.boolean()
  })).max(250),
  media: z.array(z.object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    type: z.enum(["image", "video", "link"]),
    url: z.string().url(),
    altText: z.string().trim().max(500),
    published: z.boolean()
  })).max(500),
  notices: z.array(z.object({
    id: z.string().uuid(),
    eventId: z.string().min(1),
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(1200),
    severity: z.enum(["info", "change", "urgent"]),
    startsAtUtc: z.string().datetime(),
    endsAtUtc: z.string().datetime().nullable(),
    published: z.boolean()
  })).max(100),
  contentPages: z.array(z.object({
    id: z.string().uuid(),
    slug: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(10000),
    published: z.boolean(),
    revision: z.number().int().positive()
  })).max(250)
}).strict().superRefine((content, ctx) => {
  content.speakers.forEach((person, index) => {
    const credit = originalProducerCredit(person.name);
    if (person.directoryCategories?.some(category => (category === "Producers" || category === "Executive Producers") && category !== credit?.category) || (/producer/i.test(person.role) && !credit)) {
      ctx.addIssue({ code: "custom", path: ["speakers", index, "directoryCategories"], message: `${person.name} does not have this producer credit on the approved original site.` });
    }
    if (content.event.directoryEnabled && person.published && person.directoryCategories?.some(category => category !== "Attendees") && !person.roleSource?.trim()) {
      ctx.addIssue({ code: "custom", path: ["speakers", index, "roleSource"], message: `Record the approved role source for ${person.name}; attendance confirmation alone is not role approval.` });
    }
  });
  const slugs = content.contentPages.map(page => page.slug);
  if (new Set(slugs).size !== slugs.length) ctx.addIssue({ code: "custom", path: ["contentPages"], message: "Content page slugs must be unique." });
});

export type StaffDraftSession = z.infer<typeof staffDraftSessionSchema>;
export type StaffContent = z.infer<typeof staffContentSchema>;

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
    status: "scheduled" | "processing" | "accepted" | "failed" | "canceled" | "superseded";
    idempotencyKey: string;
  }>;
  activityLog: Array<{
    id: string;
    action: string;
    actorRole: string;
    detail: string;
    createdAt: string;
  }>;
  importJobs: DocumentImportJob[];
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
      publishedSnapshot: hydrateSnapshotContent(parsed.publishedSnapshot),
      revisionHistory: (parsed.revisionHistory ?? []).map((snapshot) => hydrateSnapshotContent(snapshot)),
      attendeeDevices: parsed.attendeeDevices ?? [],
      notificationJobs: parsed.notificationJobs ?? [],
      activityLog: parsed.activityLog ?? [],
      importJobs: parsed.importJobs ?? []
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
      activityLog: [],
      importJobs: []
    };
    await writeLiveOpsStore(initialStore);
    return initialStore;
  }
}

export function hydrateSnapshotContent(value: unknown): EventSnapshot {
  const source = value as Partial<EventSnapshot> | undefined;
  const parsed = eventSnapshotSchema.parse(value);
  const sanitized = sanitizePublishedSnapshotContent(parsed, demoSnapshot);

  return eventSnapshotSchema.parse({
    ...sanitized,
    speakers: Array.isArray(source?.speakers) ? parsed.speakers : demoSnapshot.speakers,
    faqs: Array.isArray(source?.faqs) ? parsed.faqs : demoSnapshot.faqs,
    sponsors: Array.isArray(source?.sponsors) ? parsed.sponsors : demoSnapshot.sponsors,
    media: Array.isArray(source?.media) ? parsed.media : demoSnapshot.media,
    notices: Array.isArray(source?.notices) ? parsed.notices : demoSnapshot.notices,
    contentPages: parsed.contentPages.map((page) =>
      page.slug === "prototype-schedule-note" ? { ...page, slug: "schedule-note" } : page
    )
  });
}

function scheduleIdentity(item: Pick<ScheduleItem, "startUtc" | "eventTimeZone" | "title">) {
  return `${eventDateKey(item.startUtc, item.eventTimeZone)}:${normalizeText(item.title)}`;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isSchedulePlaceholder(value: string) {
  return isSchedulePlaceholderCopy(value);
}

function isLocationPlaceholder(value: string) {
  return isLocationPlaceholderCopy(value);
}

function createLocationDescription(name: string) {
  const normalized = normalizeText(name);

  if (normalized.includes("la tache")) return "Arrival and hospitality area for awards programming.";
  if (normalized.includes("registration")) return "Guest check-in, credential support, schedule help, and wayfinding.";
  if (normalized.includes("margaux") || normalized.includes("wisdom forum")) return "Main room for summit programming, panels, performances, and award moments.";
  if (normalized.includes("lafleur")) return "Movement, mindfulness, meditation, and reset programming.";
  if (normalized.includes("pomerol")) return "Fitness, recreation, and community wellness programming.";
  if (normalized.includes("mouton 1")) return "Attendee gifting, speaker hospitality, and event support.";
  if (normalized.includes("mouton")) return "Meals, workshops, and quieter conversation spaces.";
  if (normalized.includes("outside sw")) return "Arrival point for designated gatherings at SW Steakhouse.";
  if (normalized.includes("sw steakhouse")) return "Hosted dining location for designated summit gatherings.";
  if (normalized.includes("boa")) return "Closing dinner and music programming location.";
  return "Event room used by the published schedule.";
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
  const publishedSnapshot = buildPublishedSnapshotFromDraftSessions(normalizedSessions, nextRevision, nowUtc, store.publishedSnapshot);
  const notificationJobs = createNotificationJobsForPublish(publishedSnapshot, options.notifyAttendees);
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
  const notificationJobs = createNotificationJobsForPublish(publishedSnapshot, options.notifyAttendees);
  const nextStore: LiveOpsStore = {
    ...store,
    draftSessions: publishedSnapshot.scheduleItems.map((item) => ({
      id: item.id,
      day: formatDraftDay(item.startUtc, publishedSnapshot.event.timeZone),
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
      speaker: item.speakerIds.map((id) => publishedSnapshot.speakers.find((speaker) => speaker.id === id)?.name).filter(Boolean).join(", ") || "Unassigned",
      location: item.locationName,
      audience: item.visibilityScope.label,
      status: "Ready",
      reminders: item.notificationOffsetsMinutes.map(offset => `${offset}m`).join(", ")
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
  nowUtc = new Date().toISOString(),
  baseSnapshot: EventSnapshot = demoSnapshot
) {
  const normalizedSessions = normalizeDraftSessions(sessions);
  const eventDays = [...new Set(normalizedSessions.map((session) =>
    eventDateKey(localEventTimeToUtc(session.day, session.start, baseSnapshot.event.timeZone), baseSnapshot.event.timeZone)
  ))].sort();
  return eventSnapshotSchema.parse({
    ...baseSnapshot,
    revision,
    serverTimeUtc: nowUtc,
    scheduleItems: normalizedSessions.map((session, index) => {
      const startUtc = localEventTimeToUtc(session.day, session.start, baseSnapshot.event.timeZone);
      const dayOrder = eventDays.indexOf(eventDateKey(startUtc, baseSnapshot.event.timeZone));
      return createScheduleItem(session, index, Math.max(dayOrder, 0), revision, nowUtc, baseSnapshot);
    }),
    locations: createLocations(normalizedSessions, baseSnapshot)
  });
}

export async function publishContent(content: StaffContent) {
  const parsed = staffContentSchema.parse(content);
  const store = await readLiveOpsStore();
  const nowUtc = new Date().toISOString();
  const nextRevision = store.revision + 1;
  const publishedSnapshot = eventSnapshotSchema.parse({
    ...store.publishedSnapshot,
    event: { ...store.publishedSnapshot.event, ...parsed.event },
    speakers: parsed.speakers,
    faqs: parsed.faqs,
    sponsors: parsed.sponsors,
    media: parsed.media,
    notices: parsed.notices,
    contentPages: parsed.contentPages.map((page) => ({ ...page, revision: nextRevision })),
    revision: nextRevision,
    serverTimeUtc: nowUtc
  });
  const nextStore: LiveOpsStore = {
    ...store,
    publishedSnapshot,
    revisionHistory: [store.publishedSnapshot, ...store.revisionHistory].slice(0, 10),
    revision: nextRevision,
    lastPublishedAt: nowUtc,
    lastPublishedMessage: "Published attendee content. Schedule and notification jobs were preserved.",
    activityLog: addActivity(store.activityLog, {
      action: "PUBLISH_CONTENT",
      actorRole: "ADMIN",
      detail: `Revision ${nextRevision} published event information, ${parsed.speakers.length} speaker(s), ${parsed.faqs.length} FAQ(s), ${parsed.sponsors.length} sponsor(s), ${parsed.media.length} media item(s), and ${parsed.notices.length} live notice(s).`
    })
  };
  await writeLiveOpsStore(nextStore);
  return nextStore;
}

export function createNotificationJobsForPublish(snapshot: EventSnapshot, notifyAttendees: boolean) {
  return notifyAttendees ? createNotificationJobs(snapshot) : [];
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

export async function recordDocumentImport(job: DocumentImportJob) {
  const store = await readLiveOpsStore();
  const nextStore: LiveOpsStore = {
    ...store,
    importJobs: [job, ...store.importJobs].slice(0, 50),
    activityLog: addActivity(store.activityLog, {
      action: "IMPORT_SCHEDULE_DOCUMENT",
      actorRole: "EDITOR",
      detail: `${job.fileName} produced ${job.detectedEventCount} draft row(s); ${job.requiresReviewCount} require review.`
    })
  };
  await writeLiveOpsStore(nextStore);
  return job;
}

function createInitialDraftSessions(): StaffDraftSession[] {
  return snapshotToDraftSessions(demoSnapshot);
}

export function snapshotToDraftSessions(snapshot: EventSnapshot): StaffDraftSession[] {
  const clock = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: snapshot.event.timeZone });
  return snapshot.scheduleItems.map(item => ({
    id: item.id, day: formatDraftDay(item.startUtc, snapshot.event.timeZone),
    start: clock.format(new Date(item.startUtc)), end: clock.format(new Date(item.endUtc)),
    title: item.title,
    speaker: item.speakerIds.map(id => snapshot.speakers.find(person => person.id === id)?.name).filter(Boolean).join(", ") || "Unassigned",
    location: item.locationName, audience: item.visibilityScope.label,
    status: item.published ? "Ready" : "Draft",
    reminders: item.notificationOffsetsMinutes.map(offset => `${offset}m`).join(", ")
  }));
}

function createScheduleItem(session: StaffDraftSession, index: number, dayOrder: number, revision: number, nowUtc: string, baseSnapshot: EventSnapshot): ScheduleItem {
  const startUtc = localEventTimeToUtc(session.day, session.start, baseSnapshot.event.timeZone);
  const sameDayEnd = localEventTimeToUtc(session.day, session.end, baseSnapshot.event.timeZone);
  const endUtc = sameDayEnd <= startUtc && /^12(?::00)?\s*AM$/i.test(session.end.trim())
    ? localEventTimeToUtc(session.day, session.end, baseSnapshot.event.timeZone, 1)
    : sameDayEnd;
  const visibility = audienceToScope(session.audience);
  const title = session.title.trim();
  const speaker = session.speaker.trim() || "Unassigned";
  const location = session.location.trim();
  const id = stableUuid(session.id);
  const previousItem = baseSnapshot.scheduleItems.find((item) => item.id === id) ??
    baseSnapshot.scheduleItems.find((item) => scheduleIdentity(item) === scheduleIdentity({
      startUtc,
      eventTimeZone: baseSnapshot.event.timeZone,
      title
    }));
  const summary = previousItem && !isSchedulePlaceholder(previousItem.description)
    ? previousItem.summary
    : speaker === "Unassigned"
      ? `${title} takes place in ${location}.`
      : `${title} with ${speaker}.`;
  const description = previousItem && !isSchedulePlaceholder(previousItem.description)
    ? previousItem.description
    : summary;

  return {
    id,
    eventId: baseSnapshot.event.id,
    title,
    shortTitle: title.slice(0, 36),
    summary,
    description,
    startUtc,
    endUtc,
    eventTimeZone: baseSnapshot.event.timeZone,
    dayOrder,
    locationId: baseSnapshot.locations.find(candidate => candidate.name === location)?.id ?? stableUuid(`location:${location}`),
    locationName: location,
    speakerIds: speaker === "Unassigned"
      ? []
      : speaker.split(",").map((name) => name.trim()).filter(Boolean).map((name) =>
          baseSnapshot.speakers.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase())?.id ?? stableUuid(`speaker:${name}`)
        ),
    status: "scheduled",
    visibilityScope: previousItem?.visibilityScope.label === session.audience ? previousItem.visibilityScope : visibility,
    eligibilityScope: previousItem?.visibilityScope.label === session.audience ? previousItem.eligibilityScope : visibility,
    notificationScope: previousItem?.visibilityScope.label === session.audience ? previousItem.notificationScope : visibility,
    notificationOffsetsMinutes: parseReminderOffsets(session.reminders),
    featured: previousItem?.featured ?? index === 0,
    published: true,
    revision,
    updatedAt: nowUtc,
    publishedAt: nowUtc
  };
}

function createLocations(sessions: StaffDraftSession[], baseSnapshot: EventSnapshot) {
  return [...new Set(sessions.map((session) => session.location.trim()).filter(Boolean))].map((locationName, index, locations) => {
    const existing = baseSnapshot.locations.find((location) => normalizeText(location.name) === normalizeText(locationName));
    return {
      id: existing?.id ?? stableUuid(`location:${locationName}`),
      eventId: baseSnapshot.event.id,
      name: locationName,
      description: existing && !isLocationPlaceholder(existing.description)
        ? existing.description
        : createLocationDescription(locationName),
      mapX: existing?.mapX ?? (locations.length <= 1 ? 0.5 : 0.18 + (index / Math.max(locations.length - 1, 1)) * 0.64),
      mapY: existing?.mapY ?? 0.36 + (index % 3) * 0.18
    };
  });
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

function localEventTimeToUtc(day: string, time: string, timeZone: string, dayOffset = 0) {
  const match = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match?.[1] || !match?.[3]) {
    throw new Error("A valid event-local clock time is required.");
  }

  const hour12 = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3].toUpperCase();
  const hour24 = meridiem === "PM" && hour12 !== 12 ? hour12 + 12 : meridiem === "AM" && hour12 === 12 ? 0 : hour12;
  const dayOfMonth = parseEventDay(day);

  return fromEventLocalTime(`2026-11-${String(dayOfMonth).padStart(2, "0")}T${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, timeZone, dayOffset);
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

  return offsets;
}

function stableUuid(input: string) {
  if (z.string().uuid().safeParse(input).success) {
    return input;
  }

  const hash = createHash("sha256").update(input).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function eventDateKey(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatDraftDay(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone,
    weekday: "short"
  }).format(new Date(value));
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
    reminders: session.reminders.trim()
  }));
}

function validateDraftSessionsForPublish(sessions: StaffDraftSession[]) {
  return getBlockingPublishMessages(sessions);
}

function parseEventDay(day: string) {
  const match = day.match(/\b(?:Nov(?:ember)?\s*)?([1-5])\b/i);
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
