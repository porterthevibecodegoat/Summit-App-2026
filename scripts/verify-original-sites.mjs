import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const base = process.env.RESTORATION_TEST_URL ?? "http://127.0.0.1:3017";
const source = JSON.parse(readFileSync(resolve(root, "apps/web/lib/original-sites.json"), "utf8"));
const output = resolve(root, "work/acceptance/restoration");
mkdirSync(output, { recursive: true });
const server = process.env.RESTORATION_TEST_URL ? null : spawn(process.execPath, [resolve(root, "apps/web/node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3017"], { cwd: resolve(root, "apps/web"), stdio: "ignore" });
const checks = [];
let browser;
try {
  for (let i = 0; i < 60; i++) {
    if (await fetch(base).then(r => r.ok).catch(() => false)) break;
    await new Promise(r => setTimeout(r, 500));
  }
  browser = await chromium.launch();
  for (const width of [320, 375, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width < 600 ? 800 : 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const route of ["/2025", "/awards/2025", "/", "/awards/2026"]) {
      assert((await page.goto(base + route, { waitUntil: "networkidle" }))?.ok());
      await page.evaluate(() => document.fonts.ready);
      const main = await page.locator("main").innerText();
      if (route.includes("2025")) {
        const kind = route.includes("awards") ? "awards" : "summit";
        for (const person of source[kind].sections.flatMap(s => s.people)) assert(main.includes(person.name), `Missing ${person.name}`);
      } else {
        assert(!main.includes("Villa Bibbiani"), "Historical sponsor leaked into 2026");
        assert(!main.includes("Dr. George Rapier III"), "Historical producer leaked into 2026");
      }
      const filename = route === "/" ? "summit-2026" : route.replaceAll("/", "-");
      await page.screenshot({ path: `${output}/${filename}-${width}-top.png` });
      for (const image of await page.locator("main img").all()) {
        await image.scrollIntoViewIfNeeded();
        const src = await image.getAttribute("src");
        await image.evaluate(img => img.decode()).catch(error => { throw new Error(`Image failed on ${route}: ${src}`, { cause: error }); });
      }
      const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, duplicateIds: [...document.querySelectorAll('[id]')].map(el => el.id).filter((id, index, ids) => ids.indexOf(id) !== index) }));
      assert(geometry.scroll <= geometry.width + 1, `${route} overflow at ${width}`);
      assert.deepEqual(geometry.duplicateIds, []);
      if (route.includes("2025")) {
        await page.getByRole("heading", { name: "Founders", exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${output}/${filename}-${width}-portraits.png` });
      }
      assert.deepEqual(errors, []);
      checks.push(`${route}: all portraits load, archive names preserved, no overflow or runtime errors at ${width}px`);
      console.log(`PASS ${checks.at(-1)}`);
    }
    await page.close();
  }
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
  writeFileSync(`${output}/results.json`, JSON.stringify({ at: new Date().toISOString(), checks }, null, 2));
}
