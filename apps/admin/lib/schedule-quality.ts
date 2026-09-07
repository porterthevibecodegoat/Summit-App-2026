import type { StaffDraftSession } from "./live-ops-store";

export type ScheduleQualitySeverity = "blocking" | "warning" | "info";

export type ScheduleQualityIssue = {
  id: string;
  severity: ScheduleQualitySeverity;
  title: string;
  message: string;
  sessionIds: string[];
};

export type ScheduleConflict = {
  id: string;
  severity: "blocking";
  day: string;
  location: string;
  firstSessionId: string;
  secondSessionId: string;
  message: string;
};

export type ScheduleQualityReport = {
  totalSessions: number;
  readySessions: number;
  needsReviewSessions: number;
  draftSessions: number;
  reminderReadySessions: number;
  publishable: boolean;
  issues: ScheduleQualityIssue[];
  conflicts: ScheduleConflict[];
  issueCounts: {
    blocking: number;
    warning: number;
    info: number;
  };
};

type ParsedSession = {
  session: StaffDraftSession;
  dayKey: string | null;
  startMinutes: number | null;
  endMinutes: number | null;
};

export function createScheduleQualityReport(sessions: StaffDraftSession[]): ScheduleQualityReport {
  const issues: ScheduleQualityIssue[] = [];
  const conflicts: ScheduleConflict[] = [];
  const parsedSessions = sessions.map(parseSession);
  const duplicateIds = getDuplicateIds(sessions);

  if (sessions.length === 0) {
    issues.push({
      id: "schedule-empty",
      severity: "blocking",
      title: "No sessions",
      message: "Add at least one session before publishing.",
      sessionIds: []
    });
  }

  duplicateIds.forEach((id) => {
    issues.push({
      id: `duplicate-id-${id}`,
      severity: "blocking",
      title: "Duplicate session identity",
      message: `Two or more rows share the same internal id: ${id}. Duplicate ids can cause app rendering and sync errors.`,
      sessionIds: sessions.filter((session) => session.id === id).map((session) => session.id)
    });
  });

  sessions.forEach((session, index) => {
    const rowLabel = `Row ${index + 1}`;
    const parsed = parseSession(session);

    if (session.status !== "Ready") {
      issues.push({
        id: `${session.id}-not-ready`,
        severity: "blocking",
        title: "Not marked Ready",
        message: `${rowLabel} must be marked Ready before attendee-facing publication.`,
        sessionIds: [session.id]
      });
    }

    if (!session.title.trim()) {
      issues.push({
        id: `${session.id}-missing-title`,
        severity: "blocking",
        title: "Missing title",
        message: `${rowLabel} is missing a title.`,
        sessionIds: [session.id]
      });
    }

    if (!isRealLocation(session.location)) {
      issues.push({
        id: `${session.id}-missing-location`,
        severity: "blocking",
        title: "Missing location",
        message: `${rowLabel} needs a real room or location.`,
        sessionIds: [session.id]
      });
    }

    if (parsed.startMinutes === null || parsed.endMinutes === null) {
      issues.push({
        id: `${session.id}-invalid-time`,
        severity: "blocking",
        title: "Invalid time",
        message: `${rowLabel} needs valid start and end times such as 3:00 PM.`,
        sessionIds: [session.id]
      });
      return;
    }

    if (parsed.endMinutes <= parsed.startMinutes) {
      issues.push({
        id: `${session.id}-end-before-start`,
        severity: "blocking",
        title: "End time issue",
        message: `${rowLabel} end time must be after start time.`,
        sessionIds: [session.id]
      });
    }

    if (!parsed.dayKey) {
      issues.push({
        id: `${session.id}-unclear-day`,
        severity: "warning",
        title: "Unclear day",
        message: `${rowLabel} has an unclear day label. Use Monday Nov 2, Tuesday Nov 3, or Wednesday Nov 4.`,
        sessionIds: [session.id]
      });
    }

    if (parseReminderOffsets(session.reminders).length === 0) {
      issues.push({
        id: `${session.id}-no-reminders`,
        severity: "warning",
        title: "No reminder offsets",
        message: `${rowLabel} has no valid reminder offsets. Use values like 30m, 10m.`,
        sessionIds: [session.id]
      });
    }
  });

  conflicts.push(...findLocationConflicts(parsedSessions));

  const allIssues: ScheduleQualityIssue[] = [
    ...issues,
    ...conflicts.map((conflict) => ({
      id: conflict.id,
      severity: conflict.severity,
      title: "Room conflict",
      message: conflict.message,
      sessionIds: [conflict.firstSessionId, conflict.secondSessionId]
    }))
  ];
  const issueCounts = countIssueSeverities(allIssues);

  return {
    totalSessions: sessions.length,
    readySessions: sessions.filter((session) => session.status === "Ready").length,
    needsReviewSessions: sessions.filter((session) => session.status === "Needs review").length,
    draftSessions: sessions.filter((session) => session.status === "Draft").length,
    reminderReadySessions: sessions.filter((session) => parseReminderOffsets(session.reminders).length > 0).length,
    publishable: issueCounts.blocking === 0,
    issues: allIssues,
    conflicts,
    issueCounts
  };
}

