import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const bundleId = "org.inspiringchildren.notalonesummit";
const cacheKey = "not-alone.published-snapshot-cache.v1";

const rootDir = findRepoRoot(process.cwd());
const envPath = resolve(rootDir, ".env");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") process.loadEnvFile(envPath);

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
if (!apiBaseUrl.startsWith("https://")) fail("EXPO_PUBLIC_API_BASE_URL must be a public HTTPS URL.");

const requestedSimulator = process.env.MOBILE_SIMULATOR_UDID?.trim();
const simulatorIds = requestedSimulator ? [requestedSimulator] : bootedSimulatorIds();
if (simulatorIds.length === 0) fail("No booted iOS Simulator is available.");

let cachedValue;
let cacheSimulatorId;
for (const simulatorId of simulatorIds) {
  const container = tryRun("xcrun", ["simctl", "get_app_container", simulatorId, bundleId, "data"])?.trim();
  if (!container) continue;

  cachedValue = readCachedValue(container);
  if (!cachedValue) continue;
  cacheSimulatorId = simulatorId;
  break;
}

if (!cachedValue || !cacheSimulatorId) {
  fail("None of the booted Simulators contains a published mobile snapshot cache yet.");
}
const cached = cachedValue.snapshot ?? cachedValue;

const response = await fetch(`${apiBaseUrl}/api/snapshot`, { headers: { Accept: "application/json" }, cache: "no-store" });
if (!response.ok) fail(`Snapshot API returned HTTP ${response.status}.`);
const remote = await response.json();

const checks = [
  ["event identity matches", cached.event?.id === remote.event?.id],
  ["revision matches", cached.revision === remote.revision],
  ["schedule count matches", cached.scheduleItems?.length === remote.scheduleItems?.length],
  ["session identities, titles, times, locations, and status match", scheduleFingerprint(cached) === scheduleFingerprint(remote)],
  ["location count matches", cached.locations?.length === remote.locations?.length],
  ["content-page count matches", cached.contentPages?.length === remote.contentPages?.length]
];
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} - ${name}`);
console.log(`\nSimulator ${cacheSimulatorId}; remote revision ${remote.revision}; native cache revision ${cached.revision}; ${cached.scheduleItems?.length ?? 0} sessions.`);
if (checks.some(([, passed]) => !passed)) process.exitCode = 1;

function scheduleFingerprint(snapshot) {
  return JSON.stringify((snapshot.scheduleItems ?? []).map(item => ({
    id: item.id, title: item.title, startUtc: item.startUtc, endUtc: item.endUtc,
    locationId: item.locationId, locationName: item.locationName, status: item.status
  })).sort((left, right) => left.id.localeCompare(right.id)));
}

function bootedSimulatorIds() {
  const raw = run("xcrun", ["simctl", "list", "devices", "booted", "--json"]);
  const parsed = JSON.parse(raw);
  return Object.values(parsed.devices ?? {})
    .flat()
    .filter((device) => device.state === "Booted")
    .map((device) => device.udid);
}

function tryRun(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8" });
  } catch {
    fail(`Unable to run ${command}. Confirm an iOS Simulator is booted and the app has launched.`);
  }
}

function readCachedValue(container) {
  const legacyDatabase = resolve(container, "Documents/SQLite/ExpoSQLiteStorage");
  if (existsSync(legacyDatabase)) {
    const rawRows = tryRun("sqlite3", ["-json", legacyDatabase,
      `select value from storage where key='${cacheKey}';`]);
    const rows = JSON.parse(rawRows || "[]");
    if (rows[0]?.value) return JSON.parse(rows[0].value);
  }

  const storageDirectory = resolve(
    container,
    `Library/Application Support/${bundleId}/RCTAsyncLocalStorage_V1`
  );
  const manifestPath = resolve(storageDirectory, "manifest.json");
  if (!existsSync(manifestPath)) return null;

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const inlineValue = manifest[cacheKey];
  if (typeof inlineValue === "string") return JSON.parse(inlineValue);
  if (inlineValue !== null) return null;

  const filename = createHash("md5").update(cacheKey).digest("hex");
  const valuePath = resolve(storageDirectory, filename);
  return existsSync(valuePath) ? JSON.parse(readFileSync(valuePath, "utf8")) : null;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function findRepoRoot(startDir) {
  const candidates = [startDir, resolve(startDir, "../.."), resolve(startDir, "../../..")];
  return candidates.find((candidate) => existsSync(resolve(candidate, "pnpm-workspace.yaml"))) ?? startDir;
}
