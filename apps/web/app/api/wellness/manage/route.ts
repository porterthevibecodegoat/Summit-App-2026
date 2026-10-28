import { z } from "zod";
import { integrationJson, limitedBody, PayloadError } from "../../../../lib/integrations/http";
import { BookingProblem, type BookingWorkflow } from "../../../../lib/wellness-booking/service";
import { getWellnessWorkflow } from "../../../../lib/wellness-booking/workflow-store";
import { sameWebsiteOrigin } from "../../../../lib/wellness-booking/request-origin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ token: z.string().min(1).max(1024), action: z.enum(["view", "cancel"]), bookingId: z.string().max(180).optional(), requestId: z.uuid().optional() }).strict();

export async function handleManagePost(request: Request, workflow?: BookingWorkflow) {
  if (!sameWebsiteOrigin(request)) return integrationJson({ error: "Please use your private link on this website." }, 403);
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return integrationJson({ error: "Unsupported request." }, 415);
  try {
    let raw: unknown;
    try { raw = JSON.parse(await limitedBody(request, 4096)); } catch (error) { if (error instanceof PayloadError) throw error; return integrationJson({ error: "Invalid request." }, 400); }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return integrationJson({ error: "Please use your complete private link." }, 400);
    const booking = workflow ?? await getWellnessWorkflow();
    if (!booking) return integrationJson({ error: "Online booking management is not available yet." }, 503);
    const { token, action, bookingId, requestId } = parsed.data;
    return integrationJson(await booking.manage(token, action, bookingId, requestId));
  } catch (error) {
    if (error instanceof BookingProblem || error instanceof PayloadError) return integrationJson({ error: error.message }, error.status);
    return integrationJson({ error: "We couldn’t update your sign-up. Please try again." }, 503);
  }
}

// Deliberately not wrapped in the submission inbox: private capability tokens
// must never enter raw-request histories, query strings or application logs.
export async function POST(request: Request) { return handleManagePost(request); }
