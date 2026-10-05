import { test, expect, type Locator, type Page } from "@playwright/test";
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

/** Rendered size in screen px of the printed text in `region`'s body (`selector`): its CSS size times the 3D print's scale. */
async function printedPx(region: Locator, selector: string) {
  return region.evaluate((el, sel) => {
    const scale = el.getBoundingClientRect().width / (el as HTMLElement).offsetWidth;
    return parseFloat(getComputedStyle(el.querySelector(sel)!).fontSize) * scale;
  }, selector);
}

test("the keyboard flicks, pulls, reads and steps back out one layer at a time", async ({ page }) => {
  await standInOffice(page);
  const button = await openCrate(page);
  await expect(crate(page)).toBeFocused();
  await expect(office(page)).toHaveAttribute("data-dig", "0");
  await page.keyboard.press("ArrowDown");
  await expect(office(page)).toHaveAttribute("data-dig", "1");
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: work[1].name })).toHaveCount(1); // read out as it flicks
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
    const m = /([-\d.]+)px ([-\d.]+)px/.exec((document.querySelector(".office-marker") as HTMLElement).style.translate)!;
    return { x: Number(m[1]), y: Number(m[2]) };
  });
  const dig = async () => Number(await office(page).getAttribute("data-dig"));
  const sweep = async (from: number, to: number) => {
    const seen: number[] = [];
    for (let dy = from; from > to ? dy >= to : dy <= to; dy += from > to ? -12 : 12) {
      await page.mouse.move(at.x, at.y + dy);
      await settle(page);
      seen.push(await dig());
    }
    return seen;
  };
  const back = await sweep(200, -200); // from in front of the crate, over the leaning records, to its back
  expect(back).toEqual([...back].sort((a, b) => a - b)); // only ever forward through the crate
  expect(new Set(back), `back sweep: ${back.join(" ")}`).toEqual(new Set(work.map((_, i) => i)));
  const forward = await sweep(-200, 200);
  expect(forward).toEqual([...forward].sort((a, b) => b - a)); // only ever back
  expect(forward[forward.length - 1]).toBe(0);
  // a pointer resting on the crate, trembling a pixel, holds its record
  await page.mouse.move(at.x, at.y);
  await settle(page);
  const held = await dig();
  for (const dy of [1, -1, 1, -1, 0]) {
    await page.mouse.move(at.x, at.y + dy);
    await settle(page);
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
  test("plays the record in view of the platter, then comes in until the sleeve fills most of the width", async ({ page }) => {
    await standInOffice(page);
    await openCrate(page);
    await expect(crate(page)).toBeFocused();
    await page.keyboard.press("Enter");
    const back = page.getByRole("region", { name: work[0].name });
    await expect(back).toBeVisible({ timeout: MOVE_WAIT });
    // the record goes on in a wider view with the platter in shot, then the camera comes in to read the sleeve
    await expect.poll(async () => (await back.boundingBox())?.width ?? 0, { timeout: MOVE_WAIT }).toBeGreaterThan(390 * 0.7);
    expect(await printedPx(back, ".office-card-text")).toBeGreaterThanOrEqual(13); // readable on the phone itself
  });
});

test.describe("touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("a swipe up across the crate flicks exactly one record", async ({ page }) => {
    await standInOffice(page);
    await openCrate(page);
    await expect(office(page)).toHaveAttribute("data-camera", "focus", { timeout: MOVE_WAIT });
    const at = await page.evaluate(() => {
      const m = /([-\d.]+)px ([-\d.]+)px/.exec((document.querySelector(".office-marker") as HTMLElement).style.translate)!;
      return { x: Number(m[1]), y: Number(m[2]) };
    });
    // one finger dragged up the crate: down, a run of moves, up (the canvas's event source is its parent)
    await page.evaluate(({ x, y }) => {
      const target = document.querySelector(".office-stage canvas")!.parentElement!;
      const fire = (type: string, cy: number) =>
        target.dispatchEvent(new PointerEvent(type, { pointerType: "touch", pointerId: 7, isPrimary: true, clientX: x, clientY: cy, bubbles: true }));
      fire("pointerdown", y + 70);
      for (let d = 70; d >= -70; d -= 10) fire("pointermove", y + d);
      fire("pointerup", y - 70);
    }, at);
    await expect(office(page)).toHaveAttribute("data-dig", "1");
    await page.waitForTimeout(500);
    await expect(office(page)).toHaveAttribute("data-dig", "1"); // and stays there
  });
});

