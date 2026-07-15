import { defineConfig, devices } from "@playwright/test";

const localBaseUrl = "http://127.0.0.1:4193";
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: externalBaseUrl ?? localBaseUrl,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm run preview:e2e",
        url: localBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
