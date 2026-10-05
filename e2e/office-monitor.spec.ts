import { test, expect, type Locator, type Page } from "@playwright/test";
import { slides } from "../content/screens";
import { COPY } from "../office/copy";

/** See office-crate.spec.ts: software WebGL can stall for seconds at a time late in a run. */
const MOVE_WAIT = 30_000;

const office = (page: Page) => page.locator(".office");
const reel = (page: Page) => page.getByRole("region", { name: COPY.reel.title });
const words = (page: Page) => page.locator(".reel-words");
const shotOnMonitor = (page: Page) => page.locator(".office-reel .reel-shot:not(.reel-moving) img");

async function standInOffice(page: Page) {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
}

async function openMonitor(page: Page) {
  const button = page.getByRole("button", { name: COPY.labels.hs_monitor });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: MOVE_WAIT });
  return button;
}

/**
 * Waits for `seconds` on the reel's own clock. useReel counts at most 0.1 s a frame, and software WebGL draws a frame or
 * two a second, so a plain timeout would see a fraction of that: 5 s of reel takes ~40 s here.
 */
async function reelSeconds(page: Page, seconds: number) {
  await page.evaluate(
    (s) =>
      new Promise<void>((done) => {
        let passed = 0;
        let last = performance.now();
        const frame = (now: number) => {
          passed += Math.max(0, Math.min(0.1, (now - last) / 1000));
          last = now;
          if (passed >= s) done();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
    seconds,
  );
}

/** Rendered size in screen px of the printed text in `region`'s body (`selector`): its CSS size times the 3D print's scale. */
async function printedPx(region: Locator, selector: string) {
  return region.evaluate((el, sel) => {
    const scale = el.getBoundingClientRect().width / (el as HTMLElement).offsetWidth;
    return parseFloat(getComputedStyle(el.querySelector(sel)!).fontSize) * scale;
  }, selector);
}

test("the notes come off, the screenshot fills the monitor, the words are on the laptop, and See the case study plays the record and comes back", async ({ page }) => {
  await standInOffice(page);
  const button = await openMonitor(page);
  await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: MOVE_WAIT });
  await expect(page.getByRole("heading", { name: COPY.reel.title })).toBeFocused({ timeout: MOVE_WAIT });
  await page.mouse.move(2, 2);
  await expect(page.locator(".reel-words--laptop")).toHaveCount(1);
  await expect(page.locator(".reel-words--strip")).toHaveCount(0);
  await expect(shotOnMonitor(page)).toBeVisible({ timeout: MOVE_WAIT }); // placed in the scene (hidden until then)
  const img =(await shotOnMonitor(page).boundingBox())!;
  expect(img.width / img.height).toBeGreaterThan(1.57);
  expect(img.width / img.height).toBeLessThan(1.63);
  await expect(words(page)).toHaveAttribute("data-slide", "0");
  // Each screenshot keeps its alt text, read with its label.
  await expect(shotOnMonitor(page)).toHaveAttribute("alt", `${slides[0].label}: ${slides[0].shot.alt}`);
  await reel(page).getByRole("button", { name: COPY.reel.next }).click();
  await expect(words(page)).toHaveAttribute("data-slide", "1", { timeout: MOVE_WAIT });
  expect(new URL(page.url()).pathname).toBe("/"); // the reel is local
  await expect(shotOnMonitor(page)).toHaveAttribute("src", slides[1].shot.src);
  await expect(words(page).locator(".reel-label")).toHaveText(slides[1].label);

  // The last slide has no record in the crate yet: its button opens the site (not clicked here, it opens another tab).
  const last = slides[slides.length - 1];
  await reel(page).getByRole("button", { name: COPY.reel.show(last.label) }).click();
  await expect(words(page)).toHaveAttribute("data-slide", String(slides.length - 1), { timeout: MOVE_WAIT });
  await expect(reel(page).getByRole("button", { name: COPY.reel.visit })).toBeVisible();
  await expect(reel(page).getByRole("button", { name: COPY.reel.caseStudy })).toHaveCount(0);
  await reel(page).getByRole("button", { name: COPY.reel.show(slides[1].label) }).click();
  await expect(words(page)).toHaveAttribute("data-slide", "1", { timeout: MOVE_WAIT });

  // the button plays the slide its words name
  await reel(page).getByRole("button", { name: COPY.reel.caseStudy }).click();
  await expect(page).toHaveURL(new RegExp(`/work/${slides[1].slug}$`), { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-playing", slides[1].slug!);
  await expect(office(page)).toHaveAttribute("data-notes", "up", { timeout: MOVE_WAIT });
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: MOVE_WAIT });
  await expect(page.getByRole("heading", { name: COPY.reel.title })).toBeFocused({ timeout: MOVE_WAIT });
  await expect(words(page)).toHaveAttribute("data-slide", "1"); // the same slide
  await page.goBack();
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-notes", "up", { timeout: MOVE_WAIT });
  await expect(button).toBeFocused();
});

test("it moves on by itself, and holds while the pointer is on the laptop's words", async ({ page }) => {
  test.slow(); // over 12 s of the reel's clock (see reelSeconds)
  await standInOffice(page);
  await openMonitor(page);
  await page.mouse.move(2, 2);
  await reelSeconds(page, 5.7); // the hold and the slide
  await expect(words(page)).toHaveAttribute("data-slide", "1", { timeout: MOVE_WAIT });
  const box = (await words(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  await reelSeconds(page, 7);
  await expect(words(page)).toHaveAttribute("data-slide", "1");
});

test("‹ slides the screenshot back out to the right, and it never flashes back over the monitor when it lands", async ({ page }) => {
  test.slow(); // a 0.7 s slide on the reel's clock (see reelSeconds)
  await standInOffice(page);
  await openMonitor(page);
  await page.mouse.move(2, 2);
  // Watch every write to --at. A write lands in the middle of a frame's script, and the observer's callback runs right after
  // it, before React's own render: so what it sees (the sliding screenshot still mounted or not) is what that frame paints.
  const watched = page.evaluate(
    () =>
      new Promise<{ seen: number[]; flashed: boolean }>((done) => {
        const root = document.querySelector<HTMLElement>(".office-reel[data-reel]")!;
        const seen: number[] = [];
        let flashed = false;
        const observer = new MutationObserver(() => {
          const at = parseFloat(root.style.getPropertyValue("--at"));
          if (!root.querySelector(".reel-moving")) return;
          // Going back the screenshot moves 0 -> 1; a drop with it still there covers the monitor with the slide that left.
          if (seen.length && at < Math.max(...seen) - 0.3) flashed = true;
          seen.push(at);
        });
        observer.observe(root, { attributes: true, attributeFilter: ["style"] });
        let mounted = false;
        let after = 0;
        const frame = () => {
          mounted ||= !!root.querySelector(".reel-moving");
          if (mounted && !root.querySelector(".reel-moving") && ++after > 4) {
            observer.disconnect();
            done({ seen, flashed });
          } else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  await reel(page).getByRole("button", { name: COPY.reel.prev }).click();
  await expect(words(page)).toHaveAttribute("data-slide", String(slides.length - 1), { timeout: MOVE_WAIT });
  await expect(shotOnMonitor(page)).toHaveAttribute("src", slides[slides.length - 1].shot.src);
  const { seen, flashed } = await watched;
  expect(seen.length).toBeGreaterThan(1);
  expect(flashed, `--at while the screenshot was mounted: ${seen.join(", ")}`).toBe(false);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("no fall, no slide, no auto-advance: the arrows switch the screenshot and the words at once", async ({ page }) => {
    await standInOffice(page);
    await openMonitor(page);
    await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: MOVE_WAIT });
    await reel(page).getByRole("button", { name: COPY.reel.next }).click();
    await expect(words(page)).toHaveAttribute("data-slide", "1", { timeout: 2_000 });
    await expect(shotOnMonitor(page)).toHaveAttribute("src", slides[1].shot.src);
    await expect(page.locator(".reel-moving")).toHaveCount(0);
  });
});

for (const height of [844, 664]) {
  test.describe(`phone 390x${height}`, () => {
    test.use({ viewport: { width: 390, height } });
    test("the words move to a strip under the monitor, on the screen and big enough to tap", async ({ page }) => {
      await standInOffice(page);
      await openMonitor(page);
      await expect(page.locator(".reel-words--strip")).toHaveCount(1, { timeout: MOVE_WAIT });
      await expect(page.locator(".reel-words--laptop")).toHaveCount(0);
      // Each print is hidden until drei has placed it in the scene (before that it lies flat at the canvas's top left).
      await expect(words(page)).toBeVisible({ timeout: MOVE_WAIT });
      await expect(shotOnMonitor(page)).toBeVisible({ timeout: MOVE_WAIT });
      const strip = (await words(page).boundingBox())!;
      const shot = (await shotOnMonitor(page).boundingBox())!;
      expect(strip.y).toBeGreaterThan(shot.y + shot.height - 1); // under the monitor
      expect(strip.y + strip.height).toBeLessThanOrEqual(height);
      expect(strip.x).toBeGreaterThanOrEqual(0);
      expect(strip.x + strip.width).toBeLessThanOrEqual(390);
      expect(await printedPx(words(page), ".reel-headline")).toBeGreaterThanOrEqual(12);
      for (const name of [COPY.reel.prev, COPY.reel.next, COPY.reel.caseStudy]) {
        const box = (await reel(page).getByRole("button", { name }).boundingBox())!;
        expect(box.width, name).toBeGreaterThanOrEqual(40);
        expect(box.height, name).toBeGreaterThanOrEqual(40);
      }
    });
  });
}
