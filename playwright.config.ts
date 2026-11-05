import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "output/qa/browser-report", open: "never" }],
  ],
  outputDir: "test-results",
  use: {
    baseURL: process.env.CRM_BASE_URL ?? "http://127.0.0.1:5180",
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "off",
  },
  webServer: process.env.CRM_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 5180 --strictPort",
        url: "http://127.0.0.1:5180",
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
