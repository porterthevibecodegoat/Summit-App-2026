import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as tickets } from "./tickets/route";
import { POST as messages } from "./messages/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("retired collaborator submission flows", () => {
  it.each([tickets, messages])("returns Gone without contacting a provider", async (post) => {
    vi.stubEnv("MESSAGE_DELIVERY_WEBHOOK_URL", "https://example.org/delivery");
    vi.stubEnv("MESSAGE_DELIVERY_WEBHOOK_SECRET", "test-secret");
    vi.stubEnv("TICKET_RESERVATION_WEBHOOK_URL", "https://example.org/reserve");
    vi.stubEnv("TICKET_RESERVATION_WEBHOOK_SECRET", "test-secret");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await post();
    expect(response.status).toBe(410);
    expect(await response.text()).toContain("No ");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
