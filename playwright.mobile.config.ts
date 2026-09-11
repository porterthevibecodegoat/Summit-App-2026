import { defineConfig } from "@playwright/test";

const iphonePortraitViewports = [
  { name: "iphone-8-se", viewport: { width: 375, height: 667 } },
  { name: "iphone-8-plus", viewport: { width: 414, height: 736 } },
  { name: "iphone-x-mini", viewport: { width: 375, height: 812 } },
  { name: "iphone-xr-11-max", viewport: { width: 414, height: 896 } },
  { name: "iphone-standard", viewport: { width: 390, height: 844 } },
  { name: "iphone-dynamic-island", viewport: { width: 393, height: 852 } },
  { name: "iphone-newer-pro", viewport: { width: 402, height: 874 } },
  { name: "iphone-air", viewport: { width: 420, height: 912 } },
  { name: "iphone-12-13-pro-max", viewport: { width: 428, height: 926 } },
  { name: "iphone-plus-pro-max", viewport: { width: 430, height: 932 } },
  { name: "iphone-largest-pro-max", viewport: { width: 440, height: 956 } }
] as const;

const iphoneViewports = iphonePortraitViewports.flatMap(({ name, viewport }) => [
  { name: `${name}-portrait`, viewport, isMobile: true, hasTouch: true },
  {
    name: `${name}-landscape`,
    viewport: { width: viewport.height, height: viewport.width },
    isMobile: true,
    hasTouch: true
  }
]);

const additionalViewports = [
  { name: "narrow-phone", viewport: { width: 280, height: 653 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" as const },
  { name: "small-phone", viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true },
  { name: "ipad-split-view", viewport: { width: 507, height: 1024 }, isMobile: true, hasTouch: true },
  { name: "tablet", viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
  { name: "tablet-landscape", viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true },
  { name: "desktop", viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { name: "tv-browser", viewport: { width: 1920, height: 1080 }, isMobile: false, hasTouch: false }
] as const;

const viewports = [...iphoneViewports, ...additionalViewports];

export default defineConfig({
  expect: { timeout: 8_000 },
  fullyParallel: true,
  outputDir: "test-results/mobile-responsive",
  projects: viewports.map(({ name, viewport, isMobile, hasTouch, ...accessibility }) => ({
    name,
    use: { browserName: "chromium", hasTouch, isMobile, viewport, ...accessibility }
  })),
  reporter: [["line"]],
  testDir: "tests/responsive",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:8086",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "node scripts/start-admin-next.mjs dev --webpack --port 3000",
      env: { CI: "1", NEXT_TELEMETRY_DISABLED: "1" },
      reuseExistingServer: true,
      timeout: 120_000,
      url: "http://127.0.0.1:3000/api/health"
    },
    {
      command: "pnpm mobile:web -- --port 8086",
      env: {
        CI: "1",
        EXPO_PUBLIC_API_BASE_URL: "http://127.0.0.1:3000"
      },
      reuseExistingServer: true,
      timeout: 120_000,
      url: "http://127.0.0.1:8086"
    }
  ]
});
