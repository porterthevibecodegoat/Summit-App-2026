import { getNowAndUpcoming, toEventTimeRange } from "@not-alone/domain";
import type { EventSnapshot, ScheduleItem } from "@not-alone/validation";

export type AttendeeConciergeAnswer = {
  mode: "temporary-local" | "openai-ready";
  title: string;
  body: string;
  items: Array<{
    id: string;
    title: string;
    time: string;
    locationName: string;
  }>;
  warnings: string[];
};

const publicSummitKnowledge = {
  foundation:
    "Inspiring Children Foundation is a Las Vegas-based 501(c)(3) nonprofit with more than 25 years supporting young people through whole-human development: physical health, emotional wellbeing, academics, athletics, creativity, entrepreneurship, and service.",
  summit:
    "Not Alone Summit is a premium human-development convening focused on emotional and mental health. It brings together leaders, artists, athletes, clinicians, researchers, philanthropists, and youth voices.",
  venue: "The summit is scheduled for Wynn Las Vegas, November 2-4, 2026.",
  checkIn:
    "Use the loaded schedule for registration, credential pickup, and room guidance. Final check-in details should be verified by staff before production launch.",
  emergency:
    "This app can help with summit schedule and event information, but it is not emergency or crisis care.",
  featured:
    "Public summit materials reference leaders and artists including Jewel, Steve Wozniak, Mike Tyson, Jada Pinkett Smith, Loni Love, Jason Kennedy, Rachel Platten, Darryl McDaniels, Harry Hudson, Kevin Hines, and others."
};

