import { expect, test, type Page } from "@playwright/test";

const routes = ["/", "/schedule", "/help", "/map", "/info"] as const;
const forbiddenAttendeeResidue = /prototype|demo mode|room-level map coming soon|replace this with approved|published staff-controlled|published from the staff|my schedule/i;

test("published data survives API outage and reconnect without accepting stale revisions", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-8-se-portrait", "Recovery uses one representative browser; layout is covered separately.");
  const response = await request.get("http://127.0.0.1:3010/api/snapshot");
  expect(response.ok()).toBeTruthy();
  const snapshot = await response.json();
  snapshot.revision += 100;
  const item = snapshot.scheduleItems.find((entry: { title: string }) => entry.title.includes("Community Ride"));
  expect(item).toBeTruthy();
  item.title = "Acceptance recovery session";
  let offline = false;
  await page.route("**/api/snapshot", route => offline
    ? route.abort("internetdisconnected")
    : route.fulfill({ json: { ...snapshot, serverTimeUtc: new Date().toISOString() } }));
  await page.goto("/schedule");
  await enterSummit(page);
  await expect(page.getByText(item.title, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("not-alone.published-snapshot-cache.v1"))).toContain(item.title);
  offline = true;
  await page.reload();
  await enterSummit(page);
  await expect(page.getByText(item.title, { exact: true })).toBeVisible();
  offline = false;
  snapshot.revision += 1;
  item.title = "Acceptance reconnected session";
  await page.reload();
  await enterSummit(page);
  await expect(page.getByText(item.title, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("not-alone.published-snapshot-cache.v1"))).toContain(item.title);
  snapshot.revision -= 2;
  item.title = "Stale session must not replace cache";
  await page.reload();
  await enterSummit(page);
  await expect(page.getByText("Acceptance reconnected session", { exact: true })).toBeVisible();
  await expect(page.getByText(item.title, { exact: true })).toHaveCount(0);
});

async function enterSummit(page: Page) {
  const enter = page.getByRole("button", { name: "Enter Not Alone Summit" });
  const readyNavigation = page.getByRole("tab", { exact: true, name: "Home" });
  await expect(readyNavigation).toBeVisible({ timeout: 20_000 });
  if (await enter.isVisible()) {
    await expect(enter).toBeEnabled();
    await enter.click();
  }
  await expect(readyNavigation).toBeVisible();
}

test("the original five-tab app does not expose collaborator-added destinations", async ({ page }) => {
  await page.goto("/");
  await enterSummit(page);
  await expect(page.getByRole("tablist").last().getByRole("tab")).toHaveCount(5);
  await expect(page.getByRole("tab", { name: /^(People|Awards)$/ })).toHaveCount(0);
});

function captureRuntimeErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

  return errors;
}

for (const route of routes) {
  test(`${route} fits the viewport and keeps primary navigation usable`, async ({ page }) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await page.goto(route);
    await enterSummit(page);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    for (const label of ["Home", "Schedule", "Ask AI", "Map", "Info"]) {
      await expect(page.getByRole("tab", { exact: true, name: label })).toBeVisible();
    }

    const navigationBox = await page.getByRole("tablist").last().boundingBox();
    expect(navigationBox).not.toBeNull();
    expect(navigationBox!.x).toBeGreaterThanOrEqual(0);
    expect(navigationBox!.y).toBeGreaterThanOrEqual(0);
    expect(navigationBox!.x + navigationBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    expect(navigationBox!.y + navigationBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
    await expect(page.locator("body")).not.toContainText(forbiddenAttendeeResidue);

    const unnamedControls = await page.locator('button, a, [role="button"], [role="link"], [role="tab"]').evaluateAll((elements) =>
      elements.filter((element) => {
        const node = element as HTMLElement;
        if (node.offsetParent === null) return false;
        const name = node.getAttribute("aria-label") ?? node.getAttribute("title") ?? node.textContent ?? "";
        return name.trim().length === 0;
      }).map((element) => element.outerHTML.slice(0, 180))
    );
    expect(unnamedControls).toEqual([]);
    expect(runtimeErrors).toEqual([]);
  });
}

test("the short-landscape opening greeting does not overlap its action", async ({ page }) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await page.goto("/");
  const title = page.getByText("Summit", { exact: true });
  const enter = page.getByRole("button", { name: "Enter Not Alone Summit" });

  await expect(enter).toBeEnabled();
  await expect(enter).toBeInViewport();
  const [titleBox, enterBox] = await Promise.all([title.boundingBox(), enter.boundingBox()]);

  expect(titleBox).not.toBeNull();
  expect(enterBox).not.toBeNull();
  expect(titleBox!.y + titleBox!.height).toBeLessThan(enterBox!.y);
  expect(runtimeErrors).toEqual([]);
});

