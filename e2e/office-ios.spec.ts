import { test, expect, type Page } from "@playwright/test";
import { COPY } from "../office/copy";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
const WAIT = 60_000;

async function enter(page: Page) {
  await page.goto("/");
  await expect(page.locator(".office")).toHaveAttribute("data-scene-ready", "true", { timeout: WAIT });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator(".office")).toHaveAttribute("data-director", "idle", { timeout: WAIT });
}

async function open(page: Page, name: string, hotspot: string) {
  await page.getByRole("button", { name, exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".office")).toHaveAttribute("data-director", `focused:${hotspot}`, { timeout: WAIT });
}

test("the monitor print stays on its screen and its description sits directly below", async ({ page }) => {
  await enter(page);
  await open(page, "Monitor", "hs_monitor");
  await expect(page.getByRole("heading", { name: COPY.reel.title, exact: true })).toBeFocused({ timeout: WAIT });
  const screen = page.locator(".office-reel");
  await expect.poll(async () => (await screen.boundingBox())?.width, { timeout: WAIT }).toBeGreaterThan(340);
  const shot = (await screen.boundingBox())!;
  // The camera frames the 16:9 monitor between the duck and the desk at this viewport.
  expect(shot.x).toBeGreaterThan(5);
  expect(shot.x + shot.width).toBeLessThan(385);
  expect(shot.y).toBeGreaterThan(300);
  expect(shot.y).toBeLessThan(330);
  expect(shot.height).toBeGreaterThan(190);
  const words = (await page.locator(".reel-words--strip").boundingBox())!;
  expect(words.y - shot.y - shot.height).toBeGreaterThan(0);
  expect(words.y - shot.y - shot.height).toBeLessThan(25);
  expect(words.y + words.height).toBeLessThan(844);
  await screen.getByRole("button", { name: COPY.reel.next }).tap();
  await expect(page.locator(".reel-words")).toHaveAttribute("data-slide", "1");
  await page.screenshot({ path: test.info().outputPath("monitor.png") });
  // Safari's browser chrome changes the available height; the print must follow the resized canvas.
  await page.setViewportSize({ width: 390, height: 664 });
  await expect.poll(async () => (await screen.boundingBox())?.y, { timeout: WAIT }).toBeLessThan(240);
  const resized = (await screen.boundingBox())!;
  expect(resized.y).toBeGreaterThan(210);
  expect(resized.width).toBeGreaterThan(340);
  const resizedWords = (await page.locator(".reel-words--strip").boundingBox())!;
  expect(resizedWords.y + resizedWords.height).toBeLessThan(664);
});

test("the sleeve description stays on the pulled record and Read more responds to touch", async ({ page }) => {
  await enter(page);
  await open(page, "The work", "hs_crate");
  await expect(page.locator('[aria-roledescription="record crate"]')).toBeFocused({ timeout: WAIT });
  await page.keyboard.press("Enter");
  await expect(page.locator(".office")).toHaveAttribute("data-sleeve", "out", { timeout: WAIT });
  const sleeve = page.locator(".office-sleeve-back");
  await expect(sleeve.getByRole("heading")).toBeFocused({ timeout: WAIT });
  await expect.poll(async () => (await sleeve.boundingBox())?.width, { timeout: WAIT }).toBeGreaterThan(270);
  const box = (await sleeve.boundingBox())!;
  expect(box.y).toBeGreaterThan(100);
  expect(box.y + box.height).toBeLessThan(800);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await expect.poll(() => sleeve.evaluate(el => Number(getComputedStyle(el).opacity))).toBe(1);
  await page.screenshot({ path: test.info().outputPath("sleeve.png") });
  await sleeve.getByRole("button", { name: COPY.sleeve.readMore }).tap();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("each whiteboard colour can be tapped and draws its own ink", async ({ page }) => {
  await enter(page);
  await open(page, COPY.whiteboard.nav, "hs_whiteboard");
  const tools = Object.values(COPY.whiteboard.tools);
  const canvas = page.locator(".whiteboard-canvas");
  for (const [index, name] of tools.entries()) {
    const button = page.getByRole("button", { name, exact: true });
    await button.tap();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    const box = (await canvas.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width * (0.25 + index * 0.12), box.y + box.height * 0.6);
  }
  // Opaque marker pixels, excluding the initial white writing, prove selection reached the drawing code.
  const colours = await canvas.evaluate((c: HTMLCanvasElement) => {
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    const found = new Set<string>();
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] === 255) found.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return [...found];
  });
  for (const colour of ["232,232,232", "198,255,61", "255,59,48", "46,242,255", "255,178,36"]) expect(colours).toContain(colour);
  await page.getByRole("button", { name: COPY.whiteboard.eraser, exact: true }).tap();
  await expect(page.getByRole("button", { name: COPY.whiteboard.eraser, exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: test.info().outputPath("whiteboard.png") });
  await page.getByRole("button", { name: COPY.whiteboard.wipe, exact: true }).tap();
  expect(await canvas.evaluate((c: HTMLCanvasElement) => c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0))).toBe(false);
});
