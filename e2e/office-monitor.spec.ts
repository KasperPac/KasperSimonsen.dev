import { test, expect, type Locator, type Page } from "@playwright/test";
import { slides } from "../content/screens";
import { COPY } from "../office/copy";

/** See office-crate.spec.ts: software WebGL can stall for seconds at a time late in a run. */
const MOVE_WAIT = 30_000;

const office = (page: Page) => page.locator(".office");
const reel = (page: Page) => page.getByRole("region", { name: COPY.reel.title });
const laptop = (page: Page) => page.locator(".office-reel--laptop");

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

test("the notes come off, the reel steps on by hand, and See the case study plays the record and comes back", async ({ page }) => {
  await standInOffice(page);
  const button = await openMonitor(page);
  await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: MOVE_WAIT });
  await expect(reel(page).getByRole("heading", { name: COPY.reel.title })).toBeFocused();
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "0");
  await expect(laptop(page)).toContainText(slides[1].label); // the next one waits on the laptop
  // The laptop's print is decoration: hidden from screen readers, and not a region.
  const laptopPrint = page.locator(".office-screen").filter({ has: laptop(page) });
  await expect(laptopPrint).toHaveAttribute("aria-hidden", "true");
  await expect(laptopPrint).not.toHaveAttribute("aria-labelledby");

  await reel(page).getByRole("button", { name: COPY.reel.next }).click();
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "1", { timeout: MOVE_WAIT });
  expect(new URL(page.url()).pathname).toBe("/"); // the reel is local

  // The last slide has no record in the crate yet: its button opens the site (not clicked here, it opens another tab).
  const last = slides[slides.length - 1];
  await reel(page).getByRole("button", { name: COPY.reel.show(last.label) }).click();
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", String(slides.length - 1));
  await expect(reel(page).getByRole("button", { name: COPY.reel.visit })).toBeVisible();
  await expect(reel(page).getByRole("button", { name: COPY.reel.caseStudy })).toHaveCount(0);
  await reel(page).getByRole("button", { name: COPY.reel.show(slides[1].label) }).click();
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "1");

  await reel(page).getByRole("button", { name: COPY.reel.caseStudy }).click();
  await expect(page).toHaveURL(new RegExp(`/work/${slides[1].slug}$`));
  await expect(office(page)).toHaveAttribute("data-playing", slides[1].slug!);
  await expect(office(page)).toHaveAttribute("data-notes", "up", { timeout: MOVE_WAIT });

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: MOVE_WAIT });
  await expect(reel(page).getByRole("heading", { name: COPY.reel.title })).toBeFocused();
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "1"); // the same slide

  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-notes", "up", { timeout: MOVE_WAIT });
  await expect(button).toBeFocused();
});

test("it moves on by itself, and holds while the pointer is on the screen", async ({ page }) => {
  test.slow(); // over 12 s of the reel's clock (see reelSeconds)
  await standInOffice(page);
  await openMonitor(page);
  await page.mouse.move(2, 2);
  await reelSeconds(page, 5.7); // the hold and the drag
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "1", { timeout: MOVE_WAIT });
  const box = (await reel(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  await reelSeconds(page, 7);
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "1");
});

test("‹ drags the monitor's slide back to the laptop, and the window never flashes back over the monitor when it lands", async ({ page }) => {
  test.slow(); // a 0.7 s drag on the reel's clock (see reelSeconds)
  await standInOffice(page);
  await openMonitor(page);
  await page.mouse.move(2, 2);
  // Watch every write to --at. A write lands in the middle of a frame's script, and the observer's callback runs right after
  // it, before React's own render: so what it sees (the moving window still mounted or not) is what that frame paints.
  const watched = page.evaluate(
    () =>
      new Promise<{ seen: number[]; flashed: boolean }>((done) => {
        const root = document.querySelector<HTMLElement>(".office-reel[data-slide]")!;
        const seen: number[] = [];
        let flashed = false;
        const observer = new MutationObserver(() => {
          const at = parseFloat(root.style.getPropertyValue("--at"));
          if (!root.querySelector(".reel-moving--monitor")) return;
          // Going back the window moves 0 -> 1; a drop with the window still there covers the monitor with the slide that left.
          if (seen.length && at < Math.max(...seen) - 0.3) flashed = true;
          seen.push(at);
        });
        observer.observe(root, { attributes: true, attributeFilter: ["style"] });
        let mounted = false;
        let after = 0;
        const frame = () => {
          // The window is mounted from the click to the landing (the slide itself changes at the click).
          mounted ||= !!root.querySelector(".reel-moving--monitor");
          if (mounted && !root.querySelector(".reel-moving--monitor") && ++after > 4) {
            observer.disconnect();
            done({ seen, flashed });
          } else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  await reel(page).getByRole("button", { name: COPY.reel.prev }).click();
  await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", String(slides.length - 1), { timeout: MOVE_WAIT });
  const { seen, flashed } = await watched;
  expect(seen.length).toBeGreaterThan(1);
  expect(flashed, `--at while the window was mounted: ${seen.join(", ")}`).toBe(false);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("no fall, no drag, no auto-advance: the arrows switch it at once", async ({ page }) => {
    test.slow(); // 6.5 s of the reel's clock (see reelSeconds)
    await standInOffice(page);
    await openMonitor(page);
    await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: 5_000 });
    await page.mouse.move(2, 2);
    await reelSeconds(page, 6.5);
    await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "0");
    await reel(page).getByRole("button", { name: COPY.reel.next }).click();
    await expect(page.locator(".office-reel[data-slide]")).toHaveAttribute("data-slide", "1", { timeout: 2_000 });
  });
});

for (const height of [844, 664]) {
  test.describe(`phone 390x${height}`, () => {
    test.use({ viewport: { width: 390, height } });
    test("the reel fits the screen and reads on the phone", async ({ page }) => {
      await standInOffice(page);
      await openMonitor(page);
      const section = page.locator(".office-screen").filter({ has: page.locator(".office-reel[data-slide]") });
      await expect(section).toBeVisible({ timeout: MOVE_WAIT });
      expect(await section.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      expect(await printedPx(section, ".reel-headline")).toBeGreaterThanOrEqual(12);
      // Big enough to tap on the screen itself (the boxes include the print's 3D transform).
      for (const name of [COPY.reel.prev, COPY.reel.next, COPY.reel.caseStudy]) {
        const box = (await reel(page).getByRole("button", { name }).boundingBox())!;
        expect(box.width, name).toBeGreaterThanOrEqual(40);
        expect(box.height, name).toBeGreaterThanOrEqual(40);
      }
    });
  });
}
