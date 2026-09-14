import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const testEnv = {
  ...process.env,
  ENABLE_AI: "false",
  RESPONSIVE_TEST_MODE: "1"
};
const commonOptions = { cwd: root, env: testEnv, stdio: "inherit" };

execFileSync(pnpm, ["--filter", "@not-alone/admin", "build"], commonOptions);
execFileSync(
  pnpm,
  ["--filter", "@not-alone/mobile", "exec", "expo", "export", "--platform", "web", "--output-dir", "../../work/responsive-web-export"],
  {
    ...commonOptions,
    env: {
      ...testEnv,
      CI: "1",
      EXPO_NO_TELEMETRY: "1",
      EXPO_NO_METRO_WORKSPACE_ROOT: "1",
      EXPO_PUBLIC_API_BASE_URL: "http://127.0.0.1:3010",
      HOME: resolve(root, "work/runtime")
    }
  }
);
execFileSync(pnpm, ["exec", "playwright", "test", "--config", "playwright.mobile.config.ts"], commonOptions);
