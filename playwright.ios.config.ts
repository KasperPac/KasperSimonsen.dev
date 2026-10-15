import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig(base, {
  testMatch: "office-ios.spec.ts",
  workers: 1,
  projects: [
    { name: "webkit", use: { browserName: "webkit", launchOptions: {} } },
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});
