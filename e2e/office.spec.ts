import { test, expect, type Page } from "@playwright/test";

/**
 * How long to wait for the camera, the director or an object to arrive. On a GPU these take about a second; under
 * software WebGL a long run of heavy pages in one headless browser can freeze rendering for ~10 s at a time (one
 * frame measured 9.87 s), so give it room. The assertions are unchanged.
 */
const MOVE_WAIT = 30_000;

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
  await expect.poll(() => progress(page), { timeout: MOVE_WAIT }).toBeGreaterThan(0.999);
  expect(errors).toEqual([]);
});

test("scrolling back up after the end plays the walk-in in reverse", async ({ page }) => {
  await openOffice(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => progress(page), { timeout: MOVE_WAIT }).toBeGreaterThan(0.999);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.4));
  await expect.poll(() => progress(page), { timeout: MOVE_WAIT }).toBeLessThan(0.6);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => progress(page), { timeout: MOVE_WAIT }).toBeLessThan(0.001);
});

test("overshooting either end clamps, including the End key", async ({ page }) => {
  await openOffice(page);
  await page.evaluate(() => window.scrollTo(0, 10_000_000));
  await expect.poll(() => progress(page), { timeout: MOVE_WAIT }).toBeGreaterThan(0.999);
  expect(await progress(page)).toBeLessThanOrEqual(1);
  await page.keyboard.press("Home");
  await expect.poll(() => progress(page), { timeout: MOVE_WAIT }).toBeLessThan(0.001);
  await page.keyboard.press("End");
  await expect.poll(() => progress(page), { timeout: MOVE_WAIT }).toBeGreaterThan(0.999);
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
  // Nothing to walk into, so nothing says to.
  await expect(page.getByRole("button", { name: "Come in" })).toBeHidden();
});

test("the old pages still work while the office takes over /", async ({ page }) => {
  const response = await page.goto("/work");
  expect(response?.status()).toBe(200);
});

test("the director is idle at the standing spot and the camera follows the walk-in", async ({ page }) => {
  await openOffice(page);
  await expect(office(page)).toHaveAttribute("data-director", "walkIn");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-camera", "base");
});

test("on arrival the office names what you can use, then leaves dots until you open something", async ({ page }) => {
  await openOffice(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-hints", "dots", { timeout: MOVE_WAIT });
  await expect(page.locator(".office-marker").first()).toBeVisible();
  await page.getByRole("button", { name: "The work" }).focus(); // looking around doesn't dismiss them
  await expect(office(page)).toHaveAttribute("data-hints", "dots");
  await page.keyboard.press("Enter"); // opening something does
  await expect(office(page)).toHaveAttribute("data-hints", "");
  await expect(page.locator(".office-marker").first()).toBeHidden();
});

const comeIn = (page: Page) => page.getByRole("button", { name: "Come in" });
const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));
const bottom = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

test("on the street the page says how to get in, and stops saying it once you're on your way", async ({ page }) => {
  await openOffice(page);
  await expect(comeIn(page)).toBeVisible();
  await expect(page.getByText("or scroll")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.2));
  await expect(comeIn(page)).toBeHidden({ timeout: MOVE_WAIT });
  await expect(page.getByText("or scroll")).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(comeIn(page)).toBeVisible({ timeout: MOVE_WAIT });
});

test("Come in is the first thing the keyboard reaches", async ({ page }) => {
  await openOffice(page);
  await page.keyboard.press("Tab");
  await expect(comeIn(page)).toBeFocused();
});

test("Come in walks you into the office without scrolling", async ({ page }) => {
  const errors = await openOffice(page);
  await comeIn(page).click();
  await expect(comeIn(page)).toBeHidden({ timeout: MOVE_WAIT }); // gone for the walk
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 60_000 });
  await expect.poll(() => scrollY(page), { timeout: MOVE_WAIT }).toBe(await bottom(page)); // easing out the last few pixels
  await expect(office(page)).toHaveAttribute("data-walking", "false");
  expect(errors).toEqual([]);
});

test("scrolling during the walk takes over from it", async ({ page }) => {
  await openOffice(page);
  await comeIn(page).click();
  await expect(office(page)).toHaveAttribute("data-walking", "true");
  await expect.poll(() => scrollY(page), { timeout: MOVE_WAIT }).toBeGreaterThan(100);
  await page.mouse.move(400, 300);
  await page.mouse.wheel(0, 40);
  await expect(office(page)).toHaveAttribute("data-walking", "false", { timeout: MOVE_WAIT }); // handed back
  // The wheel's own scroll plays out (slowly, under software WebGL), then nothing moves the page on.
  const drift = async () => {
    const before = await scrollY(page);
    await page.waitForTimeout(1000);
    return (await scrollY(page)) - before;
  };
  await expect.poll(drift, { timeout: MOVE_WAIT }).toBe(0);
  const stopped = await scrollY(page);
  await page.waitForTimeout(2000);
  expect(await scrollY(page)).toBe(stopped);
  expect(stopped).toBeLessThan(await bottom(page));
  await expect(office(page)).toHaveAttribute("data-director", "walkIn");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("Come in goes straight in", async ({ page }) => {
    await openOffice(page);
    await comeIn(page).click();
    expect(await scrollY(page)).toBe(await bottom(page));
    await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  });
});

test("the dots breathe where they are, over their objects", async ({ page }) => {
  await openOffice(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-hints", "dots", { timeout: MOVE_WAIT });
  const dot = page.locator(".office-marker").last(); // the farthest from the corner, so any drift is largest
  const sample = () =>
    dot.evaluate((m) => {
      const r = m.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, scale: Number(getComputedStyle(m).scale) || 1 };
    });
  await expect.poll(async () => (await sample()).scale, { timeout: MOVE_WAIT }).toBeLessThan(1.02);
  const rest = await sample();
  await expect.poll(async () => (await sample()).scale, { timeout: MOVE_WAIT }).toBeGreaterThan(1.1);
  const full = await sample();
  expect(Math.abs(full.x - rest.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(full.y - rest.y)).toBeLessThanOrEqual(1);
});
