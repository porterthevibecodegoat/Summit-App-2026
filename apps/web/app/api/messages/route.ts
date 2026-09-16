import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Attendee messaging is not available. No message has been sent." },
    { status: 410 }
  );
}
