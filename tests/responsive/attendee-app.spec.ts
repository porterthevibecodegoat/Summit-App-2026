import { expect, test, type Page } from "@playwright/test";

const routes = ["/", "/schedule", "/help", "/map", "/info"] as const;

async function enterSummit(page: Page) {
  const enter = page.getByRole("button", { name: "Enter Not Alone Summit" });
  if (await enter.count() === 0) return;
  await expect(enter).toBeEnabled();
  await enter.click();
}

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

  await page.getByRole("link", { name: /Registration, Gifting Suite/i }).click();
  await expect(page.getByText(/My Schedule/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /save|bookmark/i })).toHaveCount(0);
  await expect(page.getByText("Reminder", { exact: true })).toHaveCount(0);
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
