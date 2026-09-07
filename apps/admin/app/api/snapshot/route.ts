import { NextResponse } from "next/server";
import { eventSnapshotSchema } from "@not-alone/validation";
import { getReadOnlyLiveOpsState } from "../../../lib/live-ops-repository";

export async function GET() {
  const state = await getReadOnlyLiveOpsState();
  const snapshot = eventSnapshotSchema.parse({
    ...state.publishedSnapshot,
    serverTimeUtc: new Date().toISOString()
  });

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
      ...(state.adapterWarning ? { "x-not-alone-adapter-warning": state.adapterWarning } : {})
    }
  });
}
