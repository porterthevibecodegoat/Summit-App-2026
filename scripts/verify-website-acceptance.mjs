import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const base = "http://127.0.0.1:3015";
const server = spawn(process.execPath, [resolve(root, "apps/web/node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3015"], {
  cwd: resolve(root, "apps/web"), env: { ...process.env, ENABLE_AI: "false" }, stdio: "ignore"
});
const checks = [];
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (await fetch(base).then(r => r.ok).catch(() => false)) { ready = true; break; }
    await new Promise(r => setTimeout(r, 500));
  }
  assert(ready, "Website test server did not start");
  browser = await chromium.launch({ headless: true });
  const routes = ["/", "/summit", "/2025", "/summit/2025", "/awards", "/awards/2025", "/awards/2026", "/schedule", "/map", "/ask-ai", "/contact", "/donate"];
  const links = new Set();
  for (const viewport of [{ width: 375, height: 667 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    for (const route of routes) {
      const response = await page.goto(base + route, { waitUntil: "domcontentloaded" });
      assert(response?.ok(), `${route} failed`);
      await page.locator("main").first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert(dimensions.scroll <= dimensions.width + 1, `${route} overflows at ${viewport.width}`);
      assert((await page.locator("main").innerText()).trim().length > 20, `${route} empty`);
      for (const href of await page.locator("a[href]").evaluateAll(nodes => nodes.map(n => n.getAttribute("href")))) {
        if (href?.startsWith("/") && !href.startsWith("//")) links.add(href.split("#")[0]);
      }
      assert.equal(await page.locator('form[action="/api/messages"], form[action="/api/tickets"]').count(), 0);
      assert.equal(await page.locator('.aiBubble, .messageForm, .ticketSection').count(), 0, `${route} contains a retired collaborator widget`);
      checks.push(`${route} renders without overflow at ${viewport.width}px`);
    }
    await page.goto(base + "/contact", { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByRole("link", { name: "Contact ICF", exact: true }).getAttribute("href"), "https://www.inspiringchildren.org/contact");
    if (viewport.width === 375) {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute("aria-expanded", "true");
      await page.screenshot({ path: resolve(root, "work/acceptance/website-menu.png") });
      await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Schedule", exact: true }).click();
      await page.waitForURL("**/schedule", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute("aria-expanded", "false");
      checks.push("Mobile navigation closes after selecting a destination");
    }
    await page.screenshot({ path: resolve(root, `work/acceptance/website-${viewport.width}.png`) });
    assert.deepEqual(errors, [], "Browser runtime errors");
    await context.close();
  }
  for (const path of links) {
    const response = await fetch(base + path);
    assert(response.ok, `Broken internal link ${path}: ${response.status}`);
  }
  checks.push(`${links.size} internal link destinations resolve`);
  for (const path of ["/api/messages", "/api/tickets"]) {
    const response = await fetch(base + path, { method: "POST", body: "{}" });
    assert.equal(response.status, 410, `${path} must remain retired`);
  }
  checks.push("Retired messaging and ticket endpoints cannot submit data");
  const manifest = await fetch(base + "/manifest.webmanifest").then(r => r.json());
  assert.equal(manifest.name, "Not Alone Summit");
  checks.push("Manifest uses event identity rather than an unconnected domain");
  console.log(checks.map(check => `PASS ${check}`).join("\n"));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  mkdirSync(resolve(root, "work/acceptance"), { recursive: true });
  writeFileSync(resolve(root, "work/acceptance/website-results.json"), JSON.stringify({ at: new Date().toISOString(), checks }, null, 2));
}
