import { chromium, type FullConfig } from "@playwright/test";

/**
 * Loads the office once before the suite. The first request after a code change compiles the client bundle and
 * the models in the dev server; doing it here keeps that one-off cost out of every test's 60 s scene-ready wait.
 */
export default async function warm(config: FullConfig) {
  const { baseURL, launchOptions } = config.projects[0].use;
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  await page.goto(baseURL ?? "http://localhost:3010");
  await page.locator(".office[data-scene-ready='true']").waitFor({ timeout: 300_000 });
  await browser.close();
}
