import { NextRequest, NextResponse } from "next/server";
import { getStaffContext, saveDraft, StaffAuthError } from "../../../../lib/live-ops-repository";
import { staffDraftSessionsSchema } from "../../../../lib/live-ops-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = staffDraftSessionsSchema.safeParse(body.sessions);

  if (!parsed.success || parsed.data.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "A valid draft with at least one session is required.",
        issues: parsed.success ? [] : parsed.error.issues.map((issue) => issue.message)
      },
      { status: 422 }
    );
  }

  try {
    const staff = await getStaffContext(request, ["EDITOR", "PUBLISHER", "ADMIN"]);
    const result = await saveDraft(parsed.data, staff);

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
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json({ ok: false, error: "Unable to save draft." }, { status: 500 });
  }
}
