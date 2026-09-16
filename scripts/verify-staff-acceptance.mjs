import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chromium } from "@playwright/test";

process.loadEnvFile(".env");
const cloud = "https://summit-app-2026-admin.vercel.app";
const supabase = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert(supabase && secret && publicKey, "Supabase configuration is required");
const eventId = `acceptance-${randomUUID()}`;
const base = "http://127.0.0.1:3014";
const checks = [];
let userId, browser, server, page;
const output = "work/acceptance";
await mkdir(output, { recursive: true });

async function db(path, method = "GET", data, key = secret) {
  const response = await fetch(`${supabase}${path}`, {
    method, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: AbortSignal.timeout(15000)
  });
  assert(response.ok, `Backend ${method} ${path.split("?")[0]} returned ${response.status}`);
  return response.status === 204 ? null : response.json().catch(() => null);
}
function pass(name) { checks.push({ name, passed: true }); console.log(`PASS - ${name}`); }
const baseline = await (await fetch(`${cloud}/api/snapshot`)).json();
try {
  const snapshot = JSON.parse(JSON.stringify(baseline).replaceAll(baseline.event.id, eventId));
  snapshot.revision = 1;
  snapshot.event.name = "Isolated acceptance event";
  await db("/rest/v1/events", "POST", [{ id: eventId, name: snapshot.event.name, organization_name: "Acceptance testing", time_zone: "America/Los_Angeles", content_revision: 1, demo: true }]);
  await db("/rest/v1/schedule_revisions", "POST", [{ event_id: eventId, revision: 1, source: "SYSTEM", snapshot }]);
  const password = `Acceptance-${randomUUID()}-Aa1!`;
  const email = `${eventId}@example.com`;
  const user = await db("/auth/v1/admin/users", "POST", { email, password, email_confirm: true });
  userId = user.id;
  await db("/rest/v1/staff_profiles", "POST", [{ user_id: userId, role: "ADMIN", display_name: "Temporary acceptance tester" }]);
  const session = await db("/auth/v1/token?grant_type=password", "POST", { email, password }, publicKey);
  pass("Real Supabase authentication for temporary staff identity");

  server = spawn(process.execPath, ["scripts/start-admin-next.mjs", "start", "--hostname", "127.0.0.1", "--port", "3014"], {
    env: { ...process.env, EVENT_ID: eventId, ENABLE_AI: "false", ENABLE_PUSH_DELIVERY: "false", ENABLE_NOTIFICATION_DISPATCH: "false" },
    stdio: "ignore", detached: true
  });
  for (let i = 0; i < 40; i++) {
    const response = await fetch(`${base}/api/health`).catch(() => null);
    if (response?.ok) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const isolated = await (await fetch(`${base}/api/snapshot`)).json();
  assert.equal(isolated.event.id, eventId, "Refusing writes: server must target isolated event");
  pass("Production server is isolated from public event");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}/schedule`);
  await page.getByRole("heading", { name: "Staff sign in", exact: true }).waitFor();
  assert.equal((await context.request.get(`${base}/api/live-ops/state`)).status(), 401);
  pass("Signed-out browser and API deny staff access");
  const authHash = new URLSearchParams({ access_token: session.access_token, refresh_token: session.refresh_token, expires_in: String(session.expires_in) });
  await page.goto("about:blank");
  await page.goto(`${base}/schedule#${authHash}`);
  await page.getByText("Staff ADMIN active", { exact: true }).waitFor({ timeout: 30000 });
  await page.waitForURL(url => !url.hash, { timeout: 5000 });
  const cookies = await context.cookies();
  assert(cookies.some(cookie => cookie.name === "not-alone.staff.access" && cookie.httpOnly && cookie.sameSite === "Strict"));
  pass("Browser sign-in callback exchanges tokens for HttpOnly session and clears URL");

  // Exercise the deployed session endpoints, without publishing to the public event.
  const deployed = await browser.newContext();
  const exchange = await deployed.request.post(`${cloud}/api/staff/session`, { data: { accessToken: session.access_token, expiresIn: session.expires_in } });
  assert.equal(exchange.status(), 200);
  assert.equal((await deployed.request.get(`${cloud}/api/staff/me`)).status(), 200);
  assert.equal((await deployed.request.get(`${cloud}/api/live-ops/state`)).status(), 200);
  const deployedPage = await deployed.newPage();
  await deployedPage.goto(`${cloud}/schedule#${authHash}`);
  await deployedPage.getByText("Staff ADMIN active", { exact: true }).waitFor({ timeout: 30000 });
  await deployedPage.waitForURL(url => !url.hash, { timeout: 10000 });
  await deployed.request.delete(`${cloud}/api/staff/session`);
  assert.equal((await deployed.request.get(`${cloud}/api/staff/me`)).status(), 401);
  await deployed.close();
  pass("Deployed portal clears callback credentials, accepts staff session, reads state, and signs out");

  const title = page.getByRole("textbox", { name: "Title", exact: true }).first();
  await title.waitFor();
  const original = await title.inputValue();
  const edited = `${original} - acceptance check`;
  await title.fill(edited);
  await page.getByRole("button", { name: "Ready", exact: true }).first().click();
  const [saved] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith("/api/live-ops/draft") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Save Draft", exact: true }).click()
  ]);
  assert.equal(saved.status(), 200);
  assert.equal((await (await fetch(`${base}/api/snapshot`)).json()).revision, 1);
  pass("Browser edit saves draft without changing attendee snapshot");
  await page.goto(`${base}/changes`);
  await page.getByLabel("I reviewed the full attendee-facing change").check();
  const publishButton = page.getByRole("button", { name: "Publish New Revision", exact: true });
  const [publishResponse] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith("/api/live-ops/publish")),
    publishButton.click()
  ]);
  assert.equal(publishResponse.status(), 200, JSON.stringify(await publishResponse.json()));
  const publishedSnapshot = await (await fetch(`${base}/api/snapshot`)).json();
  assert.equal(publishedSnapshot.revision, 2);
  assert(publishedSnapshot.scheduleItems.some(item => item.title === edited));
  pass("Browser publication creates revision 2 visible through attendee API");
  await page.screenshot({ path: `${output}/staff-published.png`, fullPage: true });

  await page.getByLabel("I understand this changes the attendee schedule").check();
  const [rolledBack] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith("/api/live-ops/rollback")),
    page.getByRole("button", { name: "Restore Previous Revision", exact: true }).click()
  ]);
  assert.equal(rolledBack.status(), 200);
  const restored = await (await fetch(`${base}/api/snapshot`)).json();
  assert.equal(restored.revision, 3);
  assert(restored.scheduleItems.some(item => item.title === original));
  assert(!restored.scheduleItems.some(item => item.title === edited));
  pass("Browser rollback creates revision 3 and restores original schedule");

  await page.goto(`${base}/content`);
  await page.getByLabel("Venue", { exact: true }).fill("Acceptance test venue");
  await page.getByLabel("Activate reviewed people directory on website and app").check();
  await page.getByRole("tab", { name: /^Speakers / }).click();
  const profile = page.locator(".recordEditor").first();
  await profile.getByLabel("Role approval source").fill("Isolated acceptance-test approval; not real event content");
  await profile.getByLabel("Experts", { exact: true }).check();
  await page.getByRole("tab", { name: "Pages & Awards", exact: true }).click();
  const existingProgram = snapshot.contentPages.find(page => page.slug === "awards-2026-program");
  if (!existingProgram) await page.getByRole("button", { name: "Add 2026 Awards program", exact: true }).click();
  const program = page.locator(".recordEditor").filter({ has: page.locator(".recordHeader strong", { hasText: existingProgram?.title ?? "2026 Awards program" }) });
  await program.getByLabel("Body", { exact: true }).fill("Isolated acceptance Awards program");
  await program.getByLabel("Visible", { exact: true }).check();
  page.once("dialog", dialog => dialog.accept());
  const [contentPublished] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith("/api/content/publish")),
    page.getByRole("button", { name: "Review & Publish", exact: true }).click()
  ]);
  assert.equal(contentPublished.status(), 200);
  const updated = await (await fetch(`${base}/api/snapshot`)).json();
  assert.equal(updated.revision, 4);
  assert.equal(updated.event.venueName, "Acceptance test venue");
  assert.equal(updated.event.directoryEnabled, true);
  assert(updated.speakers[0].directoryCategories.includes("Experts"));
  assert(updated.speakers[0].roleSource.includes("acceptance-test"));
  assert(updated.contentPages.some(page => page.slug === "awards-2026-program" && page.published && page.body === "Isolated acceptance Awards program"));
  assert.deepEqual(updated.scheduleItems, restored.scheduleItems);
  pass("Browser content publication preserves schedule and publishes reviewed roles and Awards program");
  const audit = await db(`/rest/v1/production_audit_entries?event_id=eq.${eventId}&select=action,publication_revision`);
  assert(audit.some(entry => entry.action === "ROLLBACK_EVENT_SNAPSHOT_REVISION"));
  assert(audit.some(entry => entry.publication_revision === 4));
  pass("Cloud audit contains publication and rollback records");

  const dueId = randomUUID();
  const futureId = randomUUID();
  await db("/rest/v1/notification_jobs", "POST", [dueId, futureId].map((id, index) => ({
    id, event_id: eventId, audience_scope: "public", status: "scheduled", source: "SYSTEM",
    send_after_utc: new Date(Date.now() + (index === 0 ? -60000 : 86400000)).toISOString(),
    idempotency_key: `${eventId}:${id}`, payload: { verification: true }
  })));
  const claim = () => db("/rest/v1/rpc/claim_due_notification_jobs", "POST", { p_event_id: eventId, p_now: new Date().toISOString(), p_limit: 50 });
  const claimed = await claim();
  assert.deepEqual(claimed.map(job => job.id), [dueId]);
  assert.equal(claimed[0].attempt_count, 1);
  assert.equal((await claim()).length, 0);
  pass("Cloud worker claims due jobs once and leaves future jobs scheduled");
  await db(`/rest/v1/notification_jobs?id=eq.${dueId}`, "PATCH", { status: "failed", updated_at: new Date().toISOString() });
  assert.equal((await claim()).length, 0);
  for (const attempt of [2, 3]) {
    await db(`/rest/v1/notification_jobs?id=eq.${dueId}`, "PATCH", { status: "failed", updated_at: new Date(Date.now() - 180000).toISOString() });
    const retried = await claim();
    assert.equal(retried[0].attempt_count, attempt);
  }
  await db(`/rest/v1/notification_jobs?id=eq.${dueId}`, "PATCH", { status: "failed", updated_at: new Date(Date.now() - 180000).toISOString() });
  assert.equal((await claim()).length, 0);
  pass("Cloud retry delay and three-attempt limit are enforced");
  assert.equal(await page.evaluate(async () => (await fetch("/api/notifications/dispatch", { method: "POST" })).status), 423);
  pass("Push dispatch remains blocked while delivery is disabled");
  assert.equal(await page.evaluate(async () => (await fetch("/api/staff/session", { method: "PATCH" })).status), 200);
  await page.reload();
  await page.getByText("Staff ADMIN active", { exact: true }).waitFor();
  pass("Session refresh survives browser reload");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("heading", { name: "Staff sign in", exact: true }).waitFor();
  assert.equal((await context.request.get(`${base}/api/live-ops/state`)).status(), 401);
  assert.deepEqual(errors, []);
  pass("Browser sign-out revokes cookie access; no page runtime errors");
} catch (error) {
  if (page) {
    await page.screenshot({ path: `${output}/staff-failure.png`, fullPage: true }).catch(() => undefined);
    console.error((await page.locator("body").innerText().catch(() => "")).slice(-5000));
  }
  checks.push({ name: "Acceptance run", passed: false, detail: error.message.replace(/(access_token|refresh_token)=[^&\s]+/g, "$1=[redacted]") });
  console.error(checks.at(-1).detail);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server?.pid) {
    const exited = once(server, "exit");
    try { process.kill(-server.pid, "SIGTERM"); await exited; } catch {}
  }
  // Only records created for this unique acceptance run are deleted.
  for (const [path, label] of [
    [`/rest/v1/events?id=eq.${eventId}`, "Temporary test event removed"],
    ...(userId ? [[`/rest/v1/staff_profiles?user_id=eq.${userId}`, "Temporary staff profile removed"], [`/auth/v1/admin/users/${userId}`, "Temporary auth identity removed"]] : [])
  ]) {
    try { await db(path, "DELETE"); pass(label); }
    catch { checks.push({ name: label, passed: false }); process.exitCode = 1; }
  }
  const after = await (await fetch(`${cloud}/api/snapshot`)).json();
  try { assert.equal(after.revision, baseline.revision); assert.deepEqual(after.scheduleItems, baseline.scheduleItems); pass("Public summit schedule and revision unchanged"); }
  catch { checks.push({ name: "Public event unchanged", passed: false }); process.exitCode = 1; }
  await writeFile(`${output}/staff-results.json`, JSON.stringify({ at: new Date().toISOString(), checks }, null, 2));
}
