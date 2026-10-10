import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/founder.spec.ts",
  timeout: 60000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4190",
    headless: true,
    launchOptions:
      process.platform === "win32"
        ? { channel: "chrome" }
        : {
            executablePath:
              process.env.PLAYWRIGHT_CHROMIUM_PATH || "/usr/bin/chromium",
          },
  },
  webServer: {
    command: "node tests/support/contract-server.mjs",
    url: "http://127.0.0.1:4190/api/health",
    env: { NP_FOUNDER_BROWSER_FIXTURE: "true" },
    reuseExistingServer: false,
    timeout: 30000,
  },
  projects: [
    {
      name: "founder-desktop",
      use: { viewport: { width: 1536, height: 1024 } },
    },
    {
      name: "founder-mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
