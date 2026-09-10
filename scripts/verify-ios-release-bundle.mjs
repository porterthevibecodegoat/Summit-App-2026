import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = findRepoRoot(process.cwd());
const appPath = resolve(
  rootDir,
  process.argv.find((argument) => argument.endsWith(".app")) ??
    "../work/release-derived-data/Build/Products/Release-iphonesimulator/NotAloneSummit.app"
);

if (!existsSync(appPath)) fail(`Release app bundle not found at ${appPath}.`);

const infoPath = resolve(appPath, "Info.plist");
const info = JSON.parse(execFileSync("plutil", ["-convert", "json", "-o", "-", infoPath], { encoding: "utf8" }));
const expoConfig = JSON.parse(readFileSync(resolve(appPath, "EXConstants.bundle/app.config"), "utf8"));
const checks = [];

check("Bundle identifier is final", info.CFBundleIdentifier === "org.inspiringchildren.notalonesummit");
check("Release version is 1.0.0", info.CFBundleShortVersionString === "1.0.0");
check("Release build number is 1", info.CFBundleVersion === "1");
check("Export compliance is declared", info.ITSAppUsesNonExemptEncryption === false);
check("Unused Face ID permission is absent", !("NSFaceIDUsageDescription" in info));
check("Release bundle has no local-network permission", !("NSLocalNetworkUsageDescription" in info));
check("Release bundle has no Bonjour services", !("NSBonjourServices" in info));
check("Release bundle disallows local transport exceptions", info.NSAppTransportSecurity?.NSAllowsLocalNetworking !== true);
check("Privacy manifest is bundled", findNamedFile(appPath, "PrivacyInfo.xcprivacy"));
check(
  "Compiled mobile API uses deployed HTTPS",
  expoConfig.extra?.apiBaseUrl === "https://summit-app-2026-admin.vercel.app"
);

const forbidden = [
  ["Supabase service credential", /sb_secret_[A-Za-z0-9_-]{8,}/],
  ["OpenAI credential", /sk-[A-Za-z0-9_-]{16,}/],
  ["service-role environment name", /SUPABASE_SERVICE_ROLE_KEY/],
  ["OpenAI environment name", /OPENAI_API_KEY/],
  ["cron credential name", /CRON_SECRET/],
  ["local app API URL", /https?:\/\/(?:localhost|127\.0\.0\.1):(?:3000|54321)(?!\d)/]
];
const violations = scanBundle(appPath, forbidden);
for (const [name] of forbidden) check(`Bundle excludes ${name}`, !violations.has(name));

for (const item of checks) console.log(`${item.passed ? "PASS" : "FAIL"} - ${item.name}`);
const failed = checks.filter((item) => !item.passed);
console.log(`\niOS release bundle: ${failed.length === 0 ? "PASS" : "FAIL"} (${checks.length - failed.length}/${checks.length} checks)`);
if (failed.length > 0) process.exitCode = 1;

function check(name, passed) {
  checks.push({ name, passed: Boolean(passed) });
}

function findNamedFile(directory, target) {
  return walk(directory).some((path) => path.endsWith(`/${target}`));
}

function scanBundle(directory, patterns) {
  const violations = new Set();
  for (const path of walk(directory)) {
    if (statSync(path).size > 100_000_000) continue;
    const content = readFileSync(path).toString("latin1");
    for (const [name, pattern] of patterns) {
      if (pattern.test(content)) violations.add(name);
    }
  }
  return violations;
}

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function findRepoRoot(startDir) {
  const candidates = [startDir, resolve(startDir, "../.."), resolve(startDir, "../../..")];
  return candidates.find((candidate) => existsSync(resolve(candidate, "pnpm-workspace.yaml"))) ?? startDir;
}
