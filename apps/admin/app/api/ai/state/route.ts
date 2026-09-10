import { NextRequest, NextResponse } from "next/server";
import { getNowAndUpcoming } from "@not-alone/domain";
import { getReadOnlyLiveOpsState, getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";
import { staffDraftSessionsSchema } from "../../../../lib/live-ops-store";
import { createStateAnswer } from "../../../../lib/staff-ai";
import { createOpenAiStateAnswer } from "../../../../lib/openai-event-ai";
import { isOpenAiEnabled } from "../../../../lib/openai-server";

export async function POST(request: NextRequest) {
  try {
    await getStaffContext(request, ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]);
    const body = await request.json().catch(() => ({}));
    const question = typeof body.question === "string"
      ? body.question.trim().slice(0, 1_000)
      : "What is the current event state?";
    const state = await getReadOnlyLiveOpsState();
    const snapshot = state.publishedSnapshot;
    const parsedSessions = body.sessions === undefined
      ? { success: true as const, data: state.draftSessions }
      : staffDraftSessionsSchema.safeParse(body.sessions);
    if (!parsedSessions.success) {
      return NextResponse.json({ ok: false, error: "Invalid draft sessions supplied to State AI." }, { status: 422 });
    }
    const sessions = parsedSessions.data;
    const publishState = body.publishState && typeof body.publishState === "object" ? body.publishState : null;
    const timeline = getNowAndUpcoming({
      snapshot,
      nowUtc: new Date().toISOString(),
      audienceGroups: ["all_attendees", "founders"]
    });
    const missingLocationCount = snapshot.scheduleItems.filter((item) => item.locationName.trim().length === 0).length;
    const needsReviewCount = state.draftSessions.filter((session) => session.status === "Needs review").length;

    const structuredFacts = {
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
      lastPublishedAt: state.lastPublishedAt,
      backendMode: state.mode
    };
    const fallbackAnswer = createStateAnswer({
      question,
      sessions,
      baseRevision: snapshot.revision,
      publishState,
      backendMode: state.mode,
      notificationJobsCount: state.notificationJobs.length,
      attendeeDevices: state.attendeeDevices
    });
    let answer = fallbackAnswer;
    let engine: "openai" | "deterministic-fallback" = "deterministic-fallback";
    if (isOpenAiEnabled()) {
      try {
        answer = await createOpenAiStateAnswer({ question, facts: structuredFacts, sessions });
        engine = "openai";
      } catch (error) {
        console.error("State OpenAI call failed:", error instanceof Error ? error.message : "Unknown provider error.");
        // The read-only deterministic engine remains available during model outages.
      }
    }

    return NextResponse.json({
      aiSystem: "CURRENT_STATE_AI",
      readOnly: true,
      engine,
      question,
      answer,
      structuredFacts
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
