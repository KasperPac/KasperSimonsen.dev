import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/warm.ts",
  timeout: 180_000, // software WebGL can stall for seconds at a time late in a run (see MOVE_WAIT in the specs)
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3010",
    // Headless Chromium has no GPU; SwiftShader gives it software WebGL.
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  webServer: { command: "npm run dev", url: "http://localhost:3010", reuseExistingServer: true, timeout: 180_000 },
});
