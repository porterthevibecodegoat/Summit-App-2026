import { NextRequest, NextResponse } from "next/server";
import { getReadOnlyLiveOpsState } from "../../../../lib/live-ops-repository";
import { createAttendeeConciergeAnswer } from "../../../../lib/attendee-ai";
import { checkRateLimit } from "../../../../lib/rate-limit";
import { createOpenAiAttendeeAnswer } from "../../../../lib/openai-event-ai";
import { isOpenAiEnabled } from "../../../../lib/openai-server";
import { publicApiCorsHeaders, publicApiOptions } from "../../../../lib/public-api-cors";

const allowedMethods = ["POST"] as const;

export function OPTIONS() {
  return publicApiOptions(allowedMethods);
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "attendee-ai", { limit: 30, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many concierge requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: {
          ...publicApiCorsHeaders(allowedMethods),
          ...rateLimit.headers,
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }
  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string"
    ? body.question.trim().slice(0, 500)
    : "What is happening now?";
  const state = await getReadOnlyLiveOpsState();
  const fallbackAnswer = createAttendeeConciergeAnswer({
    question,
    snapshot: state.publishedSnapshot,
    nowUtc: new Date().toISOString()
  });
  const aiEnabled = isOpenAiEnabled();
  let answer = fallbackAnswer;
  let engine: "openai" | "deterministic-fallback" = "deterministic-fallback";

  if (aiEnabled) {
    try {
      answer = await createOpenAiAttendeeAnswer({
        question,
        snapshot: state.publishedSnapshot,
        nowUtc: new Date().toISOString()
      });
      engine = "openai";
    } catch (error) {
      console.error("Attendee OpenAI call failed:", error instanceof Error ? error.message : "Unknown provider error.");
      answer = {
        ...fallbackAnswer,
        warnings: ["Live concierge is temporarily unavailable. This answer uses the latest published schedule."]
      };
    }
  }

  return NextResponse.json(
    {
      ok: true,
      aiEnabled,
      engine,
      answer,
      note: engine === "openai" ? "Live grounded concierge response." : "Schedule-grounded fallback response."
    },
    {
      headers: {
        "Cache-Control": "no-store",
        ...publicApiCorsHeaders(allowedMethods),
        ...rateLimit.headers
      }
    }
  );
}
