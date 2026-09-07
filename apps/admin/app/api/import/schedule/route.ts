import { NextRequest, NextResponse } from "next/server";
import { getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";
import { parseScheduleText } from "../../../../lib/schedule-import";

export async function POST(request: NextRequest) {
  try {
    await getStaffContext(request, ["EDITOR", "PUBLISHER", "ADMIN"]);
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text : "";

    if (text.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "Import text is required." }, { status: 422 });
    }

    const sessions = parseScheduleText(text);

    return NextResponse.json(
      {
        ok: true,
        detectedCount: sessions.length,
        sessions,
        message:
          sessions.length > 0
            ? `Detected ${sessions.length} schedule row(s). Review locations and mark rows Ready before publishing.`
            : "No schedule rows matched the current text parser."
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

    return NextResponse.json({ ok: false, error: "Unable to import schedule text." }, { status: 500 });
  }
}
