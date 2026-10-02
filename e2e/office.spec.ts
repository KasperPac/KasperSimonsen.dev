import { test, expect, type Page } from "@playwright/test";

const office = (page: Page) => page.locator(".office");
const progress = async (page: Page) => Number(await office(page).getAttribute("data-walkin-progress"));

async function openOffice(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  return errors;
}

test("the walk-in starts on the street and ends at the standing spot", async ({ page }) => {
  const errors = await openOffice(page);
  expect(await progress(page)).toBeLessThan(0.01);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeGreaterThan(0.999);
  expect(errors).toEqual([]);
});

test("scrolling back up after the end plays the walk-in in reverse", async ({ page }) => {
  await openOffice(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeGreaterThan(0.999);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.4));
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeLessThan(0.6);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeLessThan(0.001);
});

test("overshooting either end clamps, including the End key", async ({ page }) => {
  await openOffice(page);
  await page.evaluate(() => window.scrollTo(0, 10_000_000));
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeGreaterThan(0.999);
  expect(await progress(page)).toBeLessThanOrEqual(1);
  await page.keyboard.press("Home");
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeLessThan(0.001);
  await page.keyboard.press("End");
  await expect.poll(() => progress(page), { timeout: 15_000 }).toBeGreaterThan(0.999);
});

test("rotating to a phone viewport keeps the canvas filling the screen", async ({ page }) => {
  const errors = await openOffice(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = page.locator(".office-stage canvas");
  await expect.poll(() => canvas.evaluate((c) => `${c.clientWidth}x${c.clientHeight}`)).toBe("390x844");
  expect(errors).toEqual([]);
});

test("a missing model shows the fallback with links, not a blank screen", async ({ page }) => {
  await page.route("**/models/street.glb", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/");
  await expect(page.locator(".office-fallback")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: "See the work" })).toHaveAttribute("href", "/work");
  await expect(page.getByRole("link", { name: "Get in touch" })).toHaveAttribute("href", "/contact");
  // No empty walk-in track to scroll through behind the fallback.
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("the old pages still work while the office takes over /", async ({ page }) => {
  const response = await page.goto("/work");
  expect(response?.status()).toBe(200);
});

test("the director is idle at the standing spot and the camera follows the walk-in", async ({ page }) => {
  await openOffice(page);
  await expect(office(page)).toHaveAttribute("data-director", "walkIn");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 15_000 });
  await expect(office(page)).toHaveAttribute("data-camera", "base");
});
