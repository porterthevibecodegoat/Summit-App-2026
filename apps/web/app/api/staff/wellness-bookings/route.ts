import { cookies } from "next/headers";
import { z } from "zod";
import { staffCookieName, isStaffSession } from "../../../../lib/staff/auth";
import { integrationJson, limitedBody, PayloadError } from "../../../../lib/integrations/http";
import { BookingProblem, type BookingWorkflow } from "../../../../lib/wellness-booking/service";
import { getWellnessWorkflow } from "../../../../lib/wellness-booking/workflow-store";
import { sameWebsiteOrigin } from "../../../../lib/wellness-booking/request-origin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function handleStaffBookings(request: Request, dependencies: { authorized: boolean; workflow?: BookingWorkflow }) {
  if (!dependencies.authorized) return integrationJson({ error: "Staff sign-in required." }, 401);
  if (request.method !== "GET" && request.method !== "POST") return integrationJson({ error: "Unsupported request." }, 405);
  if (request.method === "POST" && !sameWebsiteOrigin(request)) return integrationJson({ error: "Use the staff page on this website." }, 403);
  try {
    const workflow = dependencies.workflow ?? await getWellnessWorkflow();
    if (!workflow) return integrationJson({ error: "Booking management is not enabled yet." }, 503);
    if (request.method === "GET" && new URL(request.url).searchParams.get("download") === "backup") {
      const response = integrationJson(await workflow.backup());
      response.headers.set("Content-Disposition", 'attachment; filename="wellness-bookings-private.json"');
      return response;
    }
    if (request.method === "POST") {
      if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return integrationJson({ error: "Unsupported request." }, 415);
      const input = z.discriminatedUnion("action", [z.object({ action: z.literal("recover"), intakeId: z.uuid() }).strict(), z.object({ action: z.literal("cancel"), bookingId: z.string().max(180), requestId: z.uuid() }).strict()]).safeParse(JSON.parse(await limitedBody(request, 1024)));
      if (!input.success) return integrationJson({ error: "Choose a pending signup to recover." }, 400);
      if (input.data.action === "recover") await workflow.recover(input.data.intakeId);
      else await workflow.staffCancel(input.data.bookingId, input.data.requestId);
    }
    return integrationJson({ ...await workflow.summary(), sendApproval: process.env.INTEGRATION_SMS_SEND_APPROVED === "true" ? "approved" : "pending" });
  } catch (error) {
    if (error instanceof BookingProblem || error instanceof PayloadError) return integrationJson({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return integrationJson({ error: "Invalid request." }, 400);
    return integrationJson({ error: "A complete booking snapshot is unavailable. Please retry." }, 503);
  }
}
async function authorized() { return isStaffSession((await cookies()).get(staffCookieName)?.value); }
export async function GET(request: Request) { return handleStaffBookings(request, { authorized: await authorized() }); }
export async function POST(request: Request) { return handleStaffBookings(request, { authorized: await authorized() }); }
