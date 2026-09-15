export const summitHighlights = [
  "Panels",
  "Awards",
  "Concerts",
  "Workshops",
  "Meditation",
  "Fitness and wellness",
  "Group discussions",
  "Philanthropy"
] as const;

export const summit2025Highlights = [
  "Panels",
  "Pitches",
  "Awards",
  "Debates",
  "Concerts",
  "Seminars",
  "Meditation",
  "Workshops",
  "VIP Dinners",
  "Philanthropy",
  "Fitness & Yoga",
  "Product Launches",
  "Group Discussions",
  "Exclusive VIP Experiences"
] as const;

export const awards = [
  ["Bold Stand to Reduce Stigma", "Courageously breaking silence and inspiring understanding around mental health."],
  ["Grassroots Leadership in Mental Health", "Recognizing community leaders who uplift others through service and mentorship."],
  ["Legacy Advocacy and Transformation", "Honoring a lifelong commitment that reshaped the conversation on mental health and human potential."],
  ["Music That Moved the World", "Honoring music that inspires healing, unity, and emotional connection."],
  ["Film or Series Changing Perception", "Celebrating storytellers who elevate awareness, empathy, and understanding."],
  ["Artist Weaving Wellness into Live Experience", "Recognizing performers who bring wellbeing and connection into live experiences."],
  ["Youth-Led Impact", "Celebrating young leaders transforming the future through creativity and action."],
  ["Breakthrough Tools or Approaches for Mental Well-Being", "Expanding access and improving outcomes through new therapies, practices, and ideas."],
  ["Public Figure Shifting Conversations on Mental Health", "Using a public platform to champion honesty, compassion, and awareness."],
  ["Clinical Excellence Award", "Redefining care through evidence-based innovation and human-centered practice."],
  ["Scientific Breakthrough Award", "Advancing our understanding of the mind, brain, and behavior."],
  ["Technology for Humanity Award", "Building tools that make mental health support more accessible and effective."],
  ["Philanthropy and Impact Award", "Fueling transformative mental health initiatives through sustained support."],
  ["Advocacy and Public Policy Award", "Creating systemic change and bringing mental health to the forefront of society."],
  ["Creative Expression Award", "Honoring art and storytelling that inspire hope, healing, and unity."],
  ["Entrepreneur of Hope Award", "Turning bold ideas into sustainable solutions for emotional and social wellbeing."],
  ["Lived Experience Award", "Turning personal journeys into understanding, compassion, and healing for others."],
  ["Legacy Award", "Recognizing a lifetime of work that reminds humanity we are not alone."]
] as const;

export type DirectoryPerson = { name: string; role: string };
export type DirectoryGroup = { title: string; people: DirectoryPerson[] };

export const summitPartners = {
  2025: {
    presentedBy: ["Villa Bibbiani"],
    poweredBy: ["Steven & Alexandra Cohen Foundation"]
  },
  2026: {
    presentedBy: [],
    poweredBy: ["Steven & Alexandra Cohen Foundation"]
  }
} as const;

function directory(entries: Array<[string, string]>): DirectoryPerson[] {
  return entries.map(([name, role]) => ({ name, role }));
}

export const summit2025Leadership: DirectoryGroup[] = [
  {
    title: "Co-Chairs",
    people: directory([
      ["Steve Wozniak", "Co-Founder of Apple & Mental Health Advocate"],
      ["Jewel", "4-Time Grammy Nominated Singer-Songwriter and Mental Health Pioneer"],
      ["Cherrial Odell", "Inspiring Children Alumna"]
    ])
  },
  { title: "Summit Host", people: directory([["Jason Kennedy", "Entertainment Journalist"]]) },
  { title: "Awards Host", people: directory([["Loni Love", "Comedian & TV Host"]]) }
];

