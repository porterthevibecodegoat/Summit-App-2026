import { fetchPublishedSnapshot } from "@not-alone/api-client";
import { demoSnapshot } from "@not-alone/test-fixtures";
import type { EventSnapshot, ScheduleItem } from "@not-alone/validation";

const defaultApiBaseUrl = "https://summit-app-2026-admin.vercel.app";

export async function getPublicSnapshot(): Promise<EventSnapshot> {
  try {
    return await fetchPublishedSnapshot(process.env.PUBLIC_API_BASE_URL ?? defaultApiBaseUrl, { timeoutMs: 5000 });
  } catch {
    return demoSnapshot;
  }
}

export type WebScheduleItem = Pick<
  ScheduleItem,
  "id" | "title" | "shortTitle" | "summary" | "startUtc" | "endUtc" | "eventTimeZone" | "locationName" | "status" | "featured"
>;

export function publicScheduleItems(snapshot: EventSnapshot): WebScheduleItem[] {
  return snapshot.scheduleItems
    .filter((item) => item.published)
    .sort((left, right) => left.startUtc.localeCompare(right.startUtc))
    .map(({ id, title, shortTitle, summary, startUtc, endUtc, eventTimeZone, locationName, status, featured }) => ({
      id,
      title,
      shortTitle,
      summary,
      startUtc,
      endUtc,
      eventTimeZone,
      locationName,
      status,
      featured
    }));
}
