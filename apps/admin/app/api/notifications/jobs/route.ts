import { NextRequest, NextResponse } from "next/server";
import { getReadOnlyLiveOpsState, getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";

export async function GET(request: NextRequest) {
  try {
    await getStaffContext(request, ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]);
    const state = await getReadOnlyLiveOpsState();

    return NextResponse.json(
      {
        mode: state.mode,
        pushDeliveryEnabled: false,
        jobs: state.notificationJobs,
        delivery: state.notificationDelivery,
        scheduledCount: state.notificationJobs.filter((job) => job.status === "scheduled").length,
        note: "Jobs are queued as metadata only until Expo/APNs credentials and a server worker are authorized."
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
