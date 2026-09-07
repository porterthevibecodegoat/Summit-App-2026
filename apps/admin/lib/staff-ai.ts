import { createScheduleQualityReport } from "./schedule-quality";

export type DraftSession = {
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

export type ProposalChange = {
  id: string;
  label: "Start time" | "End time" | "Speaker" | "Location" | "Title" | "Audience" | "Status";
  before: string;
  after: string;
};

export type StaffAiProposal = {
  summary: string;
  confidence: "High" | "Medium" | "Low";
  changes: ProposalChange[];
  warnings: string[];
};

export type PublishStateSummary = {
  revision: number;
  message: string;
  updatedAt: string;
};

export function createScheduleProposal(command: string, sessions: DraftSession[]): StaffAiProposal {
  const normalized = command.toLowerCase();
  const targetTime = extractTargetTime(command);
  const target = findTargetSession(command, sessions, targetTime);

  if (!target) {
    return {
      summary: "No matching session was found.",
      confidence: "Low",
      changes: [],
      warnings: ["Try naming the session, current speaker, or current start time."]
    };
  }

  const changes: ProposalChange[] = [];
  const warnings: string[] = [];
  const newStart = extractNewStartTime(command);
  const newSpeaker = extractNewSpeaker(command);
  const newLocation = extractNewLocation(command);
  const newTitle = extractNewTitle(command);
  const newAudience = extractNewAudience(normalized);
  const nextStatus = normalized.includes("mark ready") || normalized.includes("ready to publish") ? "Ready" : undefined;

  if (newStart) {
    const formattedStart = formatCommandTime(newStart, target.start);
    changes.push({
      id: target.id,
      label: "Start time",
      before: target.start,
      after: formattedStart
    });

    const shiftedEnd = shiftEndTime(target.start, target.end, formattedStart);
    if (shiftedEnd && shiftedEnd !== target.end) {
      changes.push({
        id: target.id,
        label: "End time",
        before: target.end,
        after: shiftedEnd
      });
    }
  }

  if (newSpeaker && newSpeaker.toLowerCase() !== target.speaker.toLowerCase()) {
    changes.push({
      id: target.id,
      label: "Speaker",
      before: target.speaker,
      after: newSpeaker
    });
  }

  if (newLocation && newLocation.toLowerCase() !== target.location.toLowerCase()) {
    changes.push({
      id: target.id,
      label: "Location",
      before: target.location,
      after: newLocation
    });
  }

  if (newTitle && newTitle.toLowerCase() !== target.title.toLowerCase()) {
    changes.push({
      id: target.id,
      label: "Title",
      before: target.title,
      after: newTitle
    });
  }

  if (newAudience && newAudience.toLowerCase() !== target.audience.toLowerCase()) {
    changes.push({
      id: target.id,
      label: "Audience",
      before: target.audience,
      after: newAudience
    });
  }

  if (nextStatus && nextStatus !== target.status) {
    changes.push({
      id: target.id,
      label: "Status",
      before: target.status,
      after: nextStatus
    });
  }

  if (normalized.includes("cancel")) {
    warnings.push("Canceling attendee-facing sessions should use the final production cancel-event workflow before launch.");
  }

  if (changes.length === 0) {
    warnings.push("I found a likely session, but could not identify a safe structured edit.");
  }

  return {
    summary:
      changes.length > 0
        ? `Update ${target.title} with ${changes.length} reviewed change(s).`
        : `I found ${target.title}, but need a clearer time, speaker, room, title, audience, or status change.`,
    confidence: changes.length >= 2 ? "High" : changes.length === 1 ? "Medium" : "Low",
    changes,
    warnings
  };
}

export function createStateAnswer({
  question,
  sessions,
  baseRevision,
  publishState,
  backendMode = "local-adapter",
  notificationJobsCount = 0,
  attendeeDevices = 0
}: {
  question: string;
  sessions: DraftSession[];
  baseRevision: number;
  publishState?: PublishStateSummary | null;
  backendMode?: "local-adapter" | "supabase";
  notificationJobsCount?: number;
  attendeeDevices?: number;
}) {
  const normalized = question.toLowerCase();
  const ready = sessions.filter((session) => session.status === "Ready");
  const review = sessions.filter((session) => session.status === "Needs review");
  const draft = sessions.filter((session) => session.status === "Draft");
  const missingLocation = sessions.filter((session) => !isRealLocation(session.location));
  const invalidTime = sessions.filter((session) => !isValidTime(session.start) || !isValidTime(session.end));
  const firstLiveCandidate = sessions[0];
  const notificationReady = sessions.filter((session) => session.reminders.trim().length > 0);
  const latestRevision = publishState?.revision ?? baseRevision;
  const qualityReport = createScheduleQualityReport(sessions);

  if (matchesAny(normalized, ["notification", "push", "reminder", "send", "phones"])) {
    return [
      `There are ${notificationReady.length} draft session(s) with reminder offsets and ${notificationJobsCount} queued notification metadata job(s).`,
      "Real push delivery is still disabled until EAS project ID, Apple push credentials, device registration, and the server dispatch worker are configured.",
      attendeeDevices > 0
        ? `${attendeeDevices} attendee device registration(s) are visible to the backend.`
        : "No attendee devices are registered in this environment yet."
    ].join(" ");
  }

  if (matchesAny(normalized, ["supabase", "backend", "cloud", "sync", "everyone", "installed", "devices"])) {
    return [
      `The staff portal is currently running in ${backendMode} mode.`,
      `The latest published snapshot revision is ${latestRevision}.`,
      backendMode === "supabase"
        ? "Published changes are being read from Supabase through the server adapter."
        : "Local mode proves the publish-to-snapshot loop, but it does not update phones outside this machine.",
      "For real app-wide sync, deploy the admin API, point the mobile app at that URL, and enable Supabase-backed revisions."
    ].join(" ");
  }

  if (matchesAny(normalized, ["review", "ready", "blocked", "missing", "publish"])) {
    return [
      `${ready.length} session(s) are ready, ${review.length} need review, and ${draft.length} are still draft.`,
      qualityReport.conflicts.length > 0
        ? `${qualityReport.conflicts.length} room conflict(s) must be resolved before publishing.`
        : "No same-room overlap conflicts were found.",
      missingLocation.length > 0 ? `${missingLocation.length} session(s) need real locations.` : "All sessions have locations.",
      invalidTime.length > 0 ? `${invalidTime.length} session(s) need valid start/end times.` : "All sessions have valid-looking times.",
      qualityReport.publishable
        ? "The draft currently passes the blocking quality gate."
        : `${qualityReport.issueCounts.blocking} blocking issue(s) remain before attendee-facing publish.`
    ].join(" ");
  }

  if (matchesAny(normalized, ["conflict", "overlap", "double book", "double-book", "same room", "room issue"])) {
    return qualityReport.conflicts.length > 0
      ? qualityReport.conflicts.map((conflict) => conflict.message).join(" ")
      : "No same-room schedule overlaps were found in the current draft.";
  }

  if (matchesAny(normalized, ["pdf", "import", "upload", "file", "spreadsheet", "schedule"])) {
    return [
      "Text and CSV-style schedule imports can be parsed into review rows now.",
      "PDF upload is staged in the interface, but production-grade extraction still needs a server parser and import job history before it should publish data.",
      "Imported rows remain draft until staff reviews, marks them Ready, confirms, and publishes."
    ].join(" ");
  }

  if (matchesAny(normalized, ["current", "live", "now", "first", "next"])) {
    return firstLiveCandidate
      ? `The first current draft candidate is ${firstLiveCandidate.title} at ${firstLiveCandidate.start} with ${firstLiveCandidate.speaker} in ${firstLiveCandidate.location}. It is marked ${firstLiveCandidate.status}.`
      : "There is no current draft candidate yet.";
  }

  const intent = question.trim().length > 0 ? question.trim() : "current state";
  return [
    `For "${intent}", the portal currently has ${sessions.length} draft session(s), ${ready.length} ready to publish, and ${review.length} needing review.`,
    firstLiveCandidate
      ? `The first attendee-facing candidate is ${firstLiveCandidate.title} at ${firstLiveCandidate.start} with ${firstLiveCandidate.speaker}.`
      : "There is no attendee-facing candidate yet.",
    `${notificationReady.length} session(s) include reminder metadata.`,
    `Latest staged/published revision shown in this portal is ${latestRevision}.`,
    "Temporary State AI is deterministic and read-only; production State AI should stay server-side and grounded in Supabase."
  ].join(" ");
}

function findTargetSession(command: string, sessions: DraftSession[], targetTime: string | null) {
  const normalized = command.toLowerCase();
  const replacedSpeaker = extractReplacedSpeaker(command);

  if (replacedSpeaker) {
    const speakerMatch = sessions.find((session) => includesNormalized(session.speaker, replacedSpeaker));
    if (speakerMatch) {
      return speakerMatch;
    }
  }

  if (targetTime) {
    const targetMinutes = parseTimeToMinutes(formatCommandTime(targetTime, "12:00 PM"));
    const timeMatch = sessions.find((session) => parseTimeToMinutes(session.start) === targetMinutes);
    if (timeMatch) {
      return timeMatch;
    }
  }

  const scored = sessions
    .map((session) => ({ session, score: scoreSessionMatch(normalized, session) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.session ?? sessions[0];
}

function scoreSessionMatch(command: string, session: DraftSession) {
  const searchable = `${session.title} ${session.speaker} ${session.location} ${session.audience}`.toLowerCase();
  return command
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3)
    .reduce((score, word) => score + (searchable.includes(word) ? 1 : 0), 0);
}

function extractTargetTime(command: string) {
  return command.match(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i)?.[0] ?? null;
}

function extractNewStartTime(command: string) {
  return command.match(/(?:changed to|moved to|move to|starts? at|start(?:s)? time to|now at|to)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)?.[1] ?? null;
}

function extractNewSpeaker(command: string) {
  return (
    command.match(/(?:it is now|speaker is now|speaker changed to|now featuring|replaced by)\s+([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){0,4})(?:\s+instead of|\.|,|$)/)?.[1]?.trim() ?? null
  );
}

function extractReplacedSpeaker(command: string) {
  return command.match(/instead of\s+([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){0,4})(?:\.|,|$)/)?.[1]?.trim() ?? null;
}

function extractNewLocation(command: string) {
  return command.match(/(?:room|location|venue)\s+(?:is now|changed to|to)\s+([A-Z][A-Za-z0-9&.' -]{2,})(?:\.|,|$)/)?.[1]?.trim() ?? null;
}

function extractNewTitle(command: string) {
  return command.match(/(?:title|session name|rename(?: it)?)\s+(?:is now|changed to|to)\s+"([^"]{3,})"/i)?.[1]?.trim() ?? null;
}

function extractNewAudience(command: string) {
  if (command.includes("founders only") || command.includes("founder only")) {
    return "Founders only";
  }

  if (command.includes("all attendees") || command.includes("everyone") || command.includes("public")) {
    return "All attendees";
  }

  if (command.includes("staff only")) {
    return "Staff only";
  }

  if (command.includes("vip")) {
    return "VIP";
  }

  return null;
}

function shiftEndTime(previousStart: string, previousEnd: string, nextStart: string) {
  const previousStartMinutes = parseTimeToMinutes(previousStart);
  const previousEndMinutes = parseTimeToMinutes(previousEnd);
  const nextStartMinutes = parseTimeToMinutes(nextStart);

  if (previousStartMinutes === null || previousEndMinutes === null || nextStartMinutes === null) {
    return null;
  }

  return formatMinutesAsTime(nextStartMinutes + Math.max(previousEndMinutes - previousStartMinutes, 15));
}

function formatCommandTime(value: string, fallback: string) {
  const trimmed = value.trim().toUpperCase();
  if (trimmed.includes("AM") || trimmed.includes("PM")) {
    return normalizeTime(trimmed);
  }

  const meridiem = fallback.toUpperCase().includes("AM") ? "AM" : "PM";
  return normalizeTime(`${trimmed} ${meridiem}`);
}

function normalizeTime(value: string) {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  const hour = match?.[1];
  const minute = match?.[2] ?? "00";
  const meridiem = match?.[3];

  if (!hour || !meridiem) {
    return value;
  }

  return `${Number(hour)}:${minute} ${meridiem.toUpperCase()}`;
}

function parseTimeToMinutes(value: string) {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  const hour = match?.[1] ? Number(match[1]) : null;
  const minute = Number(match?.[2] ?? "0");
  const meridiem = match?.[3]?.toUpperCase();

  if (!hour || !meridiem || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  const hour24 = meridiem === "PM" && hour !== 12 ? hour + 12 : meridiem === "AM" && hour === 12 ? 0 : hour;
  return hour24 * 60 + minute;
}

function formatMinutesAsTime(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

function isValidTime(value: string) {
  return /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.test(value.trim());
}

function isRealLocation(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "needs location";
}

function includesNormalized(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
}

function matchesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}
