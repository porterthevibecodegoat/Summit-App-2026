import { NextRequest, NextResponse } from "next/server";
import { getStaffContext, recordScheduleImport, StaffAuthError } from "../../../../lib/live-ops-repository";
import { detectFileType, extractScheduleDocument, parseScheduleDocument } from "../../../../lib/schedule-import";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const staff = await getStaffContext(request, ["EDITOR", "PUBLISHER", "ADMIN"]);
    const contentType = request.headers.get("content-type") ?? "";
    let fileName = "pasted-schedule.txt";
    let fileType = detectFileType(fileName, "text/plain");
    let text = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ ok: false, error: "Choose a PDF, TXT, or CSV schedule file." }, { status: 422 });
      }

      fileName = file.name;
      const extracted = await extractScheduleDocument({
        fileName,
        mimeType: file.type,
        bytes: new Uint8Array(await file.arrayBuffer())
      });
      fileType = extracted.fileType;
      text = extracted.text;
    } else {
      const body = await request.json().catch(() => ({}));
      fileName = typeof body.fileName === "string" && body.fileName.trim() ? body.fileName.trim() : fileName;
      fileType = detectFileType(fileName, "text/plain");
      text = typeof body.text === "string" ? body.text : "";
    }

    if (text.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "No readable schedule text was found in this file." }, { status: 422 });
    }

    const parseResult = parseScheduleDocument(text);
    const sessions = parseResult.sessions;
    const importJob = await recordScheduleImport(
      {
        id: crypto.randomUUID(),
        fileName,
        fileType,
        detectedEventCount: sessions.length,
        requiresReviewCount: sessions.filter((session) => session.status === "Needs review").length,
        sessions
      },
      staff
    );

    return NextResponse.json(
      {
        ok: true,
        detectedCount: sessions.length,
        skippedOperationalRows: parseResult.skippedOperationalRows,
        unmatchedTimedRows: parseResult.unmatchedTimedRows,
        sessions,
        importJob,
        message:
          sessions.length > 0
            ? `Detected ${sessions.length} attendee-facing row(s). Review every location and time before replacing the draft.`
            : "No schedule rows matched the current text parser."
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
      { ok: false, error: error instanceof Error ? error.message : "Unable to import this schedule file." },
      { status: 422 }
    );
  }
}
