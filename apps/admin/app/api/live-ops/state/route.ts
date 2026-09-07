import { NextResponse } from "next/server";
import { getReadOnlyLiveOpsState } from "../../../../lib/live-ops-repository";
import { createScheduleQualityReport } from "../../../../lib/schedule-quality";

export async function GET() {
  const state = await getReadOnlyLiveOpsState();
  const quality = createScheduleQualityReport(state.draftSessions);

  return NextResponse.json(
    {
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
      scheduleQuality: {
        publishable: quality.publishable,
        issueCounts: quality.issueCounts,
        conflicts: quality.conflicts.length,
        readySessions: quality.readySessions,
        needsReviewSessions: quality.needsReviewSessions,
        draftSessions: quality.draftSessions
      },
      activityLog: state.activityLog
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
