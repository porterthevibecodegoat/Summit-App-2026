import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateStaffAccessToken, StaffAuthError } from "./live-ops-repository";

describe("Supabase staff administrator activation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("provisions an invited staff identity as ADMIN during authentication", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-test-key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        id: "11111111-1111-4111-8111-111111111111",
        email: "staff@example.com",
        invited_at: "2026-09-09T20:00:00.000Z"
      }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(undefined, 201));
    vi.stubGlobal("fetch", fetchMock);

    const staff = await authenticateStaffAccessToken("valid-access-token", ["ADMIN"]);

    expect(staff).toEqual({
      actorId: "11111111-1111-4111-8111-111111111111",
      role: "ADMIN",
      mode: "supabase"
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/rest/v1/staff_profiles?on_conflict=user_id"),
      expect.objectContaining({
        body: expect.stringContaining('"role":"ADMIN"'),
        method: "POST"
      })
    );
  });

  it("does not provision an uninvited identity without an existing profile", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-test-key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ id: "uninvited-user", email: "unknown@example.com" }))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(authenticateStaffAccessToken("valid-access-token", ["ADMIN"]))
      .rejects.toEqual(expect.objectContaining<Partial<StaffAuthError>>({ status: 403 }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

function jsonResponse(value: unknown, status = 200) {
  return {
    status,
    text: async () => value === undefined ? "" : JSON.stringify(value)
  };
}
