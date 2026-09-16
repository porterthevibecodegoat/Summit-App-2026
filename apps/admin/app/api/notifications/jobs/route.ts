import { NextRequest, NextResponse } from "next/server";
import { getReadOnlyLiveOpsState, getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";

export async function GET(request: NextRequest) {
  try {
    await getStaffContext(request, ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]);
    const state = await getReadOnlyLiveOpsState();
    const pushDeliveryEnabled = state.mode === "supabase"
      && process.env.ENABLE_PUSH_DELIVERY === "true"
      && process.env.ENABLE_NOTIFICATION_DISPATCH === "true";

    return NextResponse.json(
      {
        mode: state.mode,
        pushDeliveryEnabled,
        jobs: state.notificationJobs,
        delivery: state.notificationDelivery,
        scheduledCount: state.notificationJobs.filter((job) => job.status === "scheduled").length,
        note: pushDeliveryEnabled
          ? "Delivery is enabled. Provider receipts do not confirm that an attendee read a notification."
          : "Delivery is disabled; queued jobs will not send until push delivery is configured and authorized."
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
    return NextResponse.json({ ok: false, error: "Unable to load notification jobs." }, { status: 500 });
  }
}
