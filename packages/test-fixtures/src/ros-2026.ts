// Read-only transcription of the Simplified ROS, reviewed September 16, 2026.
// User confirmed all displayed times are America/Los_Angeles. Blank source
// fields remain blank; no locations, session durations, or speakers are inferred.
export const ros2026Source = {
  url: "https://airtable.com/app7BHptsc1bjc3DD/pagFmzDhXfNK53eWY",
  reviewedAt: "2026-09-16",
  timeZone: "America/Los_Angeles",
  recordCount: 32
} as const;

export type Ros2026Row = {
  row: number;
  day: number;
  title: string;
  start: string | null;
  end: string | null;
  location?: string;
  access?: string;
  timingReview?: boolean;
  staffOnly?: boolean;
};

export const ros2026: Ros2026Row[] = [
  { row: 1, day: 1, title: "Mike's Bikes Community Ride", start: "14:00", end: "17:00" },
  { row: 2, day: 1, title: "Mike's Bikes Sponsor and Talent Dinner", start: "19:00", end: "22:00", location: "Margaux", access: "Sponsors and talent" },
  { row: 3, day: 1, title: "Molly's Game Poker Night", start: "22:30", end: "00:00", location: "Margaux" },
  { row: 4, day: 2, title: "David Eagleman + Geoff Ralston", start: "00:00", end: null, timingReview: true },
  { row: 5, day: 2, title: "Wellness and Community Programming", start: "13:00", end: "18:00" },
  { row: 6, day: 2, title: "Founders Cocktails", start: "16:30", end: "17:00", access: "Founders" },
  { row: 7, day: 2, title: "Founder's Dinner", start: "17:00", end: "19:00", access: "Founders" },
  { row: 8, day: 2, title: "Speaker Reception", start: "17:15", end: "18:15", access: "Speakers" },
  { row: 9, day: 2, title: "Pet Partners Therapy", start: "18:00", end: "19:00" },
  { row: 10, day: 2, title: "Red Carpet", start: "18:15", end: "19:30" },
  { row: 11, day: 2, title: "Doors Open", start: "18:30", end: null },
  { row: 12, day: 2, title: "Pre-Show", start: "19:30", end: null },
  { row: 13, day: 2, title: "Awards Show", start: "20:00", end: "22:00" },
  { row: 14, day: 3, title: "Wellness Activity", start: "08:00", end: "10:00" },
  { row: 15, day: 3, title: "Pet Partners Therapy", start: "09:00", end: "10:00" },
  { row: 16, day: 3, title: "Summit Sessions", start: "10:30", end: "13:00" },
  { row: 17, day: 3, title: "Lunch", start: "13:30", end: "14:30" },
  { row: 18, day: 3, title: "Summit Sessions", start: "15:00", end: "17:00" },
  { row: 19, day: 3, title: "Break", start: "17:00", end: "18:00" },
  { row: 20, day: 3, title: "Dinner", start: "18:30", end: "20:00" },
  { row: 21, day: 3, title: "Evening Talk and Performance", start: "20:30", end: "21:30" },
  { row: 22, day: 3, title: "Late Night Pickleball and Sauna", start: "22:00", end: "00:00" },
  { row: 23, day: 4, title: "Wellness Activity", start: "08:00", end: "10:00" },
  { row: 24, day: 4, title: "Pet Partners Therapy", start: "09:00", end: "10:00" },
  { row: 25, day: 4, title: "Summit Sessions", start: "10:30", end: "13:00" },
  { row: 26, day: 4, title: "Lunch", start: "13:30", end: "14:30" },
  { row: 27, day: 4, title: "Summit Sessions", start: "15:00", end: "17:00" },
  { row: 28, day: 4, title: "Break", start: "17:00", end: "18:00" },
  { row: 29, day: 4, title: "Closing Celebration", start: "18:30", end: "22:00" },
  { row: 30, day: 5, title: "Load Out", start: null, end: null, staffOnly: true },
  { row: 31, day: 5, title: "Tennis", start: "10:00", end: null },
  { row: 32, day: 5, title: "High Tea", start: "12:00", end: null }
];
