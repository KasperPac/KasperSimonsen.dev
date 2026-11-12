import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e", testMatch: "agency.spec.ts", workers: 1, timeout: 45_000,
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3010" },
});
