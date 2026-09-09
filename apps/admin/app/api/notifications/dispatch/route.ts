import { NextRequest, NextResponse } from "next/server";
import { getLiveOpsState, getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";
import { checkExpoPushReceipts, dispatchDuePushNotifications } from "../../../../lib/push-dispatcher";

export async function POST(request: NextRequest) {
  try {
    await getStaffContext(request, ["PUBLISHER", "ADMIN"]);
    const state = await getLiveOpsState();
    const pushEnabled = process.env.ENABLE_PUSH_DELIVERY === "true";
    const dispatchEnabled = process.env.ENABLE_NOTIFICATION_DISPATCH === "true";
    const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? process.env.EAS_PROJECT_ID ?? "";
    const dueJobs = state.notificationJobs.filter(
      (job) => job.status === "scheduled" && new Date(job.sendAfterUtc) <= new Date()
    );

    if (!pushEnabled || !dispatchEnabled) {
      return NextResponse.json(
        {
          ok: false,
          status: "BLOCKED",
          dispatched: 0,
          dueJobs: dueJobs.length,
          blockers: [
            "ENABLE_PUSH_DELIVERY must be true.",
            "ENABLE_NOTIFICATION_DISPATCH must be true.",
            "Expo/EAS push credentials must be configured and tested on real devices."
          ],
          note: "Dispatch is intentionally disabled in local/prototype mode so no attendee receives accidental notifications."
        },
        { status: 423, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!easProjectId || easProjectId.includes("replace-with")) {
      return NextResponse.json(
        {
          ok: false,
          status: "BLOCKED",
          dispatched: 0,
          dueJobs: dueJobs.length,
          blockers: ["A real EAS project ID is required before push registration or dispatch can be trusted."]
        },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (state.mode !== "supabase") {
      return NextResponse.json(
        {
          ok: false,
          status: "BLOCKED",
          dispatched: 0,
          dueJobs: dueJobs.length,
          blockers: ["Push dispatch requires the Supabase backend so jobs can be claimed once and audited."]
        },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    const receipts = await checkExpoPushReceipts();
    const result = await dispatchDuePushNotifications(state.publishedSnapshot);
    return NextResponse.json({
      ok: true,
      status: "DISPATCH_COMPLETE",
      dueJobs: dueJobs.length,
      registeredDevices: state.attendeeDevices,
      receipts,
      ...result
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json({ ok: false, error: "Unable to dispatch due notifications." }, { status: 500 });
  }
}
