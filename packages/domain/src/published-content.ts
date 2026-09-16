import type { EventSnapshot } from "@not-alone/validation";
import { DateTime } from "luxon";

// Null means staff has not activated the reviewed directory. Empty means an
// intentionally empty publication; never restore removed names from bundled data.
export function publishedDirectory(snapshot: EventSnapshot) {
  if (!snapshot.event.directoryEnabled) return null;
  return snapshot.speakers.filter(person => person.published && person.eventId === snapshot.event.id);
}

export function publishedAwardsProgram(snapshot: EventSnapshot) {
  return snapshot.contentPages.find(page => page.slug === "awards-2026-program" && page.published) ?? null;
}

export function groupPublishedProgramByDay(snapshot: EventSnapshot) {
  const visibleItems = snapshot.scheduleItems.filter(item => item.published && item.visibilityScope.id === "public");
  const dates = new Set(visibleItems.map(item =>
    DateTime.fromISO(item.startUtc).setZone(snapshot.event.timeZone).toISODate()!
  ));
  const notes = snapshot.contentPages.filter(page => page.published && /^schedule-pending-\d{4}-\d{2}-\d{2}$/.test(page.slug));
  for (const note of notes) dates.add(note.slug.replace("schedule-pending-", ""));
  return [...dates].sort().filter(date => DateTime.fromISO(date).isValid).map(date => ({
    date,
    dayLabel: DateTime.fromISO(date).toFormat("cccc, LLLL d"),
    weekday: DateTime.fromISO(date).toFormat("ccc"),
    shortDate: DateTime.fromISO(date).toFormat("LLL d"),
    items: visibleItems.filter(item => DateTime.fromISO(item.startUtc).setZone(snapshot.event.timeZone).toISODate() === date)
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc)),
    notes: notes.filter(note => note.slug === `schedule-pending-${date}`)
  }));
}
