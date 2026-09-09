import { NextRequest, NextResponse } from "next/server";
import { authenticateStaffAccessToken, StaffAuthError } from "../../../../lib/live-ops-repository";
import { STAFF_ACCESS_COOKIE, STAFF_REFRESH_COOKIE, staffCookieOptions } from "../../../../lib/staff-session";

const STAFF_ROLES = ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
    const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";
    const expiresIn = normalizeExpiresIn(body.expiresIn);
    const staff = await authenticateStaffAccessToken(accessToken, [...STAFF_ROLES]);
    const response = NextResponse.json({ ok: true, mode: staff.mode, role: staff.role });

    if (accessToken) {
      response.cookies.set(STAFF_ACCESS_COOKIE, accessToken, staffCookieOptions(expiresIn));
    }
    if (refreshToken) {
      response.cookies.set(STAFF_REFRESH_COOKIE, refreshToken, staffCookieOptions(60 * 60 * 24 * 30));
    }

    return response;
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Unable to create the staff session." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const refreshToken = request.cookies.get(STAFF_REFRESH_COOKIE)?.value;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, mode: "local-adapter", role: process.env.LOCAL_STAFF_ROLE ?? "ADMIN" });
  }
  if (!refreshToken || !publishableKey) {
    return clearSessionResponse("The staff session has expired.", 401);
  }

  try {
    const refreshResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: publishableKey },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store"
    });
    if (!refreshResponse.ok) {
      return clearSessionResponse("The staff session has expired.", 401);
    }

    const session = (await refreshResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!session.access_token) {
      return clearSessionResponse("The staff session has expired.", 401);
    }

    const staff = await authenticateStaffAccessToken(session.access_token, [...STAFF_ROLES]);
    const response = NextResponse.json({ ok: true, mode: staff.mode, role: staff.role });
    response.cookies.set(
      STAFF_ACCESS_COOKIE,
      session.access_token,
      staffCookieOptions(normalizeExpiresIn(session.expires_in))
    );
    if (session.refresh_token) {
      response.cookies.set(STAFF_REFRESH_COOKIE, session.refresh_token, staffCookieOptions(60 * 60 * 24 * 30));
    }
    return response;
  } catch {
    return clearSessionResponse("Unable to refresh the staff session.", 401);
  }
}

export async function DELETE() {
  return clearSessionResponse("Signed out.", 200);
}

function normalizeExpiresIn(value: unknown) {
  const candidate = Number(value);
  return Number.isFinite(candidate) && candidate >= 60 ? Math.min(candidate, 60 * 60 * 24) : 60 * 60;
}

function clearSessionResponse(message: string, status: number) {
  const response = NextResponse.json({ ok: status < 400, message }, { status });
  response.cookies.set(STAFF_ACCESS_COOKIE, "", staffCookieOptions(0));
  response.cookies.set(STAFF_REFRESH_COOKIE, "", staffCookieOptions(0));
  return response;
}
