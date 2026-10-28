import { withSubmissionInbox } from "../../../lib/staff/submission-inbox";
import { NextResponse } from "next/server";
import { getSubmissionStore, newSubmission, siteVisitWaiverProblem, wellnessFormSchema, type SubmissionStore } from "../../../lib/staff/store";
import { wellnessClash, wellnessSessionById, wellnessSignupsOpen } from "../../../lib/wellness-signups-2026";
import { BookingProblem, type BookingWorkflow } from "../../../lib/wellness-booking/service";
import { getWellnessWorkflow, wellnessInboxStore } from "../../../lib/wellness-booking/workflow-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Oct 12: the wellness class form at /wellness (public/wellness). Same origin only. Each chosen class is stored as one
// "workshop" record with category "wellness" (with email, phone and the signed waiver), so the staff portal's
// Wellness view lists it per class.
export async function handleWellnessPost(request: Request, store?: SubmissionStore, workflow?: BookingWorkflow): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  if (Number(request.headers.get("content-length") ?? 0) > 10_000) return NextResponse.json({ error: "Request is too large." }, { status: 413, headers });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400, headers }); }
  const parsed = wellnessFormSchema.safeParse(body);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    const messages: Record<string, string> = { name: "Please enter your full name.", email: "Please enter a valid email address.", phone: "Please enter a phone number." };
    return NextResponse.json({ field, error: messages[field] ?? "Please check the form and try again." }, { status: 400, headers });
  }
  const { website, sessions, waiverAccepted, signature, waiverVersion, ...guest } = parsed.data;
  if (website) return NextResponse.json({ ok: true }, { status: 201, headers }); // honeypot: pretend success, store nothing
  const ids = [...new Set(sessions)];
  if (ids.length === 0) return NextResponse.json({ field: "sessions", error: "Please choose at least one class." }, { status: 400, headers });
  if (!wellnessSignupsOpen) return NextResponse.json({ error: "Sign-ups are not open at the moment." }, { status: 410, headers });
  const problem = siteVisitWaiverProblem({ name: guest.name, waiverAccepted, signature, waiverVersion });
  if (problem) return NextResponse.json(problem, { status: 400, headers });
  const now = new Date();
  const waiver = { waiverAccepted: true, signature: (signature ?? "").trim(), waiverVersion: (waiverVersion ?? "").trim(), waiverAcceptedAt: now.toISOString() };
  try {
    const booking = workflow ?? await getWellnessWorkflow();
    if (booking) {
      const fields = body as { requestId?: unknown; id?: unknown };
      const requestId = request.headers.get("idempotency-key") ?? fields.requestId ?? fields.id;
      if (typeof requestId !== "string") return NextResponse.json({ error: "Please refresh the page and try again." }, { status: 400, headers });
      return NextResponse.json(await booking.register(parsed.data, requestId), { status: 201, headers });
    }
    if (ids.some(id => !wellnessSessionById.has(id))) return NextResponse.json({ field: "sessions", error: "Please refresh the page and choose your classes again." }, { status: 400, headers });
    const clash = wellnessClash(ids);
    if (clash) return NextResponse.json({ field: "sessions", error: `${clash[0].title} and ${clash[1].title} overlap on ${clash[0].dayLabel}. Please choose one of them.` }, { status: 400, headers });
    const target = store ?? await getSubmissionStore();
    for (const id of ids) {
      const session = wellnessSessionById.get(id)!;
      await target.add("workshop", newSubmission({ sessionId: session.id, sessionTitle: session.title, sessionDay: session.dayLabel, sessionTime: session.time, ...guest, category: "wellness" as const, ...waiver }, now));
    }
  } catch (error) {
    if (error instanceof BookingProblem) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    if (workflow || process.env.WELLNESS_BOOKING_ENABLED === "true") console.error("wellness booking save is pending; guest may retry the same request");
    else console.error("wellness store failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "We couldn’t save your sign-up. Please try again; your details are still here." }, { status: 500, headers });
  }
  return NextResponse.json({ ok: true }, { status: 201, headers });
}

async function postWithoutInbox(request: Request) {
  return handleWellnessPost(request);
}

// Oct 19: every request is stored in the submission inbox before validation (lib/staff/submission-inbox.ts).
export const POST = withSubmissionInbox("wellness", postWithoutInbox, {
  storeProvider: () => wellnessInboxStore(),
  limitHandledByWorkflow: () => process.env.WELLNESS_BOOKING_ENABLED === "true",
});