export const summit2025Directory: DirectoryGroup[] = [
  {
    title: "Founders",
    people: directory([
      ["Jeneva Bell", "Ruggable"], ["Sorina Buri", "CAD Therapeutics"], ["Steven & Alexandra Cohen", "Philanthropists"],
      ["John Couch", "Apple Computers"], ["Jennifer Donnelly", "The Ultimate Matchmaker"], ["Pam & Duncan Goldie-Morrison", "Philanthropists"],
      ["Jewel", "Singer-Songwriter"], ["Ellie Kanner", "Friends (TV Show)"], ["Winston & Cameron Kelly", "Philanthropists"],
      ["Nick Kislinger", "Flourish Trust"], ["Melony & Adam Lewis", "BAMM Ventures"], ["Rachel Platten", "Singer-Songwriter"],
      ["Dr. George Rapier III", "WellMed"], ["Jennifer Smorgon", "Smorgon Family Foundation"], ["Melinda & Noah Springer", "Pickle Pro Labs"],
      ["Christopher Teas", "CAD Therapeutics"], ["John Tyson", "Tyson Foods"], ["Ryan Wolfington", "Inspiring Children Foundation"],
      ["Sean & Ana Wolfington", "Entrepreneurs"], ["Janet & Steve Wozniak", "Apple Computers"]
    ])
  },
  {
    title: "Musicians",
    people: directory([
      ["Alec Benjamin", "Singer-Songwriter"], ["BLÜ EYES", "Singer-Songwriter"], ["Jon Foreman", "Switchfoot"],
      ["Harry Hudson", "Singer-Songwriter"], ["Jewel", "Singer-Songwriter"], ["Silas Luke Jones", "Musician"],
      ["Darryl McDaniels", "Run DMC"], ["Jonah Marais", "Singer"], ["Nicholas Petricca", "Walk The Moon"],
      ["Cassadee Pope", "Singer-Songwriter"], ["Taylor Van Ginkel", "Guitarist / Solo Artist"], ["Zia Victoria", "Singer-Songwriter"]
    ])
  },
  {
    title: "Entertainers & Athletes",
    people: directory([
      ["Wilson Bethel", "Actor"], ["Bob & Mike Bryan", "Hall of Fame Tennis Players"], ["Jordan Doww", "Actor"],
      ["Perez Hilton", "Media Personality"], ["Jason Kennedy", "Entertainment Journalist"], ["Loni Love", "Comedian & TV Host"],
      ["Jada Pinkett Smith", "Actress & Businesswoman"], ["Estefania Saavedra", "Content Creator"], ["Mike Tyson", "Hall of Fame Boxer"],
      ["Tallulah Willis", "Actress & Advocate"]
    ])
  },
  {
    title: "Experts",
    people: directory([
      ["Blaise Aguirre, MD", "McLean Psych Hospital"], ["Paul Dalio", "Filmmaker, Author, Musician"], ["David Eagleman, PhD", "Neuroscientist & Inventor"],
      ["Jon Hershfield, MFT", "OCD Specialist"], ["Kelsey J. Patel", "Wellness Expert"], ["Casey Mock", "Technology Policy Advocate & Writer"],
      ["Lyn Morris, LMFT", "Didi Hirsch"], ["Bennett Nemser, PhD", "Steven & Alexandra Cohen Foundation"], ["Tasha Rasolkhani-Kalhorn, PhD", "Family Care Center"],
      ["Crystal Romero", "Army National Guard"], ["Ron Biscardi", "iConnections"], ["Karena Dawn", "Tone It Up"],
      ["Sophie Grégoire Trudeau", "Best-Selling Author"], ["Kevin Hines", "Suicide Prevention Speaker"], ["David Hirsch", "Philanthropist"],
      ["Blake Mycoskie", "TOMS"], ["Bozoma Saint John", "Hall of Fame CMO"]
    ])
  },
  {
    title: "Business Leaders & Philanthropists",
    people: []
  },
  {
    title: "ICF Alumni",
    people: ["Sara Alajbegovic", "Cole Brashear", "Katrina Sta Cruz", "Miles Jackson", "Mario Aguayo Oropeza", "Natasha Scott", "Selena Williams"]
      .map((name) => ({ name, role: "ICF Alum" }))
  },
  {
    title: "Executive Producers",
    people: [
      { name: "Jewel", role: "Grammy Nominated Singer-Songwriter" },
      { name: "Ryan Wolfington", role: "Founder, Inspiring Children Foundation" },
      { name: "Trevor Short", role: "Founder, Inspiring Dreams" },
      { name: "Dr. George Rapier III", role: "Founder of WellMed & The Not Alone Dinner Series" }
    ]
  },
  {
    title: "Producers",
    people: [
      { name: "Trent Alenik", role: "CEO, Inspiring Children Foundation" },
      { name: "Aphrah Brokaw", role: "Music Manager, Jewel Inc." }
    ]
  }
];

