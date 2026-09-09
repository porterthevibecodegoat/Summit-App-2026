import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Enter a valid staff email address." }, { status: 422 });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ ok: false, error: "Staff sign-in is not configured." }, { status: 503 });
  }

  const redirectTo = new URL(request.url).origin;
  const response = await fetch(`${supabaseUrl}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey
    },
    body: JSON.stringify({ email, create_user: false }),
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, error: "This email does not have an active staff invitation." },
      { status: response.status === 429 ? 429 : 403 }
    );
  }

  return NextResponse.json(
    { ok: true, message: "Check your email for the secure staff sign-in link." },
    { headers: { "Cache-Control": "no-store" } }
  );
}
