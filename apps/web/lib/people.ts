import { confirmedSummitGuests2026, originalProducerCredit, originalProducerCredits } from "@not-alone/config";
import { publishedDirectory } from "@not-alone/domain";
import type { EventSnapshot } from "@not-alone/validation";
import original from "./original-sites.json";
import { originalAsset } from "./original-assets";

export type PersonCategory = "Co-Chairs" | "Hosts" | "Founders" | "Mental Health Nonprofit Founding Partners" | "Musicians" | "Entertainers & Athletes" | "Experts" | "Business Leaders & Philanthropists" | "Sponsors" | "Executive Producers" | "Producers" | "Attendees";
export type SummitPerson = { name: string; slug: string; categories: PersonCategory[]; role: string; bio: string; year: 2025 | 2026; image?: string; order?: number; messageable?: boolean };
export const categories: PersonCategory[] = ["Co-Chairs", "Hosts", "Founders", "Mental Health Nonprofit Founding Partners", "Musicians", "Entertainers & Athletes", "Experts", "Business Leaders & Philanthropists", "Sponsors", "Executive Producers", "Producers", "Attendees"];
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Attendance is not approval of a speaking, sponsor, host or production role.
export const people2026: SummitPerson[] = confirmedSummitGuests2026.map(name => {
  const credit = originalProducerCredit(name);
  return { name, slug: slug(name), categories: credit ? [credit.category] : ["Attendees"], role: credit?.role ?? "Confirmed 2026 summit guest", bio: "", year: 2026, messageable: false };
});

const historicalPeople = original.summit.sections.flatMap(section => section.people.map(person => ({
  name: person.name, slug: `2025-${slug(person.name)}`, categories: [categories.find(category => category === section.title) ?? "Attendees"],
  role: person.role, bio: "", year: 2025 as const, image: originalAsset(person.image), messageable: false
})));
export const people2025: SummitPerson[] = [
  ...historicalPeople.filter((person, index) => historicalPeople.findIndex(other => other.name === person.name) === index && !originalProducerCredit(person.name)),
  ...originalProducerCredits.map(person => ({ name: person.name, slug: `2025-${slug(person.name)}`, categories: [person.category], role: person.role, bio: "", year: 2025 as const, messageable: false }))
];

export function directoryPeople(snapshot: EventSnapshot | null): SummitPerson[] {
  if (!snapshot) return [];
  const reviewed = publishedDirectory(snapshot);
  if (reviewed === null) return [];
  return reviewed.map(person => ({
    name: person.name, slug: person.id, role: person.role, bio: person.bio, year: 2026,
    categories: person.directoryCategories?.length ? person.directoryCategories : ["Attendees"],
    ...(person.headshotUrl ? { image: person.headshotUrl } : {})
  }));
}
