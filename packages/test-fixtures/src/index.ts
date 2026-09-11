import { eventSnapshotSchema, type EventSnapshot, type ScheduleItem } from "@not-alone/validation";

const eventId = "not-alone-summit-2026-prototype";
const timeZone = "America/Los_Angeles";
const revision = 2;
const publishedAt = "2026-09-07T16:00:00.000Z";

const locationIds = {
  registration: "20000000-0000-4000-8000-000000000001",
  wisdomForum: "20000000-0000-4000-8000-000000000002",
  wellnessZoneOne: "20000000-0000-4000-8000-000000000003",
  wellnessZoneTwo: "20000000-0000-4000-8000-000000000004",
  nourishRoom: "20000000-0000-4000-8000-000000000005",
  giftingSuite: "20000000-0000-4000-8000-000000000006",
  swSteakhouse: "20000000-0000-4000-8000-000000000007",
  boaSteakhouse: "20000000-0000-4000-8000-000000000008",
  laTache: "20000000-0000-4000-8000-000000000009"
} as const;

const speakerIds = {
  jewel: "30000000-0000-4000-8000-000000000001",
  harryHudson: "30000000-0000-4000-8000-000000000002",
  yvette: "30000000-0000-4000-8000-000000000003",
  wade: "30000000-0000-4000-8000-000000000004",
  kelseyPatel: "30000000-0000-4000-8000-000000000005",
  tallulahWillis: "30000000-0000-4000-8000-000000000006",
  bryanBrothers: "30000000-0000-4000-8000-000000000007",
  rachelPlatten: "30000000-0000-4000-8000-000000000008",
  hostTeam: "30000000-0000-4000-8000-000000000009",
  wellnessTeam: "30000000-0000-4000-8000-000000000010"
} as const;

type PrototypeSession = {
  id: string;
  title: string;
  shortTitle: string;
  summary: string;
  day: 2 | 3 | 4;
  start: string;
  end: string;
  locationId: (typeof locationIds)[keyof typeof locationIds];
  locationName: string;
  speakerIds?: string[];
  audience?: "public" | "founders" | "community";
  featured?: boolean;
  offsets?: number[];
};

