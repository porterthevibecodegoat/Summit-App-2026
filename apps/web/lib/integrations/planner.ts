import { createHash } from "node:crypto";
import type { Agenda, Selection } from "./agenda";
import { timeZone } from "./catalog";
import type { Ledger } from "../wellness-booking/ledger";

export type ReminderJob = {
  key: string; recipientKey: string; to: string; kind: "agenda" | "activity" | "promotion";
  activityDate: string; activityOccurrenceIds: string[]; dueAt: string; sendBefore: string;
  body: string;
};
const dateParts = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
  timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
}).formatToParts(date).map(part => [part.type, part.value]));
const localDate = (date: Date) => { const p = dateParts(date); return `${p.year}-${p.month}-${p.day}`; };
const time = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const footer = "Reply STOP to opt out.";

export function previousEvening(activityDate: string): Date {
  const priorDay = new Date(`${activityDate}T12:00:00Z`);
  priorDay.setUTCDate(priorDay.getUTCDate() - 1);
  const target = Date.parse(`${priorDay.toISOString().slice(0, 10)}T19:00:00Z`);
  let instant = target;
  // Resolve wall-clock 19:00 through the timezone's actual offset, including DST.
  for (let i = 0; i < 3; i++) {
    const p = dateParts(new Date(instant));
    const rendered = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    instant += target - rendered;
  }
  return new Date(instant);
}

const agendaLine = (selection: Selection) => {
  const window = selection.timingMode === "drop-in" && selection.endsAt ? `${time(selection.startsAt)}-${time(selection.endsAt)} (drop in)` : time(selection.startsAt);
  return `${window}: ${selection.title}${selection.location ? `, ${selection.location}` : ""}`;
};

// Pure planning only. Make owns durable reservations, send attempts and delivery logs.
// Recompute from a fresh successful snapshot immediately before dispatching.
export function planReminders(agenda: Agenda, ledger?: Ledger): ReminderJob[] {
  if (!agenda.complete) throw new Error("Cannot plan from a partial snapshot.");
  const jobs: ReminderJob[] = [];
  for (const recipient of agenda.recipients) {
    const days = new Map<string, Selection[]>();
    const add = (kind: ReminderJob["kind"], identity: string, activityDate: string, selections: Selection[], due: Date, graceMinutes: number, body: string) => jobs.push({
      key: createHash("sha256").update(`${agenda.programId}:${recipient.recipientKey}:${kind}:${identity}`).digest("hex"),
      recipientKey: recipient.recipientKey, to: recipient.phone, kind, activityDate,
      activityOccurrenceIds: selections.map(s => s.activityOccurrenceId), dueAt: due.toISOString(),
      sendBefore: new Date(due.getTime() + graceMinutes * 60_000).toISOString(), body,
    });
    for (const selection of recipient.selections) {
      const activityDate = localDate(new Date(selection.startsAt));
      const selected = days.get(activityDate) ?? []; selected.push(selection); days.set(activityDate, selected);
      const action = selection.timingMode === "drop-in" ? "drop-in window opens" : "starts";
      add("activity", selection.activityOccurrenceId, activityDate, [selection], new Date(Date.parse(selection.startsAt) - 60 * 60_000), 5,
        `Not Alone Summit: ${selection.title} ${action} in 1 hour at ${time(selection.startsAt)}${selection.location ? `, ${selection.location}` : ""}. Las Vegas time. ${footer}`);
    }
    for (const [activityDate, selections] of days) {
      const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(new Date(selections[0]!.startsAt));
      add("agenda", activityDate, activityDate, selections, previousEvening(activityDate), 15,
        `Not Alone Summit: Your agenda for tomorrow (${label}), Las Vegas time:\n${selections.map(agendaLine).join("\n")}\n${footer}`);
    }
  }
  if (ledger) {
    for (const recipient of agenda.recipients) for (const selection of recipient.selections) {
      const booking = ledger.bookings.find(row => row.sourceRecordId === selection.sourceRecordId && row.status === "registered");
      if (!booking) continue;
      const event = [...ledger.audit].reverse().find(row => row.promotedIds.includes(booking.id));
      if (!event) continue;
      const sendBefore = Math.min(Date.parse(event.at) + 15 * 60_000, Date.parse(selection.startsAt));
      if (sendBefore <= Date.parse(event.at)) continue;
      const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(new Date(selection.startsAt));
      jobs.push({
        key: createHash("sha256").update(`${agenda.programId}:${recipient.recipientKey}:promotion:${booking.id}:${event.requestId}`).digest("hex"),
        recipientKey: recipient.recipientKey, to: recipient.phone, kind: "promotion", activityDate: localDate(new Date(selection.startsAt)),
        activityOccurrenceIds: [selection.activityOccurrenceId], dueAt: event.at, sendBefore: new Date(sendBefore).toISOString(),
        body: `Not Alone Summit: A place opened up! You're now registered for ${selection.title} on ${label} at ${time(selection.startsAt)}. Las Vegas time. ${footer}`,
      });
    }
  }
  return jobs.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.key.localeCompare(b.key));
}
