import { NextRequest, NextResponse } from "next/server";
import { getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";

export async function GET(request: NextRequest) {
  try {
    const staff = await getStaffContext(request, ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]);

    return NextResponse.json(
      {
        ok: true,
        mode: staff.mode,
        role: staff.role,
        actorId: staff.actorId ?? null
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

    return NextResponse.json({ ok: false, error: "Unable to verify staff session." }, { status: 500 });
  }
}
