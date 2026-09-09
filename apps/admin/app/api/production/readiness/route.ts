import { NextRequest, NextResponse } from "next/server";
import { createProductionReadinessReport } from "../../../../lib/production-readiness";
import { getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";

export async function GET(request: NextRequest) {
  try {
    await getStaffContext(request, ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]);
    return NextResponse.json(createProductionReadinessReport(), {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Unable to create the readiness report." }, { status: 500 });
  }
}
