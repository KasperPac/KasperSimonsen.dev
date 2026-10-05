import { test, expect, type Page } from "@playwright/test";
import { COPY } from "../office/copy";

/** See office-crate.spec.ts: software WebGL can stall for seconds at a time late in a run. */
const MOVE_WAIT = 30_000;

const office = (page: Page) => page.locator(".office");

async function standInOffice(page: Page) {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
}

const canvas = (page: Page) => page.locator(".whiteboard-canvas");
/** Count of non-transparent pixels on the board's canvas. */
const inked = (page: Page) =>
  canvas(page).evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
/** Count of red pixels (the red marker's) on the board's canvas. */
const reddened = (page: Page) =>
  canvas(page).evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] > 200 && d[i + 1] < 120 && d[i + 2] < 120) n++;
    return n;
  });
/** Within 2% of `expected`: the same drawing redrawn can anti-alias a few edge pixels differently. */
const about = (n: number, expected: number) => expect(Math.abs(n - expected)).toBeLessThan(expected * 0.02);
/** Count of inked pixels in the middle ninth of the canvas (the drag below goes through it). */
const inkedMiddle = (page: Page) =>
  canvas(page).evaluate((c: HTMLCanvasElement) => {
    const w = c.width / 3, h = c.height / 3;
    const d = c.getContext("2d")!.getImageData(w, h, w, h).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });

async function openBoard(page: Page) {
  const item = page.getByRole("button", { name: COPY.whiteboard.nav });
  await item.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_whiteboard", { timeout: MOVE_WAIT });
  await expect(page.getByRole("heading", { name: COPY.whiteboard.title })).toBeFocused({ timeout: MOVE_WAIT });
  return item;
}
async function scribble(page: Page) {
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(box.x + box.width * (0.35 + 0.03 * k), box.y + box.height * (0.5 + 0.01 * k));
  await page.mouse.up();
}

test("hidden: no dot, no tour stop, just a nav item for keyboards", async ({ page }) => {
  await standInOffice(page);
  await expect(page.locator(".office-marker")).toHaveCount(4);
  await expect(page.locator('.office-marker[data-hotspot="hs_whiteboard"]')).toHaveCount(0);
});

test("draw where the pointer goes, swap colours, wipe it, leave and come back to it", async ({ page }) => {
  await standInOffice(page);
  const item = await openBoard(page);
  const start = await inked(page);
  expect(start).toBeGreaterThan(0); // TODO: sleep is on it
  const middle = await inkedMiddle(page);
  await scribble(page);
  expect(await inkedMiddle(page)).toBeGreaterThan(middle); // the line is where the pointer went
  await page.getByRole("button", { name: COPY.whiteboard.tools.red }).click();
  await expect(page.getByRole("button", { name: COPY.whiteboard.tools.red })).toHaveAttribute("aria-pressed", "true");
  await scribble(page);
  const drawn = await inked(page);

  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(item).toBeFocused();
  await openBoard(page);
  about(await inked(page), drawn); // still there
  expect(await reddened(page)).toBeGreaterThan(0); // the red line too
  await expect(page.getByRole("button", { name: COPY.whiteboard.tools.white })).toHaveAttribute("aria-pressed", "true"); // back with the white marker

  await page.getByRole("button", { name: COPY.whiteboard.wipe }).click();
  expect(await inked(page)).toBe(0);

  await page.reload();
  await standInOffice(page);
  await openBoard(page);
  about(await inked(page), start); // a fresh visit: TODO: sleep again
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("a finger draws, and every tool is big enough to tap", async ({ page }) => {
    await standInOffice(page);
    await openBoard(page);
    for (const name of [...Object.values(COPY.whiteboard.tools), COPY.whiteboard.eraser, COPY.whiteboard.wipe]) {
      const b = (await page.getByRole("button", { name }).boundingBox())!;
      expect(b.width, name).toBeGreaterThanOrEqual(40);
      expect(b.height, name).toBeGreaterThanOrEqual(40);
    }
    const before = await inkedMiddle(page);
    const box = (await canvas(page).boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const pt = (f: number) => ({ x: box.x + box.width * (0.35 + 0.3 * f), y: box.y + box.height * 0.5 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(0)] });
    for (let k = 1; k <= 10; k++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt(k / 10)] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(await inkedMiddle(page)).toBeGreaterThan(before);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("still draws", async ({ page }) => {
    await standInOffice(page);
    await openBoard(page);
    const before = await inked(page);
    await scribble(page);
    expect(await inked(page)).toBeGreaterThan(before);
  });
});
