import { NextRequest, NextResponse } from "next/server";
import { getStaffContext, previewPublish, StaffAuthError } from "../../../../lib/live-ops-repository";
import { staffDraftSessionsSchema } from "../../../../lib/live-ops-store";

export async function POST(request: NextRequest) {
  try {
    const staff = await getStaffContext(request, ["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]);
    const body = await request.json().catch(() => ({}));
    const parsed = staffDraftSessionsSchema.safeParse(body.sessions);

    if (!parsed.success || parsed.data.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "At least one valid draft session is required to preview publication.",
          issues: parsed.success ? [] : parsed.error.issues.map((issue) => issue.message)
        },
        { status: 422 }
      );
    }

    const preview = await previewPublish(parsed.data, staff);

    return NextResponse.json(
      {
        ok: true,
        preview
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

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to create publish preview." },
      { status: 500 }
    );
  }
}
