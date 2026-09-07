import type { EventSnapshot, ScheduleItem } from "@not-alone/validation";
import { buildPublishedSnapshotFromDraftSessions, createNotificationJobs, type StaffDraftSession } from "./live-ops-store";

export type PublishDiffChange = {
  id: string;
  type: "added" | "removed" | "changed";
  title: string;
  summary: string;
  fields: Array<{
    label: string;
    before: string;
    after: string;
  }>;
};

export type PublishPreview = {
  currentRevision: number;
  nextRevision: number;
  notificationJobsCount: number;
  counts: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
  changes: PublishDiffChange[];
};

export function createPublishPreview(currentSnapshot: EventSnapshot, sessions: StaffDraftSession[], nowUtc = new Date().toISOString()): PublishPreview {
  const nextRevision = currentSnapshot.revision + 1;
  const proposedSnapshot = buildPublishedSnapshotFromDraftSessions(sessions, nextRevision, nowUtc);
  const notificationJobsCount = createNotificationJobs(proposedSnapshot).length;
  const currentById = new Map(currentSnapshot.scheduleItems.map((item) => [item.id, item]));
  const proposedById = new Map(proposedSnapshot.scheduleItems.map((item) => [item.id, item]));
  const changes: PublishDiffChange[] = [];
  let unchanged = 0;

  for (const proposed of proposedSnapshot.scheduleItems) {
    const current = currentById.get(proposed.id);
    if (!current) {
      changes.push({
        id: proposed.id,
        type: "added",
        title: proposed.title,
        summary: `${formatTimeRange(proposed)} - ${proposed.locationName}`,
        fields: [
          { label: "Session", before: "Not published", after: proposed.title },
          { label: "Time", before: "Not published", after: formatTimeRange(proposed) },
          { label: "Location", before: "Not published", after: proposed.locationName }
        ]
      });
      continue;
    }

    const fields = compareScheduleItem(current, proposed);
    if (fields.length > 0) {
      changes.push({
        id: proposed.id,
        type: "changed",
        title: proposed.title,
        summary: fields.map((field) => field.label).join(", "),
        fields
      });
    } else {
      unchanged += 1;
    }
  }

  for (const current of currentSnapshot.scheduleItems) {
    if (proposedById.has(current.id)) {
      continue;
    }

    changes.push({
      id: current.id,
      type: "removed",
      title: current.title,
      summary: `${formatTimeRange(current)} - ${current.locationName}`,
      fields: [
        { label: "Session", before: current.title, after: "Removed from attendee schedule" },
        { label: "Time", before: formatTimeRange(current), after: "Removed" },
        { label: "Location", before: current.locationName, after: "Removed" }
      ]
    });
  }

  return {
    currentRevision: currentSnapshot.revision,
    nextRevision,
    notificationJobsCount,
    counts: {
      added: changes.filter((change) => change.type === "added").length,
      removed: changes.filter((change) => change.type === "removed").length,
      changed: changes.filter((change) => change.type === "changed").length,
      unchanged
    },
    changes
  };
}

function compareScheduleItem(current: ScheduleItem, proposed: ScheduleItem) {
  return [
    diffField("Title", current.title, proposed.title),
    diffField("Time", formatTimeRange(current), formatTimeRange(proposed)),
    diffField("Location", current.locationName, proposed.locationName),
    diffField("Audience", current.visibilityScope.label, proposed.visibilityScope.label),
    diffField("Reminders", formatReminders(current), formatReminders(proposed))
  ].filter((field): field is { label: string; before: string; after: string } => Boolean(field));
}

function diffField(label: string, before: string, after: string) {
  return before === after ? null : { label, before, after };
}

function formatTimeRange(item: ScheduleItem) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: item.eventTimeZone
  });
  return `${formatter.format(new Date(item.startUtc))} - ${formatter.format(new Date(item.endUtc))}`;
}

function formatReminders(item: ScheduleItem) {
  return item.notificationOffsetsMinutes.length > 0 ? `${item.notificationOffsetsMinutes.join("m, ")}m` : "None";
}
