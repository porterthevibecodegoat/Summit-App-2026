import type { EventSnapshot } from "@not-alone/validation";

// Null means staff has not activated the reviewed directory. Empty means an
// intentionally empty publication; never restore removed names from bundled data.
export function publishedDirectory(snapshot: EventSnapshot) {
  if (!snapshot.event.directoryEnabled) return null;
  return snapshot.speakers.filter(person => person.published && person.eventId === snapshot.event.id);
}

export function publishedAwardsProgram(snapshot: EventSnapshot) {
  return snapshot.contentPages.find(page => page.slug === "awards-2026-program" && page.published) ?? null;
}