/** Where the crate's dot sits on screen: the top centre of the crate. */
const crateTop = (page: Page) =>
  page.evaluate(() => {
    const m = /([-\d.]+)px ([-\d.]+)px/.exec((document.querySelector(".office-marker") as HTMLElement).style.translate)!;
    return { x: Number(m[1]), y: Number(m[2]) };
  });

/** Waits for two frames to pass: software WebGL can hold React's update behind a slow frame, so wait before reading. */
const settle = (page: Page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(null)))));

test.describe("picking the record you mean", () => {
  test.describe("by touch", () => {
    test.use({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });
    test("a tap on the front record's top edge plays that record, not the one behind", async ({ page }) => {
      await standInOffice(page);
      await openCrate(page);
      await expect(office(page)).toHaveAttribute("data-camera", "focus", { timeout: MOVE_WAIT });
      const at = await crateTop(page);
      await page.touchscreen.tap(at.x, at.y + 30);
      await expect(office(page)).toHaveAttribute("data-playing", work[0].slug, { timeout: MOVE_WAIT });
    });
  });

  test("bringing a record forward and moving down onto its cover to click it plays that record", async ({ page }) => {
    test.skip(work.length < 3, "needs a middle record");
    test.setTimeout(240_000); // a pointer move at a time, each waiting for frames under software WebGL
    await standInOffice(page);
    await openCrate(page);
    await expect(office(page)).toHaveAttribute("data-camera", "focus", { timeout: MOVE_WAIT });
    // one of the middle records, so the back one coming up by mistake (or the front one staying) can't pass for it
    const target = Math.ceil((work.length - 1) / 2);
    const at = await crateTop(page);
    // back across the crate from in front of it, as a visitor flicks, until that record is at the front
    let y = at.y + 200;
    for (; y >= at.y - 200; y -= 6) {
      await page.mouse.move(at.x, y);
      await settle(page);
      if (Number(await office(page).getAttribute("data-dig")) >= target) break;
    }
    await expect(office(page)).toHaveAttribute("data-dig", String(target));
    await page.mouse.move(at.x, y + 40, { steps: 8 }); // down off its top edge onto its cover
    await expect(office(page)).toHaveAttribute("data-dig", String(target));
    await page.mouse.click(at.x, y + 40);
    await expect(office(page)).toHaveAttribute("data-playing", work[target].slug, { timeout: MOVE_WAIT });
  });

  test("a click on a record peeking over the front one plays the front record, not the one clicked", async ({ page }) => {
    test.setTimeout(240_000);
    test.skip(work.length < 3, "needs a middle record");
    await standInOffice(page);
    await openCrate(page);
    await expect(office(page)).toHaveAttribute("data-camera", "focus", { timeout: MOVE_WAIT });
    const at = await crateTop(page);
    // back across the crate from in front of it until the second record's top edge is under the pointer (it comes up)
    let y = at.y + 200;
    for (; y >= at.y - 200; y -= 6) {
      await page.mouse.move(at.x, y);
      await settle(page);
      if (Number(await office(page).getAttribute("data-dig")) >= 1) break;
    }
    await expect(office(page)).toHaveAttribute("data-dig", "1");
    // the keyboard puts the first record at the front again, leaving the pointer on the second one's top edge peeking over it
    await page.keyboard.press("ArrowUp");
    await expect(office(page)).toHaveAttribute("data-dig", "0");
    await page.waitForTimeout(1500); // the records finish moving under the resting pointer
    // press and release in place (no move to re-pick by hover): the record shown at the front plays, not the one under the pointer
    await page.mouse.down();
    await page.mouse.up();
    await expect(office(page)).toHaveAttribute("data-playing", work[0].slug, { timeout: MOVE_WAIT });
  });
});