export const demoSnapshot: EventSnapshot = eventSnapshotSchema.parse({
  event: {
    id: eventId,
    name: "Not Alone Summit",
    organizationName: "Inspiring Children Foundation",
    timeZone,
    dateLabel: "November 2-4, 2026",
    venueName: "Wynn Las Vegas",
    city: "Las Vegas, Nevada",
    positioning:
      "A thoughtfully curated gathering centered on human connection, emotional wellbeing, and meaningful action. Schedule details will continue to evolve as programming is confirmed.",
    presentedBy: "Villa Bibbiani",
    poweredBy: "Steven & Alexandra Cohen Foundation",
    tracks: [
      "Main Stage",
      "Awards",
      "Concerts",
      "Meditation",
      "Workshops",
      "Wellness",
      "Founder Events",
      "Community Day"
    ],
    featuredPeople: [
      {
        name: "Jewel",
        role: "Singer-songwriter and mental health advocate",
        group: "Featured Artist"
      },
      {
        name: "Harry Hudson",
        role: "Artist and advocate",
        group: "Featured Performer"
      },
      {
        name: "Tallulah Willis",
        role: "Artist and mental health advocate",
        group: "Workshop Guest"
      },
      {
        name: "The Bryan Brothers",
        role: "Tennis champions and wellness guests",
        group: "Community Day"
      },
      {
        name: "Rachel Platten",
        role: "Singer-songwriter",
        group: "Closing Dinner Performer"
      }
    ],
    demo: false
  },
  revision,
  serverTimeUtc: "2026-09-07T16:00:00.000Z",
  locations: [
    {
      id: locationIds.registration,
      eventId,
      name: "Registration Desk",
      description: "Guest check-in, credential support, schedule help, and wayfinding.",
      mapX: 0.2,
      mapY: 0.28
    },
    {
      id: locationIds.wisdomForum,
      eventId,
      name: "Margaux - Wisdom Forum",
      description: "Main room for summit programming, panels, performances, and award moments.",
      mapX: 0.5,
      mapY: 0.24
    },
    {
      id: locationIds.wellnessZoneOne,
      eventId,
      name: "Lafleur - Wellness Room Zone 1",
      description: "Movement, pilates, mindful fitness, meditation, and reset programming.",
      mapX: 0.26,
      mapY: 0.58
    },
    {
      id: locationIds.wellnessZoneTwo,
      eventId,
      name: "Pomerol - Wellness Room Zone 2",
      description: "Pickleball, sauna, cold plunge, games, and community wellness activation.",
      mapX: 0.68,
      mapY: 0.6
    },
    {
      id: locationIds.nourishRoom,
      eventId,
      name: "Mouton 2 - Nourish Room",
      description: "Lunch, dinner, life-plan workshops, and quieter conversation spaces.",
      mapX: 0.46,
      mapY: 0.72
    },
    {
      id: locationIds.giftingSuite,
      eventId,
      name: "Mouton 1 - Gifting Suite",
      description: "Attendee gifting, speaker hospitality, and event support.",
      mapX: 0.36,
      mapY: 0.72
    },
    {
      id: locationIds.swSteakhouse,
      eventId,
      name: "SW Steakhouse",
      description: "Hosted dining location for designated summit gatherings.",
      mapX: 0.72,
      mapY: 0.82
    },
    {
      id: locationIds.boaSteakhouse,
      eventId,
      name: "BOA Steakhouse",
      description: "Off-site location listed for closing dinner and music programming.",
      mapX: 0.8,
      mapY: 0.88
    },
    {
      id: locationIds.laTache,
      eventId,
      name: "La Tache",
      description: "Arrival and hospitality area for awards programming.",
      mapX: 0.6,
      mapY: 0.42
    }
  ],
  scheduleItems: createPrototypeSchedule(),
  speakers: [
    { id: speakerIds.jewel, eventId, name: "Jewel", role: "Singer-songwriter and mental health advocate", bio: "Artist, author, and advocate supporting practical tools for emotional wellbeing.", headshotUrl: null, published: true },
    { id: speakerIds.harryHudson, eventId, name: "Harry Hudson", role: "Artist and advocate", bio: "Artist and advocate using storytelling and community to support young people.", headshotUrl: null, published: true },
    { id: speakerIds.yvette, eventId, name: "Yvette Noel-Schure", role: "Communications leader", bio: "Communications leader and summit guest.", headshotUrl: null, published: true },
    { id: speakerIds.wade, eventId, name: "Dwyane Wade", role: "Entrepreneur and philanthropist", bio: "Athlete, entrepreneur, and philanthropist focused on community impact.", headshotUrl: null, published: true },
    { id: speakerIds.kelseyPatel, eventId, name: "Kelsey J. Patel", role: "Wellness expert", bio: "Wellness expert and facilitator.", headshotUrl: null, published: true },
    { id: speakerIds.tallulahWillis, eventId, name: "Tallulah Willis", role: "Artist and mental health advocate", bio: "Artist and advocate sharing honest conversations about wellbeing.", headshotUrl: null, published: true },
    { id: speakerIds.bryanBrothers, eventId, name: "The Bryan Brothers", role: "Tennis champions and wellness guests", bio: "Champions and community wellness guests.", headshotUrl: null, published: true },
    { id: speakerIds.rachelPlatten, eventId, name: "Rachel Platten", role: "Singer-songwriter", bio: "Singer-songwriter and closing dinner performer.", headshotUrl: null, published: true },
    { id: speakerIds.hostTeam, eventId, name: "Summit Host Team", role: "Event hosts", bio: "The Not Alone Summit host team.", headshotUrl: null, published: true },
    { id: speakerIds.wellnessTeam, eventId, name: "Summit Wellness Team", role: "Wellness facilitators", bio: "Facilitators supporting movement, mindfulness, and restoration throughout the summit.", headshotUrl: null, published: true }
  ],
  faqs: [
    { id: "60000000-0000-4000-8000-000000000001", question: "Where can I get schedule help?", answer: "Visit the Registration Desk for schedule support, credentials, and wayfinding.", category: "Event help", published: true },
    { id: "60000000-0000-4000-8000-000000000002", question: "Can the schedule change?", answer: "Yes. The attendee app reflects the latest schedule published by the event team.", category: "Schedule", published: true }
  ],
  sponsors: [
    { id: "70000000-0000-4000-8000-000000000001", name: "Villa Bibbiani", tier: "Presented by", websiteUrl: null, logoUrl: null, published: true },
    { id: "70000000-0000-4000-8000-000000000002", name: "Steven & Alexandra Cohen Foundation", tier: "Powered by", websiteUrl: null, logoUrl: null, published: true }
  ],
  media: [],
  notices: [],
  contentPages: [
    {
      id: "40000000-0000-4000-8000-000000000001",
      slug: "schedule-note",
      title: "Schedule Note",
      body:
        "The current agenda is provided for planning and will be updated as 2026 programming, rooms, and appearances are confirmed.",
      published: true,
      revision
    },
    {
      id: "40000000-0000-4000-8000-000000000002",
      slug: "venue-room-guide",
      title: "Venue Room Guide",
      body:
        "Margaux is the Wisdom Forum main stage. Lafleur and Pomerol are wellness zones. Mouton 2 is the Nourish Room. Registration is the primary help and wayfinding point.",
      published: true,
      revision
    },
    {
      id: "40000000-0000-4000-8000-000000000003",
      slug: "inspiring-children-foundation",
      title: "Inspiring Children Foundation",
      body:
        "Inspiring Children Foundation supports young people in Las Vegas through programs that connect physical health, emotional wellbeing, academics, athletics, creativity, entrepreneurship, and service.",
      published: true,
      revision
    }
  ]
});

