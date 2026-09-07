import { NextResponse } from "next/server";
import { createProductionReadinessReport } from "../../../../lib/production-readiness";

export async function GET() {
  return NextResponse.json(createProductionReadinessReport(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
