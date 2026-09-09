import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("staff sign-in link route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  it("requests an invite-only magic link back to the portal origin", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("https://staff.example.com/api/staff/sign-in", {
      method: "POST",
      body: JSON.stringify({ email: "STAFF@EXAMPLE.COM" }),
      headers: { "Content-Type": "application/json" }
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/otp?redirect_to=https%3A%2F%2Fstaff.example.com",
      expect.objectContaining({
        body: JSON.stringify({ email: "staff@example.com", create_user: false }),
        cache: "no-store"
      })
    );
  });

  it("rejects an invalid email before contacting Supabase", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest("https://staff.example.com/api/staff/sign-in", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email" }),
      headers: { "Content-Type": "application/json" }
    });

    const response = await POST(request);

    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
