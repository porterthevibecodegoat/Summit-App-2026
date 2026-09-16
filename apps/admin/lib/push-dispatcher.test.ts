import { afterEach, describe, expect, it, vi } from "vitest";
import { demoSnapshot } from "@not-alone/test-fixtures";
import { checkExpoPushReceipts, dispatchDuePushNotifications, deviceMatchesAudience, isExpoPushToken } from "./push-dispatcher";

const device = {
  id: "8ce3893d-1609-46f1-9d58-5585a1ef27c4",
  expo_push_token: "ExponentPushToken[valid_device-token]",
  audience_groups: ["public", "founders"]
};

describe("push dispatcher targeting", () => {
  it("accepts Expo push tokens and rejects raw or malformed values", () => {
    expect(isExpoPushToken("ExponentPushToken[valid_device-token]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[another_token]")).toBe(true);
    expect(isExpoPushToken("secret-device-token")).toBe(false);
  });

  it("sends public jobs to every registered device and scopes private audiences", () => {
    expect(deviceMatchesAudience(device, "public")).toBe(true);
    expect(deviceMatchesAudience(device, "founders")).toBe(true);
    expect(deviceMatchesAudience(device, "vip")).toBe(false);
  });
});

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const item = demoSnapshot.scheduleItems[0]!;
const job = { id: "test-job", schedule_item_id: item.id, schedule_revision: demoSnapshot.revision, audience_scope: "public", send_after_utc: "2026-01-01T00:00:00Z", attempt_count: 2, payload: null };
function mockBackend(options: { expoFailure?: boolean; priorSuccess?: boolean; receipt?: "ok" | "unregistered" | "pending" } = {}) {
  vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-key");
  const writes: Array<{ url: string; body: Record<string, unknown> | Array<Record<string, unknown>> }> = [];
  const send = vi.fn();
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
    if (input.includes("exp.host")) {
      if (input.endsWith("getReceipts")) return json({ data: options.receipt === "pending" ? {} : { ticket: options.receipt === "ok" ? { status: "ok" } : { status: "error", details: { error: "DeviceNotRegistered" } } } });
      send(JSON.parse(String(init?.body)));
      if (options.expoFailure) throw new Error("Network disconnected");
      return json({ data: [{ status: "ok", id: "ticket" }] });
    }
    if (input.includes("claim_due_notification_jobs")) return json([job]);
    if (init?.method === "PATCH" || init?.method === "POST") {
      writes.push({ url: input, body: JSON.parse(String(init.body)) });
      return new Response(null, { status: init.method === "PATCH" ? 204 : 201 });
    }
    if (input.includes("attendee_device_registrations")) return json([device]);
    if (input.includes("expo_ticket_id=not.is.null")) return json([{ id: "attempt", notification_job_id: job.id, device_registration_id: device.id, expo_ticket_id: "ticket" }]);
    if (input.includes("select=status,error_message")) return json([{ status: options.receipt === "ok" ? "delivered" : "failed", error_message: options.receipt === "ok" ? null : "DeviceNotRegistered" }]);
    if (input.includes("notification_delivery_attempts")) return json(options.priorSuccess ? [{ notification_job_id: job.id, device_registration_id: device.id, status: "accepted" }] : []);
    throw new Error("Unexpected test request");
  }));
  return { writes, send };
}

describe("push dispatch and receipts", () => {
  it("records accepted tickets with the job/device conflict target for retries", async () => {
    const { writes, send } = mockBackend();
    const result = await dispatchDuePushNotifications(demoSnapshot);
    expect(result.acceptedDeliveries).toBe(1);
    expect(send).toHaveBeenCalledWith([expect.objectContaining({ data: expect.objectContaining({ scheduleItemId: item.id }) })]);
    expect(writes.some(write => write.url.includes("on_conflict=notification_job_id,device_registration_id"))).toBe(true);
    expect(writes.at(-1)?.body).toMatchObject({ status: "accepted", delivered_at: null });
  });

  it("marks network outages failed so the worker can retry", async () => {
    const { writes } = mockBackend({ expoFailure: true });
    const result = await dispatchDuePushNotifications(demoSnapshot);
    expect(result.failedJobs).toBe(1);
    expect(result.acceptedDeliveries).toBe(0);
    expect(writes.at(-1)?.body).toMatchObject({ status: "failed" });
  });

  it("does not resend to a device with an accepted ticket", async () => {
    const { send } = mockBackend({ priorSuccess: true });
    expect((await dispatchDuePushNotifications(demoSnapshot)).completedJobs).toBe(1);
    expect(send).not.toHaveBeenCalled();
  });

  it("records successful provider receipts", async () => {
    const { writes } = mockBackend({ receipt: "ok" });
    expect(await checkExpoPushReceipts()).toMatchObject({ delivered: 1, failed: 0 });
    expect(writes[0]?.body).toMatchObject({ status: "delivered" });
  });

  it("disables devices that the provider says are unregistered", async () => {
    const { writes } = mockBackend({ receipt: "unregistered" });
    expect(await checkExpoPushReceipts()).toMatchObject({ failed: 1, disabledDevices: 1 });
    expect(writes.some(write => write.url.includes("attendee_device_registrations") && "disabled_at" in write.body)).toBe(true);
  });

  it("leaves pending receipts pending", async () => {
    const { writes } = mockBackend({ receipt: "pending" });
    expect(await checkExpoPushReceipts()).toMatchObject({ checked: 1, delivered: 0, failed: 0 });
    expect(writes).toHaveLength(0);
  });
});
