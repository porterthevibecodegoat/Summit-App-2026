import { NextRequest, NextResponse } from "next/server";
import { operatorAiCreateProposal } from "@not-alone/domain";
import { getLiveOpsState, getStaffContext, StaffAuthError } from "../../../../../lib/live-ops-repository";
import { createScheduleProposal } from "../../../../../lib/staff-ai";
import { staffDraftSessionsSchema } from "../../../../../lib/live-ops-store";

export async function POST(request: NextRequest) {
  try {
    await getStaffContext(request, ["EDITOR", "PUBLISHER", "ADMIN"]);
    const body = await request.json().catch(() => ({}));
    const commandText = typeof body.commandText === "string" ? body.commandText : "";
    const state = await getLiveOpsState();
    const parsedSessions = body.sessions === undefined
      ? { success: true as const, data: state.draftSessions }
      : staffDraftSessionsSchema.safeParse(body.sessions);
    if (!parsedSessions.success) {
      return NextResponse.json({ ok: false, error: "Invalid draft sessions supplied to Operator AI." }, { status: 422 });
    }
    const sessions = parsedSessions.data;
    const proposal = createScheduleProposal(commandText || "No command supplied.", sessions);

    const structuredProposal = operatorAiCreateProposal({
      proposalId: crypto.randomUUID(),
      eventId: state.eventId,
      commandText: commandText || "No command supplied.",
      operations: [],
      createdByRole: "EDITOR",
      createdAt: new Date().toISOString()
    });

    return NextResponse.json(
      {
        aiSystem: "EVENT_OPERATOR_AI",
        productionMutated: false,
        proposal,
        structuredProposal,
        liveOpsState: {
          currentRevision: state.publishedSnapshot.revision,
          draftSessions: state.draftSessions.length,
          notificationJobs: state.notificationJobs.length
        },
        nextRequiredStep: "Human review and explicit publish are required before attendee-facing data can change."
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

    return NextResponse.json({ ok: false, error: "Unable to create a safe change proposal." }, { status: 500 });
  }
}
