import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
await mkdir(resolve(root, "work/acceptance"), { recursive: true });
const response = await fetch("https://summit-app-2026-admin.vercel.app/api/snapshot");
assert(response.ok);
const snapshot = await response.json();
snapshot.event.directoryEnabled = true;
snapshot.revision += 100;
const person = { id: "83000000-0000-4000-8000-000000000001", eventId: snapshot.event.id, name: "Reviewed directory person", role: "Approved producer", bio: "Approved biography", headshotUrl: null, published: true, directoryCategories: ["Producers"], roleSource: "Isolated test approval" };
const program = { id: "83000000-0000-4000-8000-000000000002", slug: "awards-2026-program", title: "Reviewed Awards program", body: "Approved program details", published: true, revision: snapshot.revision };
let unavailable = false;
const api = createServer((_req, res) => {
  res.writeHead(unavailable ? 503 : 200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(unavailable ? { error: "Test outage" } : { ...snapshot, serverTimeUtc: new Date().toISOString() }));
});
await new Promise((resolve, reject) => { api.once("error", reject); api.listen(3022, "127.0.0.1", resolve); });
const base = "http://127.0.0.1:3023";
const server = spawn(process.execPath, [resolve(root, "apps/web/node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3023"], {
  cwd: resolve(root, "apps/web"), env: { ...process.env, PUBLIC_API_BASE_URL: "http://127.0.0.1:3022" }, stdio: "ignore"
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (await fetch(base).then(r => r.ok).catch(() => false)) { ready = true; break; }
    await new Promise(r => setTimeout(r, 500));
  }
  assert(ready, "Reviewed-content web server did not start");
  browser = await chromium.launch();
  for (const viewport of [{ width: 375, height: 667 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    snapshot.speakers = [person];
    snapshot.contentPages = [program];
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: person.name, exact: true })).toBeVisible();
    await page.getByRole("heading", { name: person.name, exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(root, `work/acceptance/reviewed-directory-${viewport.width}.png`) });
    await page.getByRole("link", { name: /Reviewed directory person/ }).click();
    await expect(page.getByText(person.bio, { exact: true })).toBeVisible();
    await page.goto(`${base}/awards/2026`);
    await expect(page.getByText(program.body, { exact: true })).toBeVisible();
    await page.getByText(program.body, { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(root, `work/acceptance/reviewed-awards-${viewport.width}.png`) });
    snapshot.speakers = [];
    snapshot.contentPages = [];
    snapshot.revision += 1;
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(person.name, { exact: true })).toHaveCount(0);
    await expect(page.getByText("Jewel Murray", { exact: true })).toHaveCount(0);
    assert.equal((await page.request.get(`${base}/directory/${person.id}`)).status(), 404);
    await page.goto(`${base}/awards/2026`);
    await expect(page.getByText(program.body, { exact: true })).toHaveCount(0);
    await expect(page.getByText("Honorees and show roles will be announced after final approval.", { exact: true })).toBeVisible();
    assert.deepEqual(errors, []);
    console.log(`PASS reviewed profiles, Awards publication, and withdrawals at ${viewport.width}px`);
    await page.close();
  }
  unavailable = true;
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Jewel Murray", { exact: true })).toHaveCount(0);
  await expect(page.getByText("The guest directory is temporarily unavailable. Please try again shortly.", { exact: true })).toBeVisible();
  console.log("PASS backend outage does not restore old directory entries");
  const answer = await (await page.request.post(`${base}/api/ask-ai`, { data: { question: "How can I message someone?" } })).json();
  assert(answer.answer.includes("messaging is not available"));
  console.log("PASS concierge does not advertise removed messaging forms");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  if (server.exitCode === null) await new Promise(resolve => server.once("exit", resolve));
  await new Promise(resolve => api.close(resolve));
}
