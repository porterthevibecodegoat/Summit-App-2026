import { describe, expect, it } from "vitest";
import { canProvisionAdmin, createAdminProfile } from "./staff-access";

describe("staff administrator provisioning", () => {
  it("allows an invited Supabase user to receive administrator access", () => {
    expect(canProvisionAdmin({ id: "staff-1", invited_at: "2026-09-09T20:00:00.000Z" }, false)).toBe(true);
  });

  it("allows an existing staff profile to be upgraded", () => {
    expect(canProvisionAdmin({ id: "staff-2" }, true)).toBe(true);
  });

  it("rejects an uninvited user without a staff profile", () => {
    expect(canProvisionAdmin({ id: "staff-3" }, false)).toBe(false);
  });

  it("creates the canonical administrator profile", () => {
    expect(createAdminProfile({ id: "staff-4", email: "team@inspiringchildren.org" })).toMatchObject({
      user_id: "staff-4",
      display_name: "team",
      role: "ADMIN",
      emergency_broadcast_enabled: true
    });
  });
});
