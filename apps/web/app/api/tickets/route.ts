import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.email(), donation: z.number().min(0).max(1_000_000) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Please enter a valid name, email, and donation amount." }, { status: 400 });
  const webhook = process.env.TICKET_RESERVATION_WEBHOOK_URL;
  const secret = process.env.TICKET_RESERVATION_WEBHOOK_SECRET;
  if (!webhook || !secret) return NextResponse.json({ message: "Online reservations are not open. No reservation has been created." }, { status: 503 });
  const response = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${secret}` }, body: JSON.stringify(parsed.data), cache: "no-store", signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!response?.ok) return NextResponse.json({ message: "Reservations are temporarily unavailable. Please try again." }, { status: 502 });
  const result = await response.json().catch(() => ({}));
  return NextResponse.json(result, { status: response.status });
}