function createPrototypeSchedule(): ScheduleItem[] {
  const sessions: PrototypeSession[] = [
    {
      id: "50000000-0000-4000-8000-000000000001",
      day: 2,
      start: "1:00 PM",
      end: "7:00 PM",
      title: "Registration, Gifting Suite, and Wellness Rooms Open",
      shortTitle: "Doors Open",
      summary: "Check in, explore gifting, and ease into the summit wellness spaces.",
      locationId: locationIds.registration,
      locationName: "Registration Desk",
      speakerIds: [speakerIds.hostTeam],
      featured: true,
      offsets: [60, 15]
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      day: 2,
      start: "1:00 PM",
      end: "1:45 PM",
      title: "Pilates Class",
      shortTitle: "Pilates",
      summary: "A grounding movement session to begin the afternoon.",
      locationId: locationIds.wellnessZoneOne,
      locationName: "Lafleur - Wellness Room Zone 1",
      speakerIds: [speakerIds.yvette],
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000003",
      day: 2,
      start: "2:00 PM",
      end: "2:45 PM",
      title: "Circuit Training",
      shortTitle: "Circuit Training",
      summary: "A high-energy fitness block adapted from the prior summit wellness programming.",
      locationId: locationIds.wellnessZoneOne,
      locationName: "Lafleur - Wellness Room Zone 1",
      speakerIds: [speakerIds.wade],
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000004",
      day: 2,
      start: "4:00 PM",
      end: "4:30 PM",
      title: "Meditation and Stretching",
      shortTitle: "Meditation",
      summary: "A short reset session before evening founder and main-stage programming.",
      locationId: locationIds.wellnessZoneOne,
      locationName: "Lafleur - Wellness Room Zone 1",
      speakerIds: [speakerIds.wellnessTeam],
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000005",
      day: 2,
      start: "5:00 PM",
      end: "5:30 PM",
      title: "Founder Cocktails",
      shortTitle: "Cocktails",
      summary: "A founder-only welcome moment before dinner.",
      locationId: locationIds.swSteakhouse,
      locationName: "Outside SW Steakhouse",
      audience: "founders",
      featured: true,
      offsets: [30, 10]
    },
    {
      id: "50000000-0000-4000-8000-000000000006",
      day: 2,
      start: "5:30 PM",
      end: "7:30 PM",
      title: "Founder's Dinner",
      shortTitle: "Founder Dinner",
      summary: "A founder-only dinner adapted from the prior summit timeline.",
      locationId: locationIds.swSteakhouse,
      locationName: "SW Steakhouse",
      audience: "founders",
      featured: true,
      offsets: [60, 15]
    },
    {
      id: "50000000-0000-4000-8000-000000000007",
      day: 2,
      start: "7:00 PM",
      end: "8:00 PM",
      title: "Wisdom Forum Doors Open",
      shortTitle: "Forum Doors",
      summary: "Guests enter the main room, gather, and take seats before opening night begins.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      speakerIds: [speakerIds.hostTeam],
      featured: true,
      offsets: [30, 10]
    },
    {
      id: "50000000-0000-4000-8000-000000000008",
      day: 2,
      start: "8:00 PM",
      end: "8:10 PM",
      title: "Opening Night Intro",
      shortTitle: "Opening Intro",
      summary: "The summit opens with a concise welcome into the evening program.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      speakerIds: [speakerIds.hostTeam],
      featured: true,
      offsets: [10]
    },
    {
      id: "50000000-0000-4000-8000-000000000009",
      day: 2,
      start: "8:10 PM",
      end: "8:20 PM",
      title: "Harry Hudson Performance",
      shortTitle: "Harry Hudson",
      summary: "A short opening-night music performance.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      speakerIds: [speakerIds.harryHudson],
      featured: true,
      offsets: [10]
    },
    {
      id: "50000000-0000-4000-8000-000000000010",
      day: 2,
      start: "8:25 PM",
      end: "9:10 PM",
      title: "Jewel Performance",
      shortTitle: "Jewel",
      summary: "A main-stage music moment inspired by the prior summit program.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      speakerIds: [speakerIds.jewel],
      featured: true,
      offsets: [30, 10]
    },
    {
      id: "50000000-0000-4000-8000-000000000011",
      day: 2,
      start: "9:30 PM",
      end: "11:00 PM",
      title: "Late Night Pickleball and Sauna",
      shortTitle: "Late Night Wellness",
      summary: "A casual late-night wellness and connection block.",
      locationId: locationIds.wellnessZoneTwo,
      locationName: "Pomerol - Wellness Room Zone 2",
      speakerIds: [speakerIds.wellnessTeam],
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000012",
      day: 3,
      start: "7:00 AM",
      end: "8:00 AM",
      title: "Pickleball Clinic with a Pro",
      shortTitle: "Pickleball Clinic",
      summary: "Morning play and instruction in the wellness zone.",
      locationId: locationIds.wellnessZoneTwo,
      locationName: "Pomerol Patio East - Wellness Room Zone 2",
      speakerIds: [speakerIds.wellnessTeam],
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000013",
      day: 3,
      start: "7:30 AM",
      end: "8:00 AM",
      title: "Reformer Pilates",
      shortTitle: "Pilates",
      summary: "A short morning pilates session.",
      locationId: locationIds.wellnessZoneOne,
      locationName: "Lafleur - Wellness Room Zone 1",
      speakerIds: [speakerIds.yvette],
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000014",
      day: 3,
      start: "8:00 AM",
      end: "8:30 AM",
      title: "Morning Breathwork",
      shortTitle: "Breathwork",
      summary: "A guided breathwork session to begin the day with focus and calm.",
      locationId: locationIds.nourishRoom,
      locationName: "Mouton 2 - Nourish Room",
      speakerIds: [speakerIds.wellnessTeam],
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000015",
      day: 3,
      start: "8:00 AM",
      end: "8:30 AM",
      title: "Guided Meditation",
      shortTitle: "Meditation",
      summary: "A quiet guided meditation adapted from the prior summit wellness block.",
      locationId: locationIds.wellnessZoneOne,
      locationName: "Lafleur Patio",
      speakerIds: [speakerIds.kelseyPatel],
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000016",
      day: 3,
      start: "8:30 AM",
      end: "9:00 AM",
      title: "Art and Healing",
      shortTitle: "Art and Healing",
      summary: "A creative wellness conversation inspired by the prior summit schedule.",
      locationId: locationIds.nourishRoom,
      locationName: "Mouton 2 - Nourish Room",
      speakerIds: [speakerIds.tallulahWillis],
      featured: true,
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000017",
      day: 3,
      start: "9:30 AM",
      end: "9:45 AM",
      title: "Wisdom Forum Doors Open",
      shortTitle: "Forum Doors",
      summary: "Guests enter the main room before morning programming begins.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000018",
      day: 3,
      start: "9:45 AM",
      end: "10:00 AM",
      title: "Opening Performance",
      shortTitle: "Opening Performance",
      summary: "A short performance and opening sequence before the main panels.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      featured: true,
      offsets: [10]
    },
    {
      id: "50000000-0000-4000-8000-000000000019",
      day: 3,
      start: "10:00 AM",
      end: "12:30 PM",
      title: "Morning Panel Sessions",
      shortTitle: "Morning Panels",
      summary: "Main-stage conversations on mental health, purpose, resilience, and lived experience.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      featured: true,
      offsets: [60, 15]
    },
    {
      id: "50000000-0000-4000-8000-000000000020",
      day: 3,
      start: "12:30 PM",
      end: "1:30 PM",
      title: "Lunch",
      shortTitle: "Lunch",
      summary: "A buffet-style lunch and conversation break.",
      locationId: locationIds.wellnessZoneOne,
      locationName: "Lafleur Patio",
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000021",
      day: 3,
      start: "1:45 PM",
      end: "4:00 PM",
      title: "Afternoon Panel Sessions",
      shortTitle: "Afternoon Panels",
      summary: "Main-stage conversations continuing the summit themes of wellness, connection, and action.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      featured: true,
      offsets: [30, 10]
    },
    {
      id: "50000000-0000-4000-8000-000000000022",
      day: 3,
      start: "5:45 PM",
      end: "7:15 PM",
      title: "Dinner in the Nourish Room",
      shortTitle: "Nourish Dinner",
      summary: "A hosted dinner moment before the Not Alone Awards evening.",
      locationId: locationIds.nourishRoom,
      locationName: "Mouton 2 - Nourish Room",
      offsets: [30]
    },
    {
      id: "50000000-0000-4000-8000-000000000023",
      day: 3,
      start: "7:00 PM",
      end: "7:45 PM",
      title: "Not Alone Awards Red Carpet",
      shortTitle: "Red Carpet",
      summary: "Arrival, photos, and pre-show gathering for the Not Alone Awards.",
      locationId: locationIds.laTache,
      locationName: "Registration Area / La Tache",
      featured: true,
      offsets: [30, 10]
    },
    {
      id: "50000000-0000-4000-8000-000000000024",
      day: 3,
      start: "7:30 PM",
      end: "7:55 PM",
      title: "Awards Preshow Act",
      shortTitle: "Preshow",
      summary: "A short preshow before the Not Alone Awards begin.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      offsets: [10]
    },
    {
      id: "50000000-0000-4000-8000-000000000025",
      day: 3,
      start: "8:00 PM",
      end: "10:00 PM",
      title: "Not Alone Awards",
      shortTitle: "Awards",
      summary: "An evening celebration of impact, storytelling, and mental health leadership.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      featured: true,
      offsets: [60, 15]
    },
    {
      id: "50000000-0000-4000-8000-000000000026",
      day: 4,
      start: "7:00 AM",
      end: "8:00 AM",
      title: "Community Day Pickleball Clinic",
      shortTitle: "Pickleball",
      summary: "A morning pickleball session designed for movement, play, and community.",
      locationId: locationIds.wellnessZoneTwo,
      locationName: "Pomerol - Wellness Room Zone 2",
      speakerIds: [speakerIds.bryanBrothers],
      audience: "community",
      featured: true,
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000027",
      day: 4,
      start: "8:00 AM",
      end: "9:00 AM",
      title: "Life Plan Workshop",
      shortTitle: "Life Plan",
      summary: "A reflective workshop using life-plan prompts and guided conversation.",
      locationId: locationIds.nourishRoom,
      locationName: "Mouton 2 Patio",
      audience: "community",
      featured: true,
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000028",
      day: 4,
      start: "8:00 AM",
      end: "8:30 AM",
      title: "DBT: The Ultimate Parenting Tool",
      shortTitle: "DBT Workshop",
      summary: "A practical morning workshop inspired by the prior summit Community Day.",
      locationId: locationIds.nourishRoom,
      locationName: "Mouton 2 - Nourish Room",
      audience: "community",
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000029",
      day: 4,
      start: "8:30 AM",
      end: "9:00 AM",
      title: "The Power of Emotional Intelligence",
      shortTitle: "Emotional Intelligence",
      summary: "A practical workshop on turning emotional insight into meaningful action.",
      locationId: locationIds.nourishRoom,
      locationName: "Mouton 2 - Nourish Room",
      audience: "community",
      featured: true,
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000030",
      day: 4,
      start: "10:00 AM",
      end: "12:30 PM",
      title: "Community Day Morning Panel Sessions",
      shortTitle: "Community Panels",
      summary: "Main-stage morning programming adapted from the prior summit schedule.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      audience: "community",
      featured: true,
      offsets: [60, 15]
    },
    {
      id: "50000000-0000-4000-8000-000000000031",
      day: 4,
      start: "12:30 PM",
      end: "1:30 PM",
      title: "Community Day Lunch",
      shortTitle: "Lunch",
      summary: "A hosted lunch break in the Nourish Room.",
      locationId: locationIds.nourishRoom,
      locationName: "Mouton 2 - Nourish Room",
      audience: "community",
      offsets: [15]
    },
    {
      id: "50000000-0000-4000-8000-000000000032",
      day: 4,
      start: "1:45 PM",
      end: "4:00 PM",
      title: "Community Day Afternoon Panel Sessions",
      shortTitle: "Afternoon Panels",
      summary: "Afternoon main-stage conversations for the Community Day program.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      audience: "community",
      featured: true,
      offsets: [30, 10]
    },
    {
      id: "50000000-0000-4000-8000-000000000033",
      day: 4,
      start: "4:00 PM",
      end: "4:25 PM",
      title: "Mindfulness and Music by Jewel",
      shortTitle: "Mindfulness Music",
      summary: "A closing main-stage mindfulness and music moment.",
      locationId: locationIds.wisdomForum,
      locationName: "Margaux - Wisdom Forum",
      speakerIds: [speakerIds.jewel],
      audience: "community",
      featured: true,
      offsets: [30, 10]
    },
    {
      id: "50000000-0000-4000-8000-000000000034",
      day: 4,
      start: "6:30 PM",
      end: "10:00 PM",
      title: "Closing Dinner and Rachel Platten Concert",
      shortTitle: "Closing Dinner",
      summary: "A closing dinner and concert adapted from the prior summit timeline.",
      locationId: locationIds.boaSteakhouse,
      locationName: "BOA Steakhouse",
      speakerIds: [speakerIds.rachelPlatten],
      featured: true,
      offsets: [60, 15]
    }
  ];

  return sessions.map((session, index) => createScheduleItem(session, index));
}

