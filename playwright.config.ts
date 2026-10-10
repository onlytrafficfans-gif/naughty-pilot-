import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  testIgnore: "**/founder.spec.ts",
  timeout: 75000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4180",
    headless: true,
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
        : process.platform === "win32"
          ? { channel: "chrome" }
          : { executablePath: "/usr/bin/chromium" }),
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "node server.mjs --port 4180",
    env: { NP_DB_PATH: ".data/browser.sqlite", NP_BACKEND: "sqlite" },
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
