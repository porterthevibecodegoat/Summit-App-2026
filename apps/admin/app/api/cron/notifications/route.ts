import { NextRequest, NextResponse } from "next/server";
import { getLiveOpsState } from "../../../../lib/live-ops-repository";
import { checkExpoPushReceipts, dispatchDuePushNotifications } from "../../../../lib/push-dispatcher";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "Notification scheduling is not configured." }, { status: 503 });
  }
  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (process.env.ENABLE_PUSH_DELIVERY !== "true" || process.env.ENABLE_NOTIFICATION_DISPATCH !== "true") {
    return NextResponse.json({ ok: false, error: "Notification dispatch is safely disabled." }, { status: 423 });
  }

  try {
    const state = await getLiveOpsState();
    if (state.mode !== "supabase") {
      return NextResponse.json({ ok: false, error: "Supabase backend is required." }, { status: 422 });
    }
    const receipts = await checkExpoPushReceipts();
    const dispatch = await dispatchDuePushNotifications(state.publishedSnapshot);
    return NextResponse.json({ ok: true, receipts, dispatch }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Scheduled notification dispatch failed." }, { status: 500 });
  }
}
