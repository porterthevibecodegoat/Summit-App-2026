import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = findRepoRoot(process.cwd());
const offline = process.argv.includes("--offline");
const envPath = resolve(rootDir, ".env");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") process.loadEnvFile(envPath);

const { default: appConfig } = await import("../apps/mobile/app.config.ts");
const eas = JSON.parse(readFileSync(resolve(rootDir, "apps/mobile/eas.json"), "utf8"));
const nativeInfo = readFileSync(resolve(rootDir, "apps/mobile/ios/NotAloneSummit/Info.plist"), "utf8");
const privacyManifest = readFileSync(resolve(rootDir, "apps/mobile/ios/NotAloneSummit/PrivacyInfo.xcprivacy"), "utf8");
const checks = [];
const expectedEasProjectId = "5a79b65b-7080-4c27-84e1-8eb5e9d119fd";

check("App Store version is 1.0.0", appConfig.version === "1.0.0");
check("iOS build number is initialized", appConfig.ios?.buildNumber === "1");
check("iOS bundle identifier is final", appConfig.ios?.bundleIdentifier === "org.inspiringchildren.notalonesummit");
check("App is iPhone-only and portrait-oriented", appConfig.ios?.supportsTablet === false && appConfig.orientation === "portrait");
check("Export-compliance declaration is present", appConfig.ios?.infoPlist?.ITSAppUsesNonExemptEncryption === false && nativeInfo.includes("ITSAppUsesNonExemptEncryption"));
check("Unused Face ID permission is absent", !nativeInfo.includes("NSFaceIDUsageDescription"));
check("Notification purpose text is present", typeof appConfig.ios?.infoPlist?.NSUserNotificationsUsageDescription === "string");
check(
  "Notification background modes are declared",
  appConfig.ios?.infoPlist?.UIBackgroundModes?.includes("fetch") === true &&
    appConfig.ios?.infoPlist?.UIBackgroundModes?.includes("remote-notification") === true &&
    nativeInfo.includes("<string>fetch</string>") &&
    nativeInfo.includes("<string>remote-notification</string>")
);
check("Privacy manifest declares no tracking", privacyManifest.includes("NSPrivacyTracking") && privacyManifest.includes("<false/>"));
check("Privacy manifest declares required-reason APIs", privacyManifest.includes("NSPrivacyAccessedAPITypes"));
check("EAS project identity is linked", appConfig.owner === "inspiring-children-foundation" && appConfig.extra?.eas?.projectId === expectedEasProjectId);
check("Expo Updates targets the linked project", appConfig.updates?.enabled === true && appConfig.updates?.url === `https://u.expo.dev/${expectedEasProjectId}`);

const apiBaseUrl = String(appConfig.extra?.apiBaseUrl ?? "");
check("Mobile API uses public HTTPS", isPublicHttpsUrl(apiBaseUrl));
for (const profile of ["preview", "production"]) {
  const profileEnv = eas.build?.[profile]?.env ?? {};
  check(`${profile} build uses the deployed HTTPS API`, profileEnv.EXPO_PUBLIC_API_BASE_URL === apiBaseUrl && isPublicHttpsUrl(profileEnv.EXPO_PUBLIC_API_BASE_URL));
  check(`${profile} build excludes Demo Mode`, profileEnv.EXPO_PUBLIC_ENABLE_DEMO_MODE === "false");
  check(`${profile} push remains safely disabled`, profileEnv.EXPO_PUBLIC_ENABLE_PUSH_DELIVERY === "false");
}

const serializedPublicConfig = JSON.stringify({ appConfig, eas });
check("Public build configuration contains no elevated credential", !/(sb_secret_|sk-[A-Za-z0-9]|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|EXPO_ACCESS_TOKEN|CRON_SECRET)/.test(serializedPublicConfig));

const iconPath = resolve(rootDir, "apps/mobile/assets/icon-premium.png");
const launchPath = resolve(rootDir, "apps/mobile/assets/launch-art-premium.png");
check("Premium app icon exists", existsSync(iconPath));
check("Launch artwork exists", existsSync(launchPath));
if (existsSync(iconPath)) {
  const dimensions = imageDimensions(iconPath);
  check("App icon is 1024 by 1024 pixels", dimensions.width === 1024 && dimensions.height === 1024, `${dimensions.width}x${dimensions.height}`);
  check("App icon has no alpha channel", dimensions.hasAlpha === false);
}

const privacyUrl = process.env.APP_STORE_PRIVACY_URL ?? "";
const supportUrl = process.env.APP_SUPPORT_URL ?? "";
await checkUrl("Public privacy policy is reachable", privacyUrl);
await checkUrl("Public support page is reachable", supportUrl);
await checkJson("Published snapshot API is reachable", `${apiBaseUrl}/api/snapshot`, (body) => Number.isInteger(body.revision) && Array.isArray(body.scheduleItems));
await checkJson("Public health endpoint reports Supabase", `${apiBaseUrl}/api/health`, (body) => body.ok === true && body.backendMode === "supabase");

for (const item of checks) {
  console.log(`${item.passed ? "PASS" : "FAIL"} - ${item.name}${item.detail ? ` (${item.detail})` : ""}`);
}
const failures = checks.filter((item) => !item.passed);
console.log(`\nRelease preflight: ${failures.length === 0 ? "PASS" : "FAIL"} (${checks.length - failures.length}/${checks.length} checks)`);
if (failures.length > 0) process.exitCode = 1;

function check(name, passed, detail = "") {
  checks.push({ name, passed: Boolean(passed), detail });
}

async function checkUrl(name, url) {
  if (!isPublicHttpsUrl(url)) return check(name, false, "missing public HTTPS URL");
  if (offline) return check(name, true, "offline URL validation");
  try {
    const response = await fetch(url, { redirect: "follow", cache: "no-store" });
    check(name, response.ok, `HTTP ${response.status}`);
  } catch {
    check(name, false, "request failed");
  }
}

async function checkJson(name, url, validate) {
  if (offline) return check(name, isPublicHttpsUrl(url), "offline URL validation");
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    const body = await response.json();
    check(name, response.ok && validate(body), `HTTP ${response.status}`);
  } catch {
    check(name, false, "request failed");
  }
}

function imageDimensions(path) {
  const image = readFileSync(path);
  const pngSignature = "89504e470d0a1a0a";
  if (image.subarray(0, 8).toString("hex") !== pngSignature || image.subarray(12, 16).toString("ascii") !== "IHDR") {
    return { width: 0, height: 0, hasAlpha: true };
  }

  const colorType = image[25];
  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
    hasAlpha: colorType === 4 || colorType === 6 || image.includes(Buffer.from("tRNS"))
  };
}

function isPublicHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function findRepoRoot(startDir) {
  const candidates = [startDir, resolve(startDir, "../.."), resolve(startDir, "../../..")];
  return candidates.find((candidate) => existsSync(resolve(candidate, "pnpm-workspace.yaml"))) ?? startDir;
}
