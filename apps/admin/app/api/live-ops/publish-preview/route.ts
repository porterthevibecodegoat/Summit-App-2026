import { NextRequest, NextResponse } from "next/server";
import { getStaffContext, previewPublish, StaffAuthError } from "../../../../lib/live-ops-repository";
import type { StaffDraftSession } from "../../../../lib/live-ops-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const sessions = Array.isArray(body.sessions) ? (body.sessions as StaffDraftSession[]) : [];

  if (sessions.length === 0) {
    return NextResponse.json({ ok: false, error: "At least one draft session is required to preview publication." }, { status: 422 });
  }

  try {
    const staff = await getStaffContext(request, ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]);
    const preview = await previewPublish(sessions, staff);

    return NextResponse.json(
      {
        ok: true,
        preview
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

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to create publish preview." },
      { status: 500 }
    );
  }
}
