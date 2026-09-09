import { NextRequest, NextResponse } from "next/server";
import { getReadOnlyLiveOpsState, getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";
import { createScheduleQualityReport } from "../../../../lib/schedule-quality";

export async function GET(request: NextRequest) {
  try {
    await getStaffContext(request, ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]);
    const state = await getReadOnlyLiveOpsState();
    const quality = createScheduleQualityReport(state.draftSessions);

    return NextResponse.json({
      mode: state.mode,
      eventId: state.eventId,
      revision: state.revision,
      draftSessions: state.draftSessions,
      publishedRevision: state.publishedSnapshot.revision,
      publishedScheduleItems: state.publishedSnapshot.scheduleItems.length,
      lastPublishedAt: state.lastPublishedAt,
      lastPublishedMessage: state.lastPublishedMessage,
      adapterWarning: state.adapterWarning,
      degraded: state.degraded,
      attendeeDevices: state.attendeeDevices,
      notificationJobs: state.notificationJobs,
      notificationJobsCount: state.notificationJobs.length,
      notificationDelivery: state.notificationDelivery,
      scheduleQuality: {
        publishable: quality.publishable,
        issueCounts: quality.issueCounts,
        conflicts: quality.conflicts.length,
        readySessions: quality.readySessions,
        needsReviewSessions: quality.needsReviewSessions,
        draftSessions: quality.draftSessions
      },
      activityLog: state.activityLog,
      importJobs: state.importJobs
      }, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Unable to load staff event state." }, { status: 500 });
  }
}
