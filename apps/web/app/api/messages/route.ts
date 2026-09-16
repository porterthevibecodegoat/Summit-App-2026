import { NextResponse } from "next/server";
import { z } from "zod";
import { people2026 } from "../../../lib/people";

const requestSchema = z.object({
  recipient: z.string().min(1),
  senderName: z.string().min(2).max(100),
  senderEmail: z.string().email(),
  intent: z.enum(["connect", "meet", "chat"]),
  message: z.string().min(10).max(1000),
  consent: z.literal("yes")
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please complete every field with a valid email and message." }, { status: 400 });
  if (!people2026.some((person) => person.name === parsed.data.recipient && person.messageable)) return NextResponse.json({ error: "This person is not available for 2026 messaging." }, { status: 404 });

  // Production delivery intentionally stays server-side. Configure the provider and
  // attendee identity records before enabling email or push dispatch.
  if (!process.env.MESSAGE_DELIVERY_WEBHOOK_URL || !process.env.MESSAGE_DELIVERY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Messaging is not available. No message has been sent." }, { status: 503 });
  }
  const delivery = await fetch(process.env.MESSAGE_DELIVERY_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MESSAGE_DELIVERY_WEBHOOK_SECRET ?? ""}` },
    body: JSON.stringify(parsed.data),
    signal: AbortSignal.timeout(10000),
    cache: "no-store"
  }).catch(() => null);
  if (!delivery?.ok) return NextResponse.json({ error: "Delivery is temporarily unavailable. Please try again." }, { status: 502 });
  return NextResponse.json({ message: "Your connection request was accepted for delivery." });
}
