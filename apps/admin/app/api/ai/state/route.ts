import { NextRequest, NextResponse } from "next/server";
import { getNowAndUpcoming } from "@not-alone/domain";
import { getReadOnlyLiveOpsState, getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";
import { createStateAnswer } from "../../../../lib/staff-ai";

export async function POST(request: NextRequest) {
  try {
    await getStaffContext(request, ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]);
    const body = await request.json().catch(() => ({}));
    const question = typeof body.question === "string" ? body.question : "What is the current event state?";
    const state = await getReadOnlyLiveOpsState();
    const snapshot = state.publishedSnapshot;
    const sessions = Array.isArray(body.sessions) ? body.sessions : state.draftSessions;
    const publishState = body.publishState && typeof body.publishState === "object" ? body.publishState : null;
    const timeline = getNowAndUpcoming({
      snapshot,
      nowUtc: new Date().toISOString(),
      audienceGroups: ["all_attendees", "founders"]
    });
    const missingLocationCount = snapshot.scheduleItems.filter((item) => item.locationName.trim().length === 0).length;
    const needsReviewCount = state.draftSessions.filter((session) => session.status === "Needs review").length;

    return NextResponse.json({
      aiSystem: "CURRENT_STATE_AI",
      readOnly: true,
      question,
      answer: createStateAnswer({
        question,
        sessions,
        baseRevision: snapshot.revision,
        publishState,
        backendMode: state.mode,
        notificationJobsCount: state.notificationJobs.length,
        attendeeDevices: state.attendeeDevices
      }),
      structuredFacts: {
        eventId: snapshot.event.id,
        revision: snapshot.revision,
        draftSessions: state.draftSessions.length,
        scheduleItems: snapshot.scheduleItems.length,
        currentItems: timeline.current.length,
        upcomingItems: timeline.upcoming.length,
        missingLocationCount,
        needsReviewCount,
        attendeeDevices: state.attendeeDevices,
        notificationJobs: state.notificationJobs.length,
        lastPublishedAt: state.lastPublishedAt
      }
      }, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Unable to answer the staff state question." }, { status: 500 });
  }
}
