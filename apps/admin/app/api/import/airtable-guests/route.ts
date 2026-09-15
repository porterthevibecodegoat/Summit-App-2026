import { NextRequest, NextResponse } from "next/server";
import { publicAppConfig } from "@not-alone/config";
import { getStaffContext, StaffAuthError } from "../../../../lib/live-ops-repository";
import { parseAirtableGuestCsv } from "../../../../lib/airtable-import";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await getStaffContext(request, ["EDITOR", "PUBLISHER", "ADMIN"]);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ ok: false, error: "Choose an Airtable CSV export." }, { status: 422 });
    }
    if (file.size === 0 || file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Guest CSV files must be between 1 byte and 15 MB." }, { status: 422 });
    }

    const result = parseAirtableGuestCsv(await file.text(), publicAppConfig.eventId);
    return NextResponse.json({
      ok: true,
      ...result,
      message: `${result.speakers.length} unique confirmed guest(s) are ready for review. Nothing was published.`
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to review Airtable guest CSV." }, { status: 422 });
  }
}
