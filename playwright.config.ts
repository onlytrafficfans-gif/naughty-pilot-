import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 75000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4180",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "PORT=4180 NP_DB_PATH=.data/browser.sqlite npm run dev",
    url: "http://127.0.0.1:4180",
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1536, height: 1024 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
