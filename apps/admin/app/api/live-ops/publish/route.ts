import { NextRequest, NextResponse } from "next/server";
import { changeSourceSchema } from "@not-alone/validation";
import { getStaffContext, publishDraft, StaffAuthError } from "../../../../lib/live-ops-repository";
import { DraftPublishError, type StaffDraftSession } from "../../../../lib/live-ops-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const sessions = Array.isArray(body.sessions) ? (body.sessions as StaffDraftSession[]) : [];
  const source = changeSourceSchema.catch("MANUAL_EDITOR").parse(body.source);
  const notifyAttendees = body.notifyAttendees === true;
  const confirmPublish = body.confirmPublish === true;

  if (sessions.length === 0) {
    return NextResponse.json({ ok: false, error: "At least one ready session is required before publishing." }, { status: 422 });
  }

  if (!confirmPublish) {
    return NextResponse.json(
      {
        ok: false,
        error: "Explicit staff confirmation is required before attendee-facing publication."
      },
      { status: 422 }
    );
  }

  try {
    const staff = await getStaffContext(request, ["PUBLISHER", "ADMIN"]);
    const result = await publishDraft(sessions, { source, notifyAttendees, staff });

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
      return NextResponse.json({ ok: false, error: "Draft failed publish validation.", issues: error.issues }, { status: 422 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to publish draft revision." },
      { status: 500 }
    );
  }
}