export function createAttendeeConciergeAnswer({
  question,
  snapshot,
  nowUtc
}: {
  question: string;
  snapshot: EventSnapshot;
  nowUtc: string;
}): AttendeeConciergeAnswer {
  const normalized = question.toLowerCase();
  const allItems = [...snapshot.scheduleItems].sort((left, right) => left.startUtc.localeCompare(right.startUtc));
  const timeline = getNowAndUpcoming({
    snapshot,
    nowUtc,
    audienceGroups: ["all_attendees", "founders", "public"]
  });
  const personMatch = findPersonScheduleMatch(normalized, allItems);
  const dayMatch = findDayScheduleMatch(normalized, allItems, snapshot.event.timeZone);
  const locationMatch = findLocationMatch(normalized, snapshot);

  if (matchesAny(normalized, ["emergency", "crisis", "suicide", "self harm", "self-harm", "unsafe"])) {
    return createAnswer({
      title: "Immediate human support",
      body: `${publicSummitKnowledge.emergency} If you are in immediate danger in the United States, call emergency services or call/text 988 for crisis support.`,
      items: []
    });
  }

  if (matchesAny(normalized, ["inspiring children", "foundation", "icf", "nonprofit"])) {
    return createAnswer({
      title: "Inspiring Children Foundation",
      body: publicSummitKnowledge.foundation,
      items: []
    });
  }

  if (personMatch) {
    return createAnswer({
      title: `${personMatch.name} in the current app schedule`,
      body:
        personMatch.items.length > 0
          ? `${personMatch.name} appears in the loaded schedule below.`
          : `${personMatch.name} is listed in public summit materials, but the current app schedule does not include a specific published appearance time yet.`,
      items: personMatch.items.slice(0, 4),
      snapshot
    });
  }

  if (dayMatch) {
    return createAnswer({
      title: `${dayMatch.label} schedule`,
      body:
        dayMatch.items.length > 0
          ? `${dayMatch.items.length} published session${dayMatch.items.length === 1 ? " is" : "s are"} loaded for ${dayMatch.label.toLowerCase()}.`
          : `No published sessions are loaded for ${dayMatch.label.toLowerCase()} yet.`,
      items: dayMatch.items.slice(0, 8),
      snapshot
    });
  }

  if (matchesAny(normalized, ["now", "happening", "live", "current"])) {
    return createAnswer({
      title: timeline.current.length > 0 ? "Happening now" : "Nothing is live right now",
      body:
        timeline.current.length > 0
          ? "These are the sessions currently active for the loaded schedule."
          : timeline.upcoming[0]
            ? `The next loaded session is ${timeline.upcoming[0].title}.`
            : "There are no upcoming published sessions in the current snapshot.",
      items: timeline.current.length > 0 ? timeline.current : timeline.upcoming.slice(0, 3),
      snapshot
    });
  }

  if (matchesAny(normalized, ["quiet", "break", "wellness", "reset", "meditation", "breath"])) {
    const items = findItems(allItems, ["wellness", "reset", "meditation", "breath", "sauna", "pilates", "yoga"]);
    return createAnswer({
      title: "Quiet and wellness options",
      body: items.length > 0
        ? "These are the calmest loaded options in the current schedule."
        : "Quiet-room and wellness details are not fully published yet.",
      items: items.slice(0, 4),
      snapshot
    });
  }

  if (matchesAny(normalized, ["summit", "what is", "about", "purpose"])) {
    return createAnswer({
      title: "Not Alone Summit",
      body: `${publicSummitKnowledge.summit} ${publicSummitKnowledge.venue}`,
      items: timeline.upcoming.slice(0, 3),
      snapshot
    });
  }

  if (matchesAny(normalized, ["registration", "check in", "check-in", "badge", "credential", "arrive", "arrival"])) {
    const items = findItems(allItems, ["registration", "check in", "credential", "gifting", "wellness"]);
    return createAnswer({
      title: "Registration and arrival",
      body: publicSummitKnowledge.checkIn,
      items: items.slice(0, 4),
      snapshot
    });
  }

  if (locationMatch) {
    return createAnswer({
      title: locationMatch.location.name,
      body: locationMatch.guidance,
      items: locationMatch.items.slice(0, 4),
      snapshot
    });
  }

  if (matchesAny(normalized, ["next", "where", "go", "room", "location"])) {
    const nextItem = timeline.upcoming[0];
    return createAnswer({
      title: nextItem ? `Next: ${nextItem.title}` : "No next session found",
      body: nextItem
        ? `Go to ${nextItem.locationName} for ${toEventTimeRange(nextItem, snapshot.event.timeZone)}.`
        : "No upcoming published session is available in the current snapshot.",
      items: timeline.upcoming.slice(0, 3),
      snapshot
    });
  }

  if (matchesAny(normalized, ["featured", "speaker", "speakers", "who", "mike", "tyson", "jewel", "wozniak"])) {
    return createAnswer({
      title: "Featured public summit voices",
      body: publicSummitKnowledge.featured,
      items: findItems(allItems, normalized.split(/[^a-z0-9]+/).filter((word) => word.length > 3)).slice(0, 4),
      snapshot
    });
  }

  return createAnswer({
    title: "Best current answer",
    body:
      timeline.upcoming[0]
        ? `The next loaded session is ${timeline.upcoming[0].title} at ${toEventTimeRange(timeline.upcoming[0], snapshot.event.timeZone)} in ${timeline.upcoming[0].locationName}.`
        : `${publicSummitKnowledge.summit} Open the full schedule for the latest published sessions.`,
    items: timeline.upcoming.slice(0, 4),
    snapshot
  });
}

function findDayScheduleMatch(prompt: string, items: ScheduleItem[], timeZone: string) {
  const day = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].find((value) =>
    prompt.includes(value)
  );
  if (!day) return null;

  const period = ["morning", "afternoon", "evening"].find((value) => prompt.includes(value));
  const matches = items.filter((item) => {
    const date = new Date(item.startUtc);
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(date).toLowerCase();
    if (weekday !== day) return false;

    if (!period) return true;
    const hourPart = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone
    }).formatToParts(date).find((part) => part.type === "hour")?.value;
    const hour = Number(hourPart);
    if (!Number.isFinite(hour)) return true;
    if (period === "morning") return hour < 12;
    if (period === "afternoon") return hour >= 12 && hour < 17;
    return hour >= 17;
  });

  const periodLabel = period ? ` ${period}` : "";
  return { label: `${day[0]?.toUpperCase()}${day.slice(1)}${periodLabel}`, items: matches };
}

