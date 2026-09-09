import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type ReadinessStatus = "PASS" | "BLOCKED" | "WARN";

export type ReadinessCheck = {
  name: string;
  status: ReadinessStatus;
  blocker: boolean;
  detail: string;
};

export type ProductionReadinessReport = {
  status: "PASS" | "BLOCKED";
  blockers: number;
  warnings: number;
  checks: ReadinessCheck[];
};

type ReadinessOptions = {
  rootDir?: string;
  env?: Record<string, string | undefined>;
};

export function createProductionReadinessReport(options: ReadinessOptions = {}): ProductionReadinessReport {
  const rootDir = findRepoRoot(options.rootDir ?? process.cwd());
  const env = { ...loadDotEnv(rootDir), ...options.env };
  const checks = createChecks(rootDir, env);
  const blockers = checks.filter((check) => check.blocker && check.status !== "PASS").length;
  const warnings = checks.filter((check) => !check.blocker && check.status !== "PASS").length;

  return {
    status: blockers > 0 ? "BLOCKED" : "PASS",
    blockers,
    warnings,
    checks
  };
}

function createChecks(rootDir: string, env: Record<string, string | undefined>): ReadinessCheck[] {
  return [
    createCheck({
      name: "Supabase project URL",
      pass: hasEnv(env, "SUPABASE_URL") || hasEnv(env, "NEXT_PUBLIC_SUPABASE_URL"),
      blocker: true,
      detail: "Required before staff changes can publish through a real cloud backend."
    }),
    createCheck({
      name: "Supabase service role key",
      pass: hasServerSupabaseKey(env, "SUPABASE_SERVICE_ROLE_KEY"),
      blocker: true,
      detail:
        "Must be server-only. Required for deployed staff publish, audit, device registration, and notification job writes."
    }),
    createCheck({
      name: "Supabase publishable key",
      pass:
        hasPublicSupabaseKey(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
        hasPublicSupabaseKey(env, "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      blocker: true,
      detail: "Required for production staff auth/browser sessions."
    }),
    createCheck({
      name: "OpenAI API key",
      pass: hasEnv(env, "OPENAI_API_KEY"),
      blocker: true,
      detail: "Required before attendee concierge and staff AIs can use real model calls."
    }),
    createCheck({
      name: "AI feature flag",
      pass: env.ENABLE_AI === "true",
      blocker: false,
      detail: "Should stay false until server-side OpenAI wiring and evals are ready."
    }),
    createCheck({
      name: "EAS project ID",
      pass: hasRealEasProjectId(env),
      blocker: true,
      detail: "Required for Expo updates, dev/preview/prod build identity, and push registration."
    }),
    createCheck({
      name: "Push delivery flag",
      pass: env.ENABLE_PUSH_DELIVERY === "true",
      blocker: false,
      detail: "Should stay false until APNs/EAS credentials, device registration, and dispatch worker are verified."
    }),
    createCheck({
      name: "Notification dispatch flag",
      pass: env.ENABLE_NOTIFICATION_DISPATCH === "true",
      blocker: false,
      detail: "Should stay false until production push dispatch, retries, and audit updates are tested."
    }),
    createCheck({
      name: "Public API base URL",
      pass: hasEnv(env, "EXPO_PUBLIC_API_BASE_URL") && !String(env.EXPO_PUBLIC_API_BASE_URL).includes("localhost"),
      blocker: true,
      detail: "Production mobile builds must point at a deployed HTTPS API, not localhost."
    }),
    createCheck({
      name: "Privacy policy URL",
      pass: hasEnv(env, "APP_STORE_PRIVACY_URL"),
      blocker: true,
      detail: "Required before App Store submission."
    }),
    createCheck({
      name: "Support URL",
      pass: hasEnv(env, "APP_SUPPORT_URL"),
      blocker: true,
      detail: "Required before App Store submission."
    }),
    createCheck({
      name: "Supabase migrations present",
      pass:
        existsSync(resolve(rootDir, "supabase/migrations/202608310001_gate0_schema.sql")) &&
        existsSync(resolve(rootDir, "supabase/migrations/202609030001_live_ops_architecture.sql")) &&
        existsSync(resolve(rootDir, "supabase/migrations/202609030002_staff_auth_and_live_ops_rls.sql")) &&
        existsSync(resolve(rootDir, "supabase/migrations/202609090001_atomic_publish_and_function_security.sql")) &&
        existsSync(resolve(rootDir, "supabase/migrations/202609090002_notification_delivery_worker.sql")),
      blocker: false,
      detail:
        "Migrations define the live event, staff roles, revisions, audit, device registrations, and RLS foundation."
    }),
    createCheck({
      name: "Native icon and splash assets present",
      pass:
        existsSync(resolve(rootDir, "apps/mobile/assets/icon-premium.png")) &&
        existsSync(resolve(rootDir, "apps/mobile/assets/launch-art-premium.png")),
      blocker: false,
      detail: "Premium native icon and launch artwork are present; final stakeholder approval remains a release step."
    })
  ];
}

function createCheck(input: { name: string; pass: boolean; blocker: boolean; detail: string }): ReadinessCheck {
  return {
    name: input.name,
    status: input.pass ? "PASS" : input.blocker ? "BLOCKED" : "WARN",
    blocker: input.blocker,
    detail: input.detail
  };
}

function hasEnv(env: Record<string, string | undefined>, name: string) {
  const value = env[name];
  return Boolean(value && value.trim() && !value.includes("replace-with"));
}

function hasPublicSupabaseKey(env: Record<string, string | undefined>, name: string) {
  const value = env[name]?.trim() ?? "";
  return Boolean(value && !value.includes("replace-with") && (value.startsWith("sb_publishable_") || value.startsWith("eyJ")));
}

function hasServerSupabaseKey(env: Record<string, string | undefined>, name: string) {
  const value = env[name]?.trim() ?? "";
  return Boolean(value && !value.includes("replace-with") && (value.startsWith("sb_secret_") || value.startsWith("eyJ")));
}

function hasRealEasProjectId(env: Record<string, string | undefined>) {
  const projectId = env.EXPO_PUBLIC_EAS_PROJECT_ID ?? env.EAS_PROJECT_ID ?? "";
  return Boolean(projectId && !projectId.includes("replace-with"));
}

function loadDotEnv(rootDir: string) {
  const envPath = resolve(rootDir, ".env");
  if (!existsSync(envPath)) {
    return {};
  }

  return readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce<Record<string, string>>((env, rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        return env;
      }

      const separator = line.indexOf("=");
      if (separator <= 0) {
        return env;
      }

      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = value;
      return env;
    }, {});
}

function findRepoRoot(startDir: string) {
  const candidates = [
    startDir,
    resolve(startDir, "../.."),
    resolve(startDir, "../../..")
  ];

  return candidates.find((candidate) => existsSync(resolve(candidate, "pnpm-workspace.yaml"))) ?? startDir;
}
