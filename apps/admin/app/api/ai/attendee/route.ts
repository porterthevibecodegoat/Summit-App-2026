import { NextRequest, NextResponse } from "next/server";
import { getReadOnlyLiveOpsState } from "../../../../lib/live-ops-repository";
import { createAttendeeConciergeAnswer } from "../../../../lib/attendee-ai";
import { checkRateLimit } from "../../../../lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "attendee-ai", { limit: 30, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many concierge requests. Please wait a moment and try again." },
      { status: 429, headers: { ...rateLimit.headers, "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }
  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string"
    ? body.question.trim().slice(0, 500)
    : "What is happening now?";
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
        "Cache-Control": "no-store",
        ...rateLimit.headers
      }
    }
  );
}
