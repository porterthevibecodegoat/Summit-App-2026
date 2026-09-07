import { NextRequest, NextResponse } from "next/server";
import { attendeeDeviceRegistrationSchema } from "@not-alone/validation";
import { registerDevice } from "../../../../lib/live-ops-repository";

export async function POST(request: NextRequest) {
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
        "Cache-Control": "no-store"
      }
    }
  );
}
