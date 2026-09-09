import { NextRequest, NextResponse } from "next/server";
import { attendeeDeviceRegistrationSchema } from "@not-alone/validation";
import { registerDevice } from "../../../../lib/live-ops-repository";
import { checkRateLimit } from "../../../../lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "device-registration", { limit: 10, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many device registration attempts. Please try again shortly." },
      { status: 429, headers: { ...rateLimit.headers, "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }
  const body = await request.json().catch(() => ({}));
  const parsed = attendeeDeviceRegistrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid attendee device registration.",
        issues: parsed.error.issues.map((issue) => issue.message)
      },
      { status: 422 }
    );
  }

  const result = await registerDevice(parsed.data);

  return NextResponse.json(
    {
      ok: true,
      ...result
    },
    {
      headers: {
        "Cache-Control": "no-store",
        ...rateLimit.headers
      }
    }
  );
}
