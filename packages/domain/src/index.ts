import { DateTime } from "luxon";
import type { EventSnapshot, ScheduleItem } from "@not-alone/validation";

export * from "./live-ops";

export type NowAndUpcomingInput = {
  snapshot: EventSnapshot;
  nowUtc: string;
  audienceGroups: string[];
};

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
    .filter((item) => DateTime.fromISO(item.startUtc, { zone: "utc" }) > now)
    .slice(0, 5);

  return { current, upcoming };
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
