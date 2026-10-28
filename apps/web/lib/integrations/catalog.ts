import { wellnessSessions } from "../wellness-signups-2026";

export const programId = "not-alone-summit-2026";
export const timeZone = "America/Los_Angeles";
export type Activity = {
  activityId: string; activityOccurrenceId: string; title: string;
  startsAt: string; endsAt: string | null; location: string | null;
  timingMode: "fixed-start" | "drop-in";
};

const dates = { mon: "2026-11-02", tue: "2026-11-03", wed: "2026-11-04" };
// These event dates are after the November 1 Pacific clock change. Persist UTC
// instants; all message rendering uses the event's IANA timezone.
const instant = (day: keyof typeof dates, minutes: number) => new Date(
  `${dates[day]}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00-08:00`,
).toISOString();

// Capacity settings and reminder messages share the public form's canonical
// sessions. Never copy a separate class list into the integration.
export const wellnessActivityCatalog = new Map<string, Activity>(wellnessSessions.map(session => [session.id, {
  activityId: session.id, activityOccurrenceId: `${programId}:${session.id}`,
  title: session.title, startsAt: instant(session.day, session.start), endsAt: instant(session.day, session.end),
  timingMode: session.dropIn ? "drop-in" : "fixed-start", location: null,
}]));
