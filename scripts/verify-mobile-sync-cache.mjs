import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = findRepoRoot(process.cwd());
const envPath = resolve(rootDir, ".env");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") process.loadEnvFile(envPath);

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
if (!apiBaseUrl.startsWith("https://")) fail("EXPO_PUBLIC_API_BASE_URL must be a public HTTPS URL.");

const container = run("xcrun", ["simctl", "get_app_container", "booted", "org.inspiringchildren.notalonesummit", "data"]).trim();
const database = resolve(container, "Documents/SQLite/ExpoSQLiteStorage");
if (!existsSync(database)) fail("The booted Simulator does not contain the mobile snapshot cache yet.");

const rawRows = run("sqlite3", ["-json", database,
  "select value from storage where key='not-alone.published-snapshot-cache.v1';"]);
const rows = JSON.parse(rawRows || "[]");
if (!rows[0]?.value) fail("No published snapshot is cached in the booted Simulator.");
const cachedValue = JSON.parse(rows[0].value);
const cached = cachedValue.snapshot ?? cachedValue;

const response = await fetch(`${apiBaseUrl}/api/snapshot`, { headers: { Accept: "application/json" }, cache: "no-store" });
if (!response.ok) fail(`Snapshot API returned HTTP ${response.status}.`);
const remote = await response.json();

const checks = [
  ["event identity matches", cached.event?.id === remote.event?.id],
  ["revision matches", cached.revision === remote.revision],
  ["schedule count matches", cached.scheduleItems?.length === remote.scheduleItems?.length],
  ["location count matches", cached.locations?.length === remote.locations?.length],
  ["content-page count matches", cached.contentPages?.length === remote.contentPages?.length]
];
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} - ${name}`);
console.log(`\nRemote revision ${remote.revision}; native cache revision ${cached.revision}; ${cached.scheduleItems?.length ?? 0} sessions.`);
if (checks.some(([, passed]) => !passed)) process.exitCode = 1;

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8" });
  } catch {
    fail(`Unable to run ${command}. Confirm an iOS Simulator is booted and the app has launched.`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function findRepoRoot(startDir) {
  const candidates = [startDir, resolve(startDir, "../.."), resolve(startDir, "../../..")];
  return candidates.find((candidate) => existsSync(resolve(candidate, "pnpm-workspace.yaml"))) ?? startDir;
}
