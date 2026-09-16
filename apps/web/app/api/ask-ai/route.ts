import { NextResponse } from "next/server";
import { z } from "zod";
import { directoryPeople } from "../../../lib/people";
import { getReviewedContentSnapshot } from "../../../lib/snapshot";

const schema = z.object({ question: z.string().min(2).max(500) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ answer: "Please ask a complete question." }, { status: 400 });
  const question = parsed.data.question.toLowerCase();
  const people2026 = directoryPeople(await getReviewedContentSnapshot());
  let answer = "I can answer questions grounded in approved summit information. Try asking about dates, venue, schedule, or a person in the directory.";
  if (question.includes("when") || question.includes("date")) answer = "The 2026 Not Alone Summit is November 2–4, 2026.";
  else if (question.includes("where") || question.includes("venue") || question.includes("map")) answer = "The summit is at Wynn Las Vegas in Las Vegas, Nevada. Open the Map tab for venue guidance as details are approved.";
  else if (question.includes("message") || question.includes("connect")) answer = "Attendee-to-attendee messaging is not available. Use the Contact page to reach the event team.";
  else {
    const person = people2026.find(({ name }) => question.includes(name.toLowerCase()));
    if (person) answer = `${person.name} is listed for 2026 as ${person.role}. Open their directory profile for available biography details.`;
  }
  return NextResponse.json({ answer });
}