export const awards2025Directory: DirectoryGroup[] = [
  {
    title: "Founders",
    people: directory([
      ["Jeneva Bell", "Ruggable"], ["Alex Cohen", "Steven & Alexandra Cohen Foundation"], ["John Couch", "Apple Computers"],
      ["Jewel", "Singer-Songwriter"], ["Ellie Kanner", "Friends (TV Show)"], ["Winston & Cameron Kelly", "Philanthropists"],
      ["Nick Kislinger", "Flourish Trust"], ["Melony & Adam Lewis", "BAMM Ventures"], ["Rachel Platten", "Singer-Songwriter"],
      ["Dr. George Rapier III", "WellMed"], ["Jennifer Smorgon", "Smorgon Family Foundation"], ["Melinda & Noah Springer", "Pickle Pro Labs"],
      ["Christopher Teas", "CAD Therapeutics"], ["John Tyson", "Tyson Foods"], ["Ryan Wolfington", "Inspiring Children Foundation"],
      ["Sean & Ana Wolfington", "Entrepreneurs"], ["Janet & Steve Wozniak", "Apple Computers"]
    ])
  },
  {
    title: "Musicians",
    people: directory([
      ["Alec Benjamin", "Singer-Songwriter"], ["Bishop Briggs", "Singer-Songwriter"], ["Sheila E.", "Singer-Songwriter"],
      ["BLÜ EYES", "Singer-Songwriter"], ["Flavor Flav", "Rock and Roll Hall of Fame Inductee and Grammy Lifetime Achievement Recipient"], ["Jon Foreman", "Switchfoot"],
      ["Harry Hudson", "Singer-Songwriter"], ["Jewel", "Singer-Songwriter"], ["Silas Luke Jones", "Musician"],
      ["Gavin Magnus", "Singer & Content Creator"], ["Jonah Marais", "Singer"], ["Darryl McDaniels", "Run DMC"],
      ["Nicholas Petricca", "Walk The Moon"], ["Rachel Platten", "Singer-Songwriter"], ["Cassadee Pope", "Singer-Songwriter"],
      ["JP Saxe", "Singer-Songwriter"], ["Zia Victoria", "Singer-Songwriter"]
    ])
  },
  {
    title: "Entertainers & Athletes",
    people: directory([
      ["Kevin Anderson", "Former Pro Tennis Player"], ["Bob & Mike Bryan", "Hall of Fame Tennis Players"], ["Chevy Chase", "Actor"],
      ["Jordan Doww", "Actor"], ["Sarah Gilman", "Actress"], ["Perez Hilton", "Media Personality"],
      ["Jason Kennedy", "Entertainment Journalist"], ["Loni Love", "Comedian & TV Host"], ["Jada Pinkett Smith", "Actress & Businesswoman"],
      ["Estefania Saavedra", "Content Creator"], ["Mike Tyson", "Hall of Fame Boxer"], ["Tallulah Willis", "Actress & Advocate"], ["Wilson Bethel", "Actor"]
    ])
  },
  {
    title: "Experts",
    people: directory([
      ["Blaise Aguirre, MD", "McLean Psych Hospital"], ["Marc Brackett, PhD", "Yale"], ["Paul Dalio", "Lived Experience Expert"],
      ["David Eagleman, PhD", "Neuroscientist & Inventor"], ["Jon Hershfield, MFT", "OCD Specialist"], ["Nicole Kalhorn", "Wise Friend"],
      ["Casey Mock", "Technology Policy Advocate & Writer"], ["Lyn Morris, LMFT", "Didi Hirsch"], ["Bennett Nemser, PhD", "Steven & Alexandra Cohen Foundation"],
      ["Wendy Oliver-Pyatt, MD, FAED, CEDS", "Eating Disorder Expert"], ["Kelsey J. Patel", "Wellness Expert"], ["Tasha Rasolkhani-Kalhorn, PhD", "Family Care Center"],
      ["Crystal Romero", "Army National Guard"], ["The Drug in Our Pocket", "Documentary"], ["Jaymes Black", "Trevor Project"],
      ["Ron Biscardi", "iConnections"], ["Matt Broms", "Philanthropist"], ["Karena Dawn", "Tone It Up"],
      ["Daniel H. Gillison, Jr.", "NAMI"], ["Sophie Grégoire", "Former Canadian First Lady"], ["Kevin Hines", "Suicide Prevention Speaker"],
      ["David Hirsch", "Philanthropist"], ["Heather Kahlert", "Kahlert Foundation"], ["Mike Majlak", "Impaulsive Podcast"],
      ["Blake Mycoskie", "TOMS"], ["Bozoma Saint John", "Hall of Fame CMO"], ["Kasey Thompson", "Entrepreneur"]
    ])
  }
];

// Populated only from Airtable records whose 2026 status is explicitly Confirmed.
export const confirmed2026People: DirectoryGroup[] = [];
