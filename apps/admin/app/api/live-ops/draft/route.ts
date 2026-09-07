import { NextRequest, NextResponse } from "next/server";
import { getStaffContext, saveDraft, StaffAuthError } from "../../../../lib/live-ops-repository";
import type { StaffDraftSession } from "../../../../lib/live-ops-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const sessions = Array.isArray(body.sessions) ? (body.sessions as StaffDraftSession[]) : [];

  if (sessions.length === 0) {
    return NextResponse.json({ ok: false, error: "At least one draft session is required." }, { status: 422 });
  }

  try {
    const staff = await getStaffContext(request, ["EDITOR", "PUBLISHER", "ADMIN"]);
    const result = await saveDraft(sessions, staff);

    return NextResponse.json(
      {
        ok: true,
        ...result
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json({ ok: false, error: "Unable to save draft." }, { status: 500 });
  }
}
