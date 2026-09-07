import { NextResponse } from "next/server";
import { getReadOnlyLiveOpsState } from "../../../../lib/live-ops-repository";

export async function GET() {
  const state = await getReadOnlyLiveOpsState();

  return NextResponse.json(
    {
      mode: state.mode,
      pushDeliveryEnabled: false,
      jobs: state.notificationJobs,
      scheduledCount: state.notificationJobs.filter((job) => job.status === "scheduled").length,
      note: "Jobs are queued as metadata only until Expo/APNs credentials and a server worker are authorized."
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