function findLocationMatch(prompt: string, snapshot: EventSnapshot) {
  if (!matchesAny(prompt, ["where", "room", "location", "stage", "find", "navigate", "directions"])) return null;

  const searchablePrompt = prompt.replace(/[^a-z0-9]+/g, " ");
  const venueGuidePages = snapshot.contentPages
    .filter((page) => page.slug.includes("venue") || page.slug.includes("room") || page.title.toLowerCase().includes("venue"))
    .map((page) => page.body);
  const venueGuide = venueGuidePages.join(" ").toLowerCase();
  const location = snapshot.locations.find((candidate) => {
    const name = candidate.name.toLowerCase();
    const significantNameParts = name.split(/[^a-z0-9]+/).filter((part) => part.length >= 4);
    const directMatch = significantNameParts.some((part) => searchablePrompt.includes(part));
    const mainStageMatch = prompt.includes("main stage") && significantNameParts.some((part) => venueGuide.includes(`${part} is the wisdom forum main stage`));
    return directMatch || mainStageMatch;
  });
  if (!location) return null;

  const locationTerms = location.name.toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length >= 4);
  const guidance = venueGuidePages
    .flatMap((body) => body.split(/(?<=[.!?])\s+/))
    .find((sentence) => locationTerms.some((part) => sentence.toLowerCase().includes(part)));

  return {
    location,
    guidance: guidance ?? location.description,
    items: snapshot.scheduleItems.filter((item) => item.locationId === location.id)
  };
}

function createAnswer({
  title,
  body,
  items,
  snapshot
}: {
  title: string;
  body: string;
  items: ScheduleItem[];
  snapshot?: EventSnapshot;
}): AttendeeConciergeAnswer {
  return {
    mode: "temporary-local",
    title,
    body,
    items: snapshot
      ? items.map((item) => ({
          id: item.id,
          title: item.title,
          time: toEventTimeRange(item, snapshot.event.timeZone),
          locationName: item.locationName
        }))
      : [],
    warnings: ["Temporary no-key answer. Real OpenAI concierge must run server-side before production use."]
  };
}

function findPersonScheduleMatch(prompt: string, items: ScheduleItem[]) {
  const people = [
    { name: "Mike Tyson", aliases: ["mike tyson", "tyson"] },
    { name: "Steve Wozniak", aliases: ["steve wozniak", "wozniak"] },
    { name: "Jewel", aliases: ["jewel"] },
    { name: "Jada Pinkett Smith", aliases: ["jada", "pinkett"] },
    { name: "Loni Love", aliases: ["loni love", "loni"] },
    { name: "Jason Kennedy", aliases: ["jason kennedy", "jason"] },
    { name: "Rachel Platten", aliases: ["rachel platten", "rachel"] },
    { name: "Darryl McDaniels", aliases: ["darryl", "mcdaniels", "dmc"] },
    { name: "Harry Hudson", aliases: ["harry hudson"] },
    { name: "Kevin Hines", aliases: ["kevin hines"] }
  ];
  const person = people.find((candidate) => matchesAny(prompt, candidate.aliases));

  if (!person) {
    return null;
  }

  return {
    name: person.name,
    items: findItems(items, person.aliases)
  };
}

function findItems(items: ScheduleItem[], terms: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!matchesAny(searchText(item), terms) || seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function searchText(item: ScheduleItem) {
  return `${item.title} ${item.shortTitle} ${item.summary} ${item.description} ${item.locationName} ${item.visibilityScope.label}`.toLowerCase();
}

function matchesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}
