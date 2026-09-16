import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Online reservations are not open. No reservation has been created." },
    { status: 410 }
  );
}
