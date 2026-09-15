export type AwardsYear = 2025 | 2026;

export const awardCategories = [
  ["Bold Stand to Reduce Stigma", "Recognizing those who courageously break silence, challenge stereotypes, and inspire understanding around mental health."],
  ["Grassroots Leadership in Mental Health", "Celebrating local and community-driven leaders who uplift others through service, mentorship, and impact."],
  ["Legacy Advocacy and Transformation", "Honoring those whose lifelong commitment has reshaped the conversation on mental health and human potential."],
  ["Music That Moved the World", "For musicians whose songs have inspired healing, unity, and emotional connection across generations."],
  ["Film or Series Changing Perception", "Celebrating filmmakers and storytellers who elevate awareness, empathy, and understanding through powerful narratives."],
  ["Artist Weaving Wellness into Live Experience", "Honoring performers who infuse concerts, events, or installations with messages of well-being and connection."],
  ["Youth-Led Impact", "Recognizing young leaders transforming the future of mental health through creativity, courage, and action."],
  ["Breakthrough Tools or Approaches for Mental Well-Being", "Celebrating innovative technologies, therapies, or practices that expand access and improve outcomes."],
  ["Public Figure Shifting Conversations on Mental Health", "For leaders using their platforms to champion honesty, compassion, and awareness."],
  ["Clinical Excellence Award", "For professionals redefining care through evidence-based innovation and human-centered practice."],
  ["Scientific Breakthrough Award", "Honoring researchers advancing our understanding of the mind, brain, and behavior."],
  ["Technology for Humanity Award", "Recognizing innovators developing tools that make mental health support more accessible and effective."],
  ["Philanthropy and Impact Award", "Celebrating those funding, supporting, and fueling transformative mental health initiatives."],
  ["Advocacy and Public Policy Award", "For leaders creating systemic change and bringing mental health to the forefront of society."],
  ["Creative Expression Award", "Honoring artists, musicians, and storytellers whose work inspires hope, healing, and unity."],
  ["Entrepreneur of Hope Award", "Recognizing innovators turning bold ideas into sustainable solutions for emotional and social well-being."],
  ["Lived Experience Award", "Celebrating individuals whose personal journeys bring greater understanding, compassion, and healing to others."],
  ["Legacy Award", "Honoring those whose vision and lifetime contributions have redefined what it means to be Not Alone."]
] as const;

type RosterEntry = { name: string; role: string };
const founders: RosterEntry[] = [
  { name: "Jeneva Bell", role: "Ruggable" }, { name: "Alex Cohen", role: "Steven & Alexandra Cohen Foundation" },
  { name: "John Couch", role: "Apple Computers" }, { name: "Jewel", role: "Singer-Songwriter" },
  { name: "Ellie Kanner", role: "Friends (TV Show)" }, { name: "Cameron & Winston Kelly", role: "Philanthropists" },
  { name: "Nick Kislinger", role: "Flourish Trust" }, { name: "Melony & Adam Lewis", role: "BAMM Ventures" },
  { name: "Rachel Platten", role: "Singer-Songwriter" }, { name: "Dr. George Rapier III", role: "WellMed" },
  { name: "Jennifer Smorgon", role: "Smorgon Family Foundation" }, { name: "Melinda & Noah Springer", role: "Pickle Pro Labs" },
  { name: "Christopher Teas", role: "CAD Therapeutics" }, { name: "John Tyson", role: "Tyson Foods" },
  { name: "Ryan Wolfington", role: "Inspiring Children Foundation" }, { name: "Sean & Ana Wolfington", role: "Entrepreneurs" },
  { name: "Steve & Janet Wozniak", role: "Apple Computers" }
];
const musicians: RosterEntry[] = [
  { name: "Alec Benjamin", role: "Singer-Songwriter" }, { name: "Bishop Briggs", role: "Singer-Songwriter" },
  { name: "Sheila E.", role: "Singer-Songwriter" }, { name: "BLÜ EYES", role: "Singer-Songwriter" },
  { name: "Flavor Flav", role: "Rock and Roll Hall of Fame Inductee" }, { name: "Jon Foreman", role: "Switchfoot" },
  { name: "Harry Hudson", role: "Singer-Songwriter" }, { name: "Jewel", role: "Singer-Songwriter" },
  { name: "Caroline Jones", role: "Singer-Songwriter" }, { name: "Silas Luke Jones", role: "Musician" },
  { name: "Gavin Magnus", role: "Singer & Content Creator" }, { name: "Jonah Marais", role: "Singer" },
  { name: "Darryl McDaniels", role: "Run DMC" }, { name: "Nicholas Petricca", role: "Walk The Moon" },
  { name: "Cassadee Pope", role: "Singer-Songwriter" }, { name: "JP Saxe", role: "Singer-Songwriter" },
  { name: "Zia Victoria", role: "Singer-Songwriter" }
];
const entertainers: RosterEntry[] = [
  { name: "Kevin Anderson", role: "Former Pro Tennis Player" }, { name: "Bob & Mike Bryan", role: "Hall of Fame Tennis Players" },
  { name: "Chevy Chase", role: "Actor" }, { name: "Jordan Doww", role: "Actor" }, { name: "Sarah Gilman", role: "Actress" },
  { name: "Perez Hilton", role: "Media Personality" }, { name: "Jason Kennedy", role: "Entertainment Journalist" },
  { name: "Loni Love", role: "Comedian & TV Host" }, { name: "Jada Pinkett Smith", role: "Actress & Businesswoman" },
  { name: "Estefania Saavedra", role: "Content Creator" }, { name: "Mike Majlak", role: "Entertainer & Podcast Host" },
  { name: "Mike Tyson", role: "Hall of Fame Boxer" }, { name: "Tallulah Willis", role: "Actress & Advocate" },
  { name: "Wilson Bethel", role: "Actor" }
];
const experts: RosterEntry[] = [
  { name: "Blaise Aguirre", role: "McLean Psychiatric Hospital" }, { name: "Marc Brackett", role: "Yale" },
  { name: "Paul Dalio", role: "Lived Experience Expert" }, { name: "David Eagleman", role: "Neuroscientist & Inventor" },
  { name: "Jon Hershfield", role: "OCD Specialist" }, { name: "Wendy Oliver-Pyatt", role: "Eating Disorder Expert" },
  { name: "Daniel Gillison", role: "NAMI" }, { name: "Kevin Hines", role: "Suicide Prevention Speaker" },
  { name: "Blake Mycoskie", role: "TOMS" }
];
const excludedIn2026 = new Set(["Rachel Platten", "Dr. George Rapier III", "Christopher Teas", "John Tyson", "Flavor Flav"]);

export function awardsRoster(year: AwardsYear) {
  const filter = (entries: RosterEntry[]) => year === 2026 ? entries.filter((entry) => !excludedIn2026.has(entry.name)) : entries;
  return { Founders: filter(founders), Musicians: filter(musicians), "Entertainers & Athletes": filter(entertainers), Experts: filter(experts) };
}
