import { NextResponse } from "next/server";
import { getLiveOpsState } from "../../../lib/live-ops-repository";
import { createProductionReadinessReport } from "../../../lib/production-readiness";
import { createScheduleQualityReport } from "../../../lib/schedule-quality";

export async function GET() {
  const readiness = createProductionReadinessReport();

  try {
    const state = await getLiveOpsState();
    const scheduleQuality = createScheduleQualityReport(state.draftSessions);

    return NextResponse.json(
      {
        ok: true,
        backendMode: state.mode,
        eventId: state.eventId,
        publishedRevision: state.publishedSnapshot.revision,
        publishedScheduleItems: state.publishedSnapshot.scheduleItems.length,
        draftSessions: state.draftSessions.length,
        notificationJobs: state.notificationJobs.length,
        attendeeDevices: state.attendeeDevices,
        scheduleQuality: {
          publishable: scheduleQuality.publishable,
          blockingIssues: scheduleQuality.issueCounts.blocking,
          warnings: scheduleQuality.issueCounts.warning,
          conflicts: scheduleQuality.conflicts.length
        },
        readinessStatus: readiness.status,
        readinessBlockers: readiness.blockers,
        readinessWarnings: readiness.warnings
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Health check failed.",
        readinessStatus: readiness.status,
        readinessBlockers: readiness.blockers,
        readinessWarnings: readiness.warnings
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