function createScheduleItem(session: PrototypeSession, index: number): ScheduleItem {
  const audience = getAudienceScope(session.audience ?? "public");

  return {
    id: session.id,
    eventId,
    title: session.title,
    shortTitle: session.shortTitle,
    summary: session.summary,
    description: `${session.summary} Program details may change as the 2026 agenda is finalized.`,
    startUtc: localEventTimeToUtc(session.day, session.start),
    endUtc: localEventTimeToUtc(session.day, session.end),
    eventTimeZone: timeZone,
    dayOrder: session.day - 2,
    locationId: session.locationId,
    locationName: session.locationName,
    speakerIds: session.speakerIds ?? [],
    status: "scheduled",
    visibilityScope: audience,
    eligibilityScope: audience,
    notificationScope: audience,
    notificationOffsetsMinutes: session.offsets ?? [15],
    featured: session.featured ?? false,
    published: true,
    revision,
    updatedAt: publishedAt,
    publishedAt
  };
}

function getAudienceScope(scope: "public" | "founders" | "community") {
  if (scope === "founders") {
    return { id: "founders", label: "Founders only" };
  }

  if (scope === "community") {
    return { id: "community", label: "Community Day" };
  }

  return { id: "public", label: "All attendees" };
}

function localEventTimeToUtc(day: number, value: string) {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  const rawHour = Number(match?.[1]);
  const minute = Number(match?.[2] ?? 0);
  const meridiem = match?.[3]?.toUpperCase();

  if (!match || !meridiem) {
    throw new Error(`Invalid prototype session time: ${value}`);
  }

  const hour = meridiem === "PM" && rawHour !== 12 ? rawHour + 12 : meridiem === "AM" && rawHour === 12 ? 0 : rawHour;
  return new Date(Date.UTC(2026, 10, day, hour + 8, minute, 0, 0)).toISOString();
}
