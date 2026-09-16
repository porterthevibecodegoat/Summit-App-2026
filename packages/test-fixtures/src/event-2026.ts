import { DateTime } from "luxon";
import { confirmedSummitGuests2026, originalProducerCredit, producerCreditSource } from "@not-alone/config";
import { eventSnapshotSchema, type ScheduleItem } from "@not-alone/validation";
import { ros2026, ros2026Source } from "./ros-2026";

const eventId = "not-alone-summit-2026-prototype";
const revision = 9;
const publishedAt = "2026-09-16T16:00:00.000Z";
const timeZone = ros2026Source.timeZone;
const id = (type: number, row: number) => `20260000-0000-4000-800${type}-${String(row).padStart(12, "0")}`;

export function rosInstant(day: number, clock: string) {
  const value = DateTime.fromISO(`2026-11-${String(day).padStart(2, "0")}T${clock}`, { zone: timeZone });
  if (!value.isValid) throw new Error(`Invalid ROS time: ${day} ${clock}`);
  return value.toUTC().toISO()!;
}

const scheduleItems: ScheduleItem[] = ros2026.flatMap(row => {
  if (row.staffOnly || row.timingReview || !row.start || !row.end) return [];
  const startUtc = rosInstant(row.day, row.start);
  const endUtc = rosInstant(row.end <= row.start ? row.day + 1 : row.day, row.end);
  const access = row.access ?? "Access details to be confirmed";
  const locationName = row.location ?? "Location to be confirmed";
  return [{
    id: id(1, row.row), eventId, title: row.title, shortTitle: row.title,
    summary: `${row.title}. ${locationName}. ${access}.`,
    description: `${row.title}. ${locationName}. ${access}. Additional program details will be posted when confirmed.`,
    startUtc, endUtc, eventTimeZone: timeZone, dayOrder: row.day - 1,
    locationId: id(2, row.location ? 1 : 2), locationName, speakerIds: [],
    status: "scheduled", visibilityScope: { id: "public", label: access },
    eligibilityScope: { id: row.access ? `ros-${row.access.toLowerCase().replaceAll(" ", "-")}` : "unconfirmed", label: access },
    notificationScope: { id: "public", label: "All attendees" },
    notificationOffsetsMinutes: [], featured: row.row === 13 || row.row === 29,
    published: true, revision, updatedAt: publishedAt, publishedAt
  }];
});

export const event2026Snapshot = eventSnapshotSchema.parse({
  event: {
    id: eventId, name: "Not Alone Summit", organizationName: "Inspiring Children Foundation", timeZone,
    dateLabel: "November 2-4, 2026 · Additional activities November 1 & 5",
    venueName: "Wynn Las Vegas", city: "Las Vegas, Nevada",
    positioning: "Human connection, emotional wellbeing, and meaningful action. Explore the 2026 program and check back for confirmed rooms and session details.",
    presentedBy: "Inspiring Children Foundation", poweredBy: "Steven & Alexandra Cohen Foundation",
    tracks: ["Summit Sessions", "Awards", "Wellness", "Community", "Performances"], featuredPeople: [], demo: false,
    directoryEnabled: true
  },
  revision, serverTimeUtc: publishedAt, scheduleItems,
  speakers: confirmedSummitGuests2026.map((name, index) => ({
    id: id(3, index + 1), eventId, name, role: originalProducerCredit(name)?.role ?? "Confirmed 2026 guest", bio: "", headshotUrl: null,
    published: true, directoryCategories: [originalProducerCredit(name)?.category ?? "Attendees"],
    roleSource: originalProducerCredit(name) ? `Producer credits approved by event owner September 16, 2026; original site: ${producerCreditSource}. Attendance independently confirmed in Airtable.` : "Airtable Confirmed Attendance, reviewed September 16, 2026. Attendance only; no speaking role inferred."
  })),
  locations: [{
    id: id(2, 1), eventId, name: "Margaux", description: "Listed for the November 1 sponsor and talent dinner and poker night. Other room assignments are not yet confirmed.",
    // Legacy coordinate fields are unused by the directory UI, not approved map pins.
    mapX: 0.5, mapY: 0.5
  }, {
    id: id(2, 2), eventId, name: "Location to be confirmed", description: "No room assignment has been published for these activities.", mapX: 0.5, mapY: 0.5
  }],
  faqs: [
    { id: id(4, 1), question: "Which time zone does the schedule use?", answer: "All times are Las Vegas local time (America/Los_Angeles).", category: "Schedule", published: true },
    { id: id(4, 2), question: "Does a listing guarantee entry?", answer: "No. Some activities are for founders, speakers, sponsors, or talent. Ask the event team about eligibility; other access details are still being confirmed.", category: "Access", published: true },
    { id: id(4, 3), question: "Are all rooms and speakers assigned?", answer: "Not yet. Only published 2026 assignments are shown. Confirmed attendance does not mean a guest has a scheduled speaking appearance.", category: "Program", published: true }
  ],
  sponsors: [{ id: id(5, 1), name: "Steven & Alexandra Cohen Foundation", tier: "Powered by", websiteUrl: null, logoUrl: null, published: true }],
  media: [], notices: [],
  contentPages: [
    { id: id(6, 1), slug: "schedule-note", title: "2026 program", body: "The 2026 agenda includes additional activities on November 1 and 5. All times are Pacific. Unconfirmed times and rooms are marked explicitly; attendance alone does not confirm a speaking appearance.", published: true, revision },
    { id: id(6, 2), slug: "venue-room-guide", title: "2026 venue guide", body: "Margaux is listed for the November 1 sponsor and talent dinner and poker night. Other rooms and directions will be published when confirmed.", published: true, revision },
    { id: id(6, 3), slug: "inspiring-children-foundation", title: "Inspiring Children Foundation", body: "Inspiring Children Foundation supports young people in Las Vegas through programs that connect physical health, emotional wellbeing, academics, athletics, creativity, entrepreneurship, and service.", published: true, revision },
    { id: id(6, 4), slug: "schedule-pending-2026-11-02", title: "Timing to be confirmed", body: "AI relationships panel: timing and complete speaker lineup to be confirmed.\n\nDoors Open: 6:30 PM; end time to be confirmed.\n\nPre-Show: 7:30 PM; end time to be confirmed.\n\nLocations and access details to be confirmed.", published: true, revision },
    { id: id(6, 5), slug: "schedule-pending-2026-11-05", title: "Timing to be confirmed", body: "Tennis: 10:00 AM; end time to be confirmed.\n\nHigh Tea: 12:00 PM; end time to be confirmed.\n\nLocations and access details to be confirmed.", published: true, revision },
    { id: id(6, 6), slug: "awards-2026-program", title: "2026 Not Alone Awards", body: "Monday, November 2, 2026\n\nRed Carpet: 6:15-7:30 PM\nDoors Open: 6:30 PM\nPre-Show: 7:30 PM\nAwards Show: 8:00-10:00 PM\n\nAll times are Pacific. Room, honorees, award categories, and complete show lineup will be announced when confirmed.", published: true, revision }
  ]
});
