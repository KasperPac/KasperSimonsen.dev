import { defineConfig, devices } from "@playwright/test";

// Contact must be usable before the office models load, so this suite skips the scene warm-up.
export default defineConfig({
  testDir: "e2e",
  testMatch: "office-contact.spec.ts",
  workers: 1,
  timeout: 60_000,
  use: { baseURL: "http://localhost:3010" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
      },
    },
    { name: "phone", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
  webServer: { command: "npm run dev", url: "http://localhost:3010", reuseExistingServer: true, timeout: 180_000 },
});
