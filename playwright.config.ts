import { defineConfig } from "@playwright/test";

const viewports = [
  { name: "desktop-1280", width: 1280, height: 720 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1920", width: 1920, height: 1080 },
] as const;
const host = process.env.E2E_HOST ?? "127.0.0.1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://${host}:4173`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: viewports.map(({ name, width, height }) => ({
    name,
    use: { browserName: "chromium", viewport: { width, height } },
  })),
  webServer: {
    command: "npm run dev -- --host 0.0.0.0 --port 4173",
    url: `http://${host}:4173`,
    reuseExistingServer: !process.env.CI,
  },
});
