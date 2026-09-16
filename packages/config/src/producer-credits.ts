// User-approved source for producer credit eligibility, not attendance confirmation.
export const producerCreditSource = "https://www.inspiringchildren.org/summit";
export const originalProducerCredits = [
  { name: "Jewel", category: "Executive Producers", role: "Executive Producer" },
  { name: "Ryan Wolfington", category: "Executive Producers", role: "Executive Producer" },
  { name: "Trevor Short", category: "Executive Producers", role: "Executive Producer" },
  { name: "Dr. George Rapier III", category: "Executive Producers", role: "Executive Producer" },
  { name: "Trent Alenik", category: "Producers", role: "Producer" },
  { name: "Aphrah Brokaw", category: "Producers", role: "Producer" }
] as const;

export function originalProducerCredit(name: string) {
  const normalized = name.trim().toLowerCase();
  return originalProducerCredits.find(person => person.name.toLowerCase() === normalized || (person.name === "Jewel" && normalized === "jewel murray"));
}
