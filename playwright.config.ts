import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.BOARD_URL ?? "http://127.0.0.1:4178",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.BOARD_URL
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 4178",
        url: "http://127.0.0.1:4178",
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
