import source from "./original-sites.json";
import { originalAsset } from "./original-assets";

export function personNameKey(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(dr|md|phd|mft|lmft|faed|ceds|jr|iii|dmc)\b\.?/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

const portraits = new Map<string, string>();
for (const site of [source.summit, source.awards]) {
  for (const section of site.sections) {
    for (const person of section.people) {
      const key = personNameKey(person.name);
      if (!portraits.has(key)) portraits.set(key, originalAsset(person.image));
    }
  }
}

// Leadership photos are parallel to the named h4 blocks in the captured source.
for (const index of [4, 13]) {
  const section = source.summit.sections[index]!;
  section.blocks.filter(block => block.tag === "h4").forEach((block, position) => {
    const image = section.images[position];
    if (image) portraits.set(personNameKey(block.text), originalAsset(image.src));
  });
}

const portraitAliases: Record<string, string> = {
  "alexandra cohen": "alex cohen",
  "daniel gillison": "daniel h gillison",
  "jen smorgen": "jennifer smorgon",
  "jennifer smorgon": "jennifer smorgon",
  "jewel murray": "jewel"
};

// Read-only 2026 Airtable attachments, reviewed September 16. Local copies do
// not expire with Airtable's signed attachment URLs; published URLs still win.
const currentPortraits = new Map([
  ["wendy oliver pyatt", "/2026-headshots/wendy-oliver-pyatt.jpg"],
  ["jon hershfield", "/2026-headshots/jon-hershfield.jpg"],
  ["steve wozniak", "/2026-headshots/steve-wozniak.jpg"],
  ["blaise aguirre", "/2026-headshots/blaise-aguirre.jpg"]
]);

export function personPortrait(name: string): string | undefined {
  const key = personNameKey(name);
  return currentPortraits.get(key) ?? portraits.get(portraitAliases[key] ?? key);
}

export function personInitials(name: string): string {
  const parts = name.replace(/\([^)]*\)/g, "").replace(/^Dr\.\s*/i, "").trim().split(/\s+/);
  return [parts[0]?.[0], parts.length > 1 ? parts.at(-1)?.[0] : ""].join("").toUpperCase();
}
