import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as tickets } from "./tickets/route";
import { POST as messages } from "./messages/route";

vi.mock("../../lib/people", () => ({ people2026: [{ name: "Test Recipient", messageable: true }] }));

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const request = (body: unknown) => new Request("https://example.org/api", { method: "POST", body: JSON.stringify(body) });
const message = { recipient: "Test Recipient", senderName: "Sender", senderEmail: "sender@example.org", intent: "connect", message: "Please connect with me.", consent: "yes" };

describe("website submissions", () => {
  it("rejects malformed JSON for both endpoints", async () => {
    for (const post of [tickets, messages]) {
      expect((await post(new Request("https://example.org/api", { method: "POST", body: "{" }))).status).toBe(400);
    }
  });

  it("does not send messages without a server-side delivery secret", async () => {
    vi.stubEnv("MESSAGE_DELIVERY_WEBHOOK_URL", "https://example.org/delivery");
    vi.stubEnv("MESSAGE_DELIVERY_WEBHOOK_SECRET", "");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await messages(request(message))).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles provider outages without reporting success", async () => {
    vi.stubEnv("MESSAGE_DELIVERY_WEBHOOK_URL", "https://example.org/delivery");
    vi.stubEnv("MESSAGE_DELIVERY_WEBHOOK_SECRET", "test-secret");
    vi.stubEnv("TICKET_RESERVATION_WEBHOOK_URL", "https://example.org/reserve");
    vi.stubEnv("TICKET_RESERVATION_WEBHOOK_SECRET", "test-secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await messages(request(message))).status).toBe(502);
    expect((await tickets(request({ name: "Sender", email: "sender@example.org", donation: 0 }))).status).toBe(502);
  });
});
