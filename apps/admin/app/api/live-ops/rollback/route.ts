import { NextRequest, NextResponse } from "next/server";
import { getStaffContext, rollbackPublishedRevision, StaffAuthError } from "../../../../lib/live-ops-repository";
import { DraftPublishError } from "../../../../lib/live-ops-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const confirmRollback = body.confirmRollback === true;
  const notifyAttendees = body.notifyAttendees === true;

  if (!confirmRollback) {
    return NextResponse.json({ ok: false, error: "Explicit staff confirmation is required before rollback." }, { status: 422 });
  }

  try {
    const staff = await getStaffContext(request, ["PUBLISHER", "ADMIN"]);
    const result = await rollbackPublishedRevision({ notifyAttendees, staff });

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

    if (error instanceof DraftPublishError) {
      return NextResponse.json({ ok: false, error: "Rollback is unavailable.", issues: error.issues }, { status: 422 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to roll back published revision." },
      { status: 500 }
    );
  }
}
