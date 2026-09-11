import { DateTime } from "luxon";
import type { EventNotice, EventSnapshot, ScheduleItem } from "@not-alone/validation";

export * from "./live-ops";

export type NowAndUpcomingInput = {
  snapshot: EventSnapshot;
  nowUtc: string;
  audienceGroups: string[];
};

export type SessionTemporalState = "completed" | "current" | "upcoming" | "canceled";
export type EventPhase = "empty" | "before" | "live" | "after";
export type OperationalNotice = Pick<EventNotice, "id" | "title" | "body" | "severity"> & { scheduleItemId?: string };

export function canSeeScheduleItem(item: ScheduleItem, audienceGroups: string[]): boolean {
  return item.published && (item.visibilityScope.id === "public" || audienceGroups.includes(item.visibilityScope.id));
}

export function getNowAndUpcoming(input: NowAndUpcomingInput) {
  const now = DateTime.fromISO(input.nowUtc, { zone: "utc" });
  const visibleItems = input.snapshot.scheduleItems
    .filter((item) => canSeeScheduleItem(item, input.audienceGroups))
    .sort((left, right) => left.startUtc.localeCompare(right.startUtc));

  const current = visibleItems.filter((item) => {
    if (item.status === "canceled" || item.status === "completed") {
      return false;
    }

    const start = DateTime.fromISO(item.startUtc, { zone: "utc" });
    const end = DateTime.fromISO(item.endUtc, { zone: "utc" });
    return start <= now && now < end;
  });

  const upcoming = visibleItems
    .filter((item) => item.status !== "canceled" && item.status !== "completed" && DateTime.fromISO(item.startUtc, { zone: "utc" }) > now)
    .slice(0, 5);

  return { current, upcoming };
}

export function getSessionTemporalState(item: ScheduleItem, nowUtc: string): SessionTemporalState {
  if (item.status === "canceled") return "canceled";
  if (item.status === "completed" || item.endUtc <= nowUtc) return "completed";
  if (item.startUtc <= nowUtc && nowUtc < item.endUtc) return "current";
  return "upcoming";
}

export function getEventPhase(snapshot: EventSnapshot, nowUtc: string, audienceGroups: string[] = ["public"]): EventPhase {
  const items = snapshot.scheduleItems
    .filter((item) => canSeeScheduleItem(item, audienceGroups) && item.status !== "canceled")
    .sort((left, right) => left.startUtc.localeCompare(right.startUtc));
  if (items.length === 0) return "empty";
  if (nowUtc < items[0]!.startUtc) return "before";
  if (nowUtc >= items.reduce((latest, item) => item.endUtc > latest ? item.endUtc : latest, items[0]!.endUtc)) return "after";
  return "live";
}

export function getJumpToNowItem(items: ScheduleItem[], nowUtc: string): ScheduleItem | undefined {
  const visible = items
    .filter((item) => item.published && item.status !== "canceled")
    .sort((left, right) => left.startUtc.localeCompare(right.startUtc));
  return visible.find((item) => getSessionTemporalState(item, nowUtc) === "current")
    ?? visible.find((item) => getSessionTemporalState(item, nowUtc) === "upcoming")
    ?? visible.at(-1);
}

export function getActiveOperationalNotices(
  snapshot: EventSnapshot,
  nowUtc: string,
  audienceGroups: string[] = ["public"]
): OperationalNotice[] {
  const publishedNotices: OperationalNotice[] = snapshot.notices
    .filter((notice) => notice.published && notice.startsAtUtc <= nowUtc && (!notice.endsAtUtc || nowUtc < notice.endsAtUtc))
    .map(({ id, title, body, severity }) => ({ id, title, body, severity }));
  const scheduleNotices: OperationalNotice[] = snapshot.scheduleItems
    .filter((item) => canSeeScheduleItem(item, audienceGroups) && item.endUtc > nowUtc && ["delayed", "moved", "canceled"].includes(item.status))
    .map((item) => ({
      id: `schedule-${item.id}-${item.status}`,
      scheduleItemId: item.id,
      severity: item.status === "canceled" ? "urgent" : "change",
      title: `${item.shortTitle || item.title} ${item.status}`,
      body: item.status === "moved"
        ? `Go to ${item.locationName}. Open the session for the latest room and access details.`
        : item.status === "delayed"
          ? `The updated start time is ${toEventTime(item.startUtc, item.eventTimeZone)} in ${item.locationName}.`
          : "This session will not take place. Open Schedule to review your next available session."
    }));

  const priority = { urgent: 0, change: 1, info: 2 } as const;
  return [...publishedNotices, ...scheduleNotices].sort((left, right) => priority[left.severity] - priority[right.severity]);
}

export function getCountdownLabel(targetUtc: string, nowUtc: string): string {
  const remainingMinutes = Math.max(0, Math.ceil((Date.parse(targetUtc) - Date.parse(nowUtc)) / 60000));
  if (remainingMinutes === 0) return "now";
  if (remainingMinutes < 60) return `${remainingMinutes} min`;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  if (hours < 24) return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const dayLabel = `${days} ${days === 1 ? "day" : "days"}`;
  return remainingHours === 0 ? dayLabel : `${dayLabel} ${remainingHours} hr`;
}

export function groupScheduleByEventDay(items: ScheduleItem[]) {
  const groups = new Map<string, ScheduleItem[]>();

  for (const item of [...items].sort((left, right) => left.startUtc.localeCompare(right.startUtc))) {
    const dayLabel = DateTime.fromISO(item.startUtc, { zone: item.eventTimeZone }).toFormat("cccc, LLLL d");
    groups.set(dayLabel, [...(groups.get(dayLabel) ?? []), item]);
  }

  return [...groups.entries()].map(([dayLabel, groupedItems]) => ({ dayLabel, items: groupedItems }));
}

export function toEventTimeRange(item: ScheduleItem, eventTimeZone: string): string {
  const start = DateTime.fromISO(item.startUtc, { zone: "utc" }).setZone(eventTimeZone);
  const end = DateTime.fromISO(item.endUtc, { zone: "utc" }).setZone(eventTimeZone);
  return `${start.toFormat("h:mm a")} - ${end.toFormat("h:mm a")}`;
}

function toEventTime(value: string, eventTimeZone: string): string {
  return DateTime.fromISO(value, { zone: "utc" }).setZone(eventTimeZone).toFormat("h:mm a");
}
