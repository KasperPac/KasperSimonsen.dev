import { test, expect, type Page } from "@playwright/test";
import { work } from "../content/work";

/**
 * How long to wait for the camera, the director or an object to arrive. On a GPU these take about a second; under
 * software WebGL a long run of heavy pages in one headless browser can freeze rendering for ~10 s at a time (one
 * frame measured 9.87 s), so give it room. The assertions are unchanged.
 */
const MOVE_WAIT = 30_000;

const office = (page: Page) => page.locator(".office");

async function standInOffice(page: Page) {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
}

async function openCrate(page: Page) {
  const button = page.getByRole("button", { name: "The work" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_crate", { timeout: MOVE_WAIT });
  return button;
}

const crate = (page: Page) => page.locator('[aria-roledescription="record crate"]');

test("the keyboard flicks, pulls, reads and steps back out one layer at a time", async ({ page }) => {
  await standInOffice(page);
  const button = await openCrate(page);
  await expect(crate(page)).toBeFocused();
  await expect(office(page)).toHaveAttribute("data-dig", "0");
  await page.keyboard.press("ArrowDown");
  await expect(office(page)).toHaveAttribute("data-dig", "1");
  await page.keyboard.press("ArrowUp");
  await expect(office(page)).toHaveAttribute("data-dig", "0");
  for (let i = 0; i < work.length + 2; i++) await page.keyboard.press("ArrowDown");
  const last = work[work.length - 1];
  await expect(office(page)).toHaveAttribute("data-dig", String(work.length - 1)); // stops at the last project
  await expect(page).toHaveURL(/\/$/); // flicking is local

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/work/${last.slug}$`));
  await expect(office(page)).toHaveAttribute("data-playing", last.slug); // on the record player
  await expect(office(page)).toHaveAttribute("data-sleeve", "out", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-camera", "focus", { timeout: MOVE_WAIT });
  const back = page.getByRole("region", { name: last.name });
  await expect(back).toBeVisible();
  await expect(back.getByRole("heading", { name: last.name })).toBeFocused();

  const more = back.getByRole("button", { name: "Read more" });
  await more.click();
  const dialog = page.getByRole("dialog", { name: last.name });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/work/${last.slug}$`)); // Read more never changes the URL

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(more).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-playing", "");
  await expect(office(page)).toHaveAttribute("data-sleeve", "in", { timeout: MOVE_WAIT });
  await expect(crate(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(button).toBeFocused();
});

test("sweeping the pointer back across the crate flicks through the records in order, and back again, without jumping", async ({ page }) => {
  test.setTimeout(240_000); // dozens of pointer moves, each waiting for frames under software WebGL
  await standInOffice(page);
  await openCrate(page);
  await expect(office(page)).toHaveAttribute("data-camera", "focus", { timeout: MOVE_WAIT });
  // the crate's marker sits over the middle of its opening (markers follow HOTSPOTS order: the crate first)
  const at = await page.evaluate(() => {
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec((document.querySelector(".office-marker") as HTMLElement).style.transform)!;
    return { x: Number(m[1]), y: Number(m[2]) };
  });
  const dig = async () => Number(await office(page).getAttribute("data-dig"));
  // software WebGL can hold React's update behind a slow frame: wait for two frames to pass before reading
  const settle = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(null)))));
  const sweep = async (from: number, to: number) => {
    const seen: number[] = [];
    for (let dy = from; from > to ? dy >= to : dy <= to; dy += from > to ? -12 : 12) {
      await page.mouse.move(at.x, at.y + dy);
      await settle();
      seen.push(await dig());
    }
    return seen;
  };
  const back = await sweep(200, -200); // from in front of the crate, over the leaning records, to its back
  expect(back).toEqual([...back].sort((a, b) => a - b)); // only ever forward through the crate
  expect(new Set(back)).toEqual(new Set(work.map((_, i) => i)));
  const forward = await sweep(-200, 200);
  expect(forward).toEqual([...forward].sort((a, b) => b - a)); // only ever back
  expect(forward[forward.length - 1]).toBe(0);
  // a pointer resting on the crate, trembling a pixel, holds its record
  await page.mouse.move(at.x, at.y);
  await settle();
  const held = await dig();
  for (const dy of [1, -1, 1, -1, 0]) {
    await page.mouse.move(at.x, at.y + dy);
    await settle();
    expect(await dig()).toBe(held);
  }
});

test("Forward onto a project's URL brings its record out again, the ones in front flicked", async ({ page }) => {
  const item = work[work.length - 1];
  await standInOffice(page);
  await openCrate(page);
  for (let i = 0; i < work.length; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/work/${item.slug}$`));
  await page.goBack();
  await expect(office(page)).toHaveAttribute("data-sleeve", "in", { timeout: MOVE_WAIT });
  for (let i = 0; i < work.length; i++) await page.keyboard.press("ArrowUp");
  await expect(office(page)).toHaveAttribute("data-dig", "0");
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/work/${item.slug}$`));
  await expect(office(page)).toHaveAttribute("data-dig", String(work.length - 1));
  await expect(office(page)).toHaveAttribute("data-sleeve", "out", { timeout: MOVE_WAIT });
  await expect(page.getByRole("region", { name: item.name })).toBeVisible();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("flicks and pulls without animating", async ({ page }) => {
    await standInOffice(page);
    await openCrate(page);
    await expect(crate(page)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(office(page)).toHaveAttribute("data-dig", "1");
    await page.keyboard.press("Enter");
    await expect(office(page)).toHaveAttribute("data-sleeve", "out", { timeout: 5_000 });
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("pulls the sleeve close enough to fill most of the width", async ({ page }) => {
    await standInOffice(page);
    await openCrate(page);
    await expect(crate(page)).toBeFocused();
    await page.keyboard.press("Enter");
    const back = page.getByRole("region", { name: work[0].name });
    await expect(back).toBeVisible({ timeout: MOVE_WAIT });
    expect((await back.boundingBox())!.width).toBeGreaterThan(390 * 0.7);
  });
});
