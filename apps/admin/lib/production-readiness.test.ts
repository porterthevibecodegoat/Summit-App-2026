import { describe, expect, it } from "vitest";
import { createProductionReadinessReport } from "./production-readiness";

const rootDir = new URL("../../..", import.meta.url).pathname;

describe("production readiness", () => {
  it("leaves only OpenAI and EAS as credential blockers when staging and policy URLs are configured", () => {
    const report = createProductionReadinessReport({
      rootDir,
      env: {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test-value",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-value",
        EXPO_PUBLIC_API_BASE_URL: "https://summit.example.org",
        APP_STORE_PRIVACY_URL: "https://summit.example.org/privacy",
        APP_SUPPORT_URL: "https://summit.example.org/support",
        OPENAI_API_KEY: "",
        EXPO_PUBLIC_EAS_PROJECT_ID: "",
        ENABLE_AI: "false",
        ENABLE_PUSH_DELIVERY: "false",
        ENABLE_NOTIFICATION_DISPATCH: "false"
      }
    });

    expect(report.status).toBe("BLOCKED");
    expect(report.blockers).toBe(2);
    expect(report.checks.filter((check) => check.blocker && check.status === "BLOCKED").map((check) => check.name))
      .toEqual(["OpenAI API key", "EAS project ID"]);
  });

  it("rejects placeholders and localhost release endpoints", () => {
    const report = createProductionReadinessReport({
      rootDir,
      env: {
        SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "replace-with-service-key",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "replace-with-publishable-key",
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
        EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000",
        APP_STORE_PRIVACY_URL: "",
        APP_SUPPORT_URL: ""
      }
    });

    expect(report.checks.find((check) => check.name === "Supabase service role key")?.status).toBe("BLOCKED");
    expect(report.checks.find((check) => check.name === "Supabase project URL")?.status).toBe("BLOCKED");
    expect(report.checks.find((check) => check.name === "Supabase publishable key")?.status).toBe("BLOCKED");
    expect(report.checks.find((check) => check.name === "Public API base URL")?.status).toBe("BLOCKED");
  });

  it("never includes credential values in the report", () => {
    const secret = "sb_secret_must-never-appear";
    const report = createProductionReadinessReport({
      rootDir,
      env: { SUPABASE_SERVICE_ROLE_KEY: secret }
    });

    expect(JSON.stringify(report)).not.toContain(secret);
  });
});
