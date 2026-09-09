import { NextResponse } from "next/server";
import { getLiveOpsState } from "../../../lib/live-ops-repository";

export async function GET() {
  try {
    const state = await getLiveOpsState();

    return NextResponse.json(
      {
        ok: true,
        backendMode: state.mode,
        eventId: state.eventId,
        status: "healthy"
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "unavailable"
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
