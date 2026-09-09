import { NextRequest, NextResponse } from "next/server";
import { getLiveOpsState, getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";
import { checkExpoPushReceipts } from "../../../../lib/push-dispatcher";

export async function POST(request: NextRequest) {
  try {
    await getStaffContext(request, ["PUBLISHER", "ADMIN"]);
    const state = await getLiveOpsState();
    if (process.env.ENABLE_PUSH_DELIVERY !== "true" || process.env.ENABLE_NOTIFICATION_DISPATCH !== "true") {
      return NextResponse.json({ ok: false, error: "Push receipt checks are safely disabled." }, { status: 423 });
    }
    if (state.mode !== "supabase") {
      return NextResponse.json({ ok: false, error: "Supabase backend is required." }, { status: 422 });
    }

    const result = await checkExpoPushReceipts();
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Unable to check notification receipts." }, { status: 500 });
  }
}
