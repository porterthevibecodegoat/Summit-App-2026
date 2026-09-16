import type { EventSnapshot } from "@not-alone/validation";

export function notificationTarget(data: Record<string, unknown>, snapshot: EventSnapshot) {
  if (data.eventId !== snapshot.event.id) return null;
  const id = typeof data.scheduleItemId === "string" ? data.scheduleItemId : null;
  if (id && snapshot.scheduleItems.some(item => item.id === id)) {
    return { pathname: "/session/[id]" as const, params: { id } };
  }
  return { pathname: "/(tabs)/schedule" as const };
}