test("attendees see one event schedule without personal schedule controls", async ({ page }) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await page.goto("/schedule");
  await enterSummit(page);

  await expect(page.getByText(/My Schedule/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /save|bookmark/i })).toHaveCount(0);

  await page.getByRole("link", { name: /Community Ride/i }).click();
  await expect(page.getByText(/My Schedule/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /save|bookmark/i })).toHaveCount(0);
  await expect(page.getByText("Reminder", { exact: true })).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

test("schedule days stay isolated and pending-only days remain accessible", async ({ page }) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await page.goto("/schedule");
  await enterSummit(page);

  await expect(page.getByText("Event schedule", { exact: true })).toBeInViewport();
  await expect(page.getByText("2:00", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Mike's Bikes Community Ride", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /Tue, Nov 3/ }).click();
  await expect(page.getByText("Tuesday, November 3", { exact: true })).toBeVisible();
  await expect(page.getByText("Mike's Bikes Community Ride", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Registration, Gifting Suite/i)).toHaveCount(0);
  await page.getByRole("tab", { name: /Thu, Nov 5/ }).click();
  await expect(page.getByText("Thursday, November 5", { exact: true })).toBeVisible();
  await expect(page.getByText(/Tennis: 10:00 AM; end time to be confirmed/)).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("session detail is concise and contains no editorial placeholders", async ({ page }) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await page.goto("/schedule");
  await enterSummit(page);
  await page.getByRole("link", { name: /Community Ride/i }).click();

  await expect(page.getByText("Session details", { exact: true })).toBeVisible();
  await expect(page.getByText("Access", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Visibility", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Status", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Event Context", { exact: true })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(forbiddenAttendeeResidue);
  expect(runtimeErrors).toEqual([]);
});

test("concierge disables empty submission and answers a direct schedule question", async ({ page }) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await page.goto("/help");
  await enterSummit(page);

  const send = page.getByRole("button", { name: "Send question" });
  await expect(send).toBeDisabled();
  await page.getByLabel("Ask the summit concierge").fill("When is Mike Tyson making an appearance?");
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.getByText(/Mike Tyson does not have (a scheduled app time|a published appearance time) yet/i)).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("opening artwork covers the full viewport", async ({ page }) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await page.goto("/");
  const image = page.locator('img[src*="launch-art-premium"]');
  await expect(image).toBeVisible();
  const box = await image.boundingBox();
  const viewport = page.viewportSize()!;

  expect(box).not.toBeNull();
  expect(box!.x).toBeLessThanOrEqual(1);
  expect(box!.y).toBeLessThanOrEqual(1);
  expect(box!.x + box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(box!.y + box!.height).toBeGreaterThanOrEqual(viewport.height - 1);
  expect(runtimeErrors).toEqual([]);
});

test("the rendered app is visibly nonblank", async ({ page }) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await page.goto("/schedule");
  await enterSummit(page);

  const screenshot = await page.screenshot();
  expect(screenshot.byteLength).toBeGreaterThan(10_000);
  expect(runtimeErrors).toEqual([]);
});
