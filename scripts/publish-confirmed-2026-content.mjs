import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const envPath = resolve(rootDir, ".env");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") process.loadEnvFile(envPath);

const [{ confirmedSummitGuests2026 }, { getLiveOpsState, publishEventContent }, { staffContentSchema }] = await Promise.all([
  import("../packages/config/src/index.ts"),
  import("../apps/admin/lib/live-ops-repository.ts"),
  import("../apps/admin/lib/live-ops-store.ts")
]);

const apply = process.argv.includes("--apply");
const state = await getLiveOpsState();
if (state.mode !== "supabase") throw new Error("Confirmed content may only be published through the Supabase adapter.");

const current = state.publishedSnapshot;
const currentByName = new Map(current.speakers.map((speaker) => [speaker.name.toLowerCase(), speaker]));
const speakers = confirmedSummitGuests2026.map((name) => {
  const existing = currentByName.get(name.toLowerCase());
  return existing ? { ...existing, published: true } : {
    id: stableUuid(`${current.event.id}:confirmed-guest:${name.toLowerCase()}`),
    eventId: current.event.id,
    name,
    role: "Confirmed 2026 summit guest",
    bio: "",
    headshotUrl: null,
    published: true
  };
});
const sponsorsWithoutVilla = current.sponsors.filter((sponsor) => sponsor.name.toLowerCase() !== "villa bibbiani");
const sponsors = sponsorsWithoutVilla.some((sponsor) => sponsor.name === "Steven & Alexandra Cohen Foundation")
  ? sponsorsWithoutVilla
  : [...sponsorsWithoutVilla, {
      id: "70000000-0000-4000-8000-000000000002",
      name: "Steven & Alexandra Cohen Foundation",
      tier: "Powered by",
      websiteUrl: null,
      logoUrl: null,
      published: true
    }];
const content = staffContentSchema.parse({
  event: {
    name: current.event.name,
    organizationName: current.event.organizationName,
    dateLabel: current.event.dateLabel,
    venueName: current.event.venueName,
    city: current.event.city,
    positioning: current.event.positioning,
    presentedBy: "Inspiring Children Foundation",
    poweredBy: current.event.poweredBy,
    tracks: current.event.tracks,
    featuredPeople: [],
    demo: false
  },
  speakers,
  faqs: current.faqs,
  sponsors,
  media: current.media,
  notices: current.notices,
  contentPages: current.contentPages
});

const report = {
  mode: state.mode,
  currentRevision: current.revision,
  confirmedSpeakers: speakers.length,
  removedUnconfirmedSpeakers: current.speakers.filter((speaker) => !confirmedSummitGuests2026.includes(speaker.name)).map((speaker) => speaker.name),
  removed2026Sponsors: current.sponsors.filter((sponsor) => sponsor.name.toLowerCase() === "villa bibbiani").map((sponsor) => sponsor.name),
  scheduleItemsPreserved: current.scheduleItems.length,
  action: apply ? "publish" : "preview"
};

if (!apply) {
  console.log(JSON.stringify(report, null, 2));
  console.log("No changes made. Re-run with --apply to publish the reviewed content revision.");
  process.exit(0);
}

const result = await publishEventContent(content, { role: "ADMIN", mode: "supabase" });
console.log(JSON.stringify({ ...report, result }, null, 2));

function stableUuid(value) {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16] ?? "0", 16) % 4] ?? "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}
