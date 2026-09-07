import { NextRequest, NextResponse } from "next/server";
import { getLiveOpsState, getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";

export async function POST(request: NextRequest) {
  try {
    await getStaffContext(request, ["PUBLISHER", "ADMIN"]);
    const formData = await request.formData();
    const scheduleItemId = String(formData.get("scheduleItemId") ?? "");
    const expectedRevision = Number(formData.get("expectedRevision") ?? 0);
    const state = await getLiveOpsState();
    const scheduleItem = state.publishedSnapshot.scheduleItems.find((item) => item.id === scheduleItemId);

    if (!scheduleItem || expectedRevision !== state.publishedSnapshot.revision) {
      return NextResponse.json(
        {
          ok: false,
          error: "Revision conflict or missing schedule item. Reload before publishing."
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode: state.mode,
      newRevision: state.publishedSnapshot.revision + 1,
      message:
        "Validated the publish request. Use /api/live-ops/publish for full draft-to-snapshot publication."
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json({ ok: false, error: "Unable to validate schedule publish request." }, { status: 500 });
  }
}
