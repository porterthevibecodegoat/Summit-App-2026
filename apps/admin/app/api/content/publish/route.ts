import { NextRequest, NextResponse } from "next/server";
import { getStaffContext, publishEventContent, StaffAuthError } from "../../../../lib/live-ops-repository";
import { staffContentSchema } from "../../../../lib/live-ops-store";

export async function POST(request: NextRequest) {
  try {
    const staff = await getStaffContext(request, ["PUBLISHER", "ADMIN"]);
    const body = await request.json().catch(() => ({}));
    const content = staffContentSchema.safeParse(body.content);

    if (!content.success) {
      return NextResponse.json(
        { ok: false, error: "Content validation failed.", issues: content.error.issues.map((issue) => issue.message) },
        { status: 422 }
      );
    }

    if (body.confirmPublish !== true) {
      return NextResponse.json(
        { ok: false, error: "Explicit staff confirmation is required before attendee-facing publication." },
        { status: 422 }
      );
    }

    const result = await publishEventContent(content.data, staff);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to publish attendee content." },
      { status: 500 }
    );
  }
}