export function getBlockingPublishMessages(sessions: StaffDraftSession[]) {
  return createScheduleQualityReport(sessions)
    .issues
    .filter((issue) => issue.severity === "blocking")
    .map((issue) => issue.message);
}

export function isValidTime(value: string) {
  return parseTimeToMinutes(value) !== null;
}

export function isRealLocation(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "needs location";
}

export function parseReminderOffsets(value: string) {
  return value
    .split(",")
    .map((part) => Number(part.replace(/[^0-9]/g, "")))
    .filter((offset) => Number.isInteger(offset) && offset > 0);
}

function findLocationConflicts(parsedSessions: ParsedSession[]) {
  const conflicts: ScheduleConflict[] = [];
  const comparableSessions = parsedSessions.filter(
    (entry): entry is ParsedSession & { dayKey: string; startMinutes: number; endMinutes: number } =>
      Boolean(entry.dayKey) &&
      entry.startMinutes !== null &&
      entry.endMinutes !== null &&
      isRealLocation(entry.session.location)
  );

  for (let firstIndex = 0; firstIndex < comparableSessions.length; firstIndex += 1) {
    const first = comparableSessions[firstIndex]!;
    for (let secondIndex = firstIndex + 1; secondIndex < comparableSessions.length; secondIndex += 1) {
      const second = comparableSessions[secondIndex]!;
      const sameRoom = normalizeLocation(first.session.location) === normalizeLocation(second.session.location);
      const sameDay = first.dayKey === second.dayKey;
      const overlaps = first.startMinutes < second.endMinutes && second.startMinutes < first.endMinutes;

      if (!sameRoom || !sameDay || !overlaps) {
        continue;
      }

      conflicts.push({
        id: `conflict-${first.session.id}-${second.session.id}`,
        severity: "blocking",
        day: first.session.day,
        location: first.session.location,
        firstSessionId: first.session.id,
        secondSessionId: second.session.id,
        message: `${first.session.title} overlaps ${second.session.title} in ${first.session.location} on ${first.session.day}.`
      });
    }
  }

  return conflicts;
}

function parseSession(session: StaffDraftSession): ParsedSession {
  return {
    session,
    dayKey: parseDayKey(session.day),
    startMinutes: parseTimeToMinutes(session.start),
    endMinutes: parseTimeToMinutes(session.end)
  };
}

function parseDayKey(day: string) {
  const normalized = day.trim().toLowerCase();
  const explicit = normalized.match(/\b(?:nov(?:ember)?\s*)?([2-4])\b/)?.[1];

  if (explicit) {
    return `2026-11-${explicit.padStart(2, "0")}`;
  }

  if (normalized.includes("monday") || normalized.includes("mon ")) {
    return "2026-11-02";
  }
  if (normalized.includes("tuesday") || normalized.includes("tue")) {
    return "2026-11-03";
  }
  if (normalized.includes("wednesday") || normalized.includes("wed")) {
    return "2026-11-04";
  }

  return null;
}

function parseTimeToMinutes(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match?.[1] || !match?.[3]) {
    return null;
  }

  const hour12 = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3].toUpperCase();

  if (hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) {
    return null;
  }

  const hour24 = meridiem === "PM" && hour12 !== 12 ? hour12 + 12 : meridiem === "AM" && hour12 === 12 ? 0 : hour12;
  return hour24 * 60 + minute;
}

function getDuplicateIds(sessions: StaffDraftSession[]) {
  const counts = new Map<string, number>();
  sessions.forEach((session) => counts.set(session.id, (counts.get(session.id) ?? 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

function normalizeLocation(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function countIssueSeverities(issues: ScheduleQualityIssue[]) {
  return issues.reduce(
    (counts, issue) => ({
      ...counts,
      [issue.severity]: counts[issue.severity] + 1
    }),
    { blocking: 0, warning: 0, info: 0 }
  );
}
