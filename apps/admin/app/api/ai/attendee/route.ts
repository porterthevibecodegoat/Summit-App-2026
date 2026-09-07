import { NextRequest, NextResponse } from "next/server";
import { getReadOnlyLiveOpsState } from "../../../../lib/live-ops-repository";
import { createAttendeeConciergeAnswer } from "../../../../lib/attendee-ai";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question : "What is happening now?";
  const state = await getReadOnlyLiveOpsState();
  const answer = createAttendeeConciergeAnswer({
    question,
    snapshot: state.publishedSnapshot,
    nowUtc: new Date().toISOString()
  });

  return NextResponse.json(
    {
      ok: true,
      aiEnabled: process.env.ENABLE_AI === "true",
      answer,
      note:
        process.env.ENABLE_AI === "true"
          ? "OpenAI credentials are present, but this route still uses the deterministic temporary answer engine until structured model calls and evals are enabled."
          : "Temporary no-key attendee concierge response."
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
