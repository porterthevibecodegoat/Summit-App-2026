import { NextResponse } from "next/server";
import { eventSnapshotSchema } from "@not-alone/validation";
import { getReadOnlyLiveOpsState } from "../../../lib/live-ops-repository";
import { publicApiCorsHeaders, publicApiOptions } from "../../../lib/public-api-cors";

const allowedMethods = ["GET"] as const;

export function OPTIONS() {
  return publicApiOptions(allowedMethods);
}

export async function GET() {
  const state = await getReadOnlyLiveOpsState();
  const snapshot = eventSnapshotSchema.parse({
    ...state.publishedSnapshot,
    serverTimeUtc: new Date().toISOString()
  });

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
      ...publicApiCorsHeaders(allowedMethods),
      ...(state.adapterWarning ? { "x-not-alone-adapter-warning": state.adapterWarning } : {})
    }
  });
}
