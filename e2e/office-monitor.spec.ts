import { test, expect, type Locator, type Page } from "@playwright/test";
import { slides } from "../content/screens";
import { findWork } from "../content/work";
import { COPY } from "../office/copy";

/** See office-crate.spec.ts: software WebGL can stall for seconds at a time late in a run. */
const MOVE_WAIT = 30_000;

const office = (page: Page) => page.locator(".office");
/** The monitor's print: the screenshot, and the carousel over it (‹ ›, the dots, the expand button), named by its hidden heading. */
const reel = (page: Page) => page.getByRole("region", { name: COPY.reel.title });
/** The reel's words: on the laptop, or on a strip under the monitor. */
const words = (page: Page) => page.locator(".reel-words");
const shotOnMonitor = (page: Page) => page.locator(".office-reel .reel-shot:not(.reel-moving) img");
/** A slide's dot on the monitor, by its exact name (one label may start another's). */
const dot = (page: Page, i: number) => reel(page).getByRole("button", { name: COPY.reel.show(slides[i].label), exact: true });
/** The full-screen view of slide `i`, by its exact name. */
const viewer = (page: Page, i: number) => page.getByRole("dialog", { name: slides[i].label, exact: true });
const slideNow = async (page: Page) => Number(await words(page).getAttribute("data-slide"));
/** Whether a print holds all its content: nothing pushed out below or to the side. */
const fits = (print: Locator) => print.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1);

// Found by what they are, not where they sit in the reel, so adding or reordering slides doesn't break the tests.
/** A slide that plays a crate record (See the case study). */
const CRATE = slides.findIndex((s) => s.slug);
/** A slide for a live site outside the crate (Visit the site). */
const SITE = slides.findIndex((s) => !s.slug && s.href);

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

test("the notes come off, the screenshot fills the monitor with the carousel over it, the words are on the laptop, and See the case study plays the record and comes back", async ({ page }) => {
  await standInOffice(page);
  const button = await openMonitor(page);
  await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: MOVE_WAIT });
  // the hidden heading that takes focus is on the monitor, with the carousel
  await expect(page.getByRole("heading", { name: COPY.reel.title })).toBeFocused({ timeout: MOVE_WAIT });
  await expect(page.locator(".office-reel").getByRole("heading", { name: COPY.reel.title })).toHaveCount(1);
  await page.mouse.move(2, 2);
  await expect(page.locator(".reel-words--laptop")).toHaveCount(1);
  await expect(page.locator(".reel-words--strip")).toHaveCount(0);
  await expect(shotOnMonitor(page)).toBeVisible({ timeout: MOVE_WAIT }); // placed in the scene (hidden until then)
  // ‹ › and a dot per slide are on the monitor's print; the words have none of them
  for (const name of [COPY.reel.prev, COPY.reel.next]) {
    await expect(page.locator(".office-reel").getByRole("button", { name })).toHaveCount(1);
    await expect(words(page).getByRole("button", { name })).toHaveCount(0);
  }
  await expect(page.locator(".office-reel .reel-dot")).toHaveCount(slides.length);
  await expect(words(page).locator(".reel-dot")).toHaveCount(0);
  // laid out at 1280 px across, so the browser shrinks it onto the screen (sharp) rather than blowing it up
  expect(await page.locator(".office-reel").evaluate((el) => (el as HTMLElement).offsetWidth)).toBe(1280);
  const img = (await shotOnMonitor(page).boundingBox())!;
  expect(img.width / img.height).toBeGreaterThan(1.75); // 16:9
  expect(img.width / img.height).toBeLessThan(1.8);
  await expect(words(page)).toHaveAttribute("data-slide", "0");
  // Each screenshot keeps its alt text, read with its label.
  await expect(shotOnMonitor(page)).toHaveAttribute("alt", `${slides[0].label}: ${slides[0].shot.alt}`);
  await reel(page).getByRole("button", { name: COPY.reel.next }).click();
  await expect(words(page)).toHaveAttribute("data-slide", "1", { timeout: MOVE_WAIT });
  expect(new URL(page.url()).pathname).toBe("/"); // the reel is local
  await expect(shotOnMonitor(page)).toHaveAttribute("src", slides[1].shot.src);
  await expect(words(page).locator(".reel-label")).toHaveText(slides[1].label);
  await expect(page.getByRole("dialog")).toHaveCount(0); // › steps; it doesn't open full screen
  expect(await fits(words(page))).toBe(true); // the laptop's print holds its words and action

  // A live site with no record in the crate yet: its button opens the site (not clicked here, it opens another tab).
  if (SITE >= 0) {
    await dot(page, SITE).click();
    await expect(words(page)).toHaveAttribute("data-slide", String(SITE), { timeout: MOVE_WAIT });
    await expect(words(page).getByRole("button", { name: COPY.reel.visit })).toBeVisible();
    await expect(words(page).getByRole("button", { name: COPY.reel.caseStudy })).toHaveCount(0);
    await expect(words(page).locator(".reel-description, .reel-details")).toHaveCount(0); // work not in the crate: its own line only
  } else test.info().annotations.push({ type: "skipped", description: "Visit the site: no slide is a live site outside the crate" });

  if (CRATE < 0) {
    test.info().annotations.push({ type: "skipped", description: "See the case study: no slide plays a crate record" });
    return;
  }
  await dot(page, CRATE).click();
  await expect(words(page)).toHaveAttribute("data-slide", String(CRATE), { timeout: MOVE_WAIT });
  await expect(page.getByRole("dialog")).toHaveCount(0); // a dot doesn't open full screen
  // the laptop reads the project's description and its details line
  const project = findWork(slides[CRATE].slug!)!;
  await expect(words(page).locator(".reel-description")).toHaveText(project.description);
  await expect(words(page).locator(".reel-details")).toHaveText(project.details);
  expect(await fits(words(page))).toBe(true);

  // the button plays the slide its words name
  await words(page).getByRole("button", { name: COPY.reel.caseStudy }).click();
  await expect(page).toHaveURL(new RegExp(`/work/${slides[CRATE].slug}$`), { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-playing", slides[CRATE].slug!);
  await expect(office(page)).toHaveAttribute("data-notes", "up", { timeout: MOVE_WAIT });
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: MOVE_WAIT });
  await expect(page.getByRole("heading", { name: COPY.reel.title })).toBeFocused({ timeout: MOVE_WAIT });
  await expect(words(page)).toHaveAttribute("data-slide", String(CRATE)); // the same slide
  await page.goBack();
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-notes", "up", { timeout: MOVE_WAIT });
  await expect(button).toBeFocused();
});

test("a click on the screenshot opens it full screen: uncropped, ← → step, the reel holds still, Esc or Back closes it back to the monitor", async ({ page }) => {
  test.slow(); // 7 s of the reel's clock (see reelSeconds)
  await standInOffice(page);
  const monitorButton = await openMonitor(page);
  await expect(shotOnMonitor(page)).toBeVisible({ timeout: MOVE_WAIT });
  const heading = page.getByRole("heading", { name: COPY.reel.title });
  await expect(heading).toBeFocused({ timeout: MOVE_WAIT });

  // ‹ steps; it doesn't open full screen
  const before = await slideNow(page);
  await reel(page).getByRole("button", { name: COPY.reel.prev }).click();
  await expect(words(page)).not.toHaveAttribute("data-slide", String(before), { timeout: MOVE_WAIT });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".office-reel .reel-moving")).toHaveCount(0, { timeout: MOVE_WAIT });

  // The screenshot's centre, away from the zones and the dots.
  const i = await slideNow(page);
  const open = (await page.locator(".office-reel .reel-open").boundingBox())!;
  await page.mouse.click(open.x + open.width / 2, open.y + open.height / 2);
  await expect(viewer(page, i)).toBeVisible({ timeout: MOVE_WAIT });
  expect(new URL(page.url()).pathname).toBe("/"); // a local layer, like the panels
  const img = viewer(page, i).locator("img");
  await expect(img).toHaveAttribute("src", slides[i].shot.src);
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
  const vp = page.viewportSize()!;
  const box = (await img.boundingBox())!;
  test.info().annotations.push({ type: "measured", description: `full screen: ${box.width.toFixed(1)} x ${box.height.toFixed(1)} in ${vp.width} x ${vp.height}` });
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 0.5);
  expect(Math.max(box.width / vp.width, box.height / vp.height), `${box.width} x ${box.height} in ${vp.width} x ${vp.height}`).toBeGreaterThanOrEqual(0.9);
  expect(await img.evaluate((el) => getComputedStyle(el).objectFit)).toBe("contain");

  // → steps to the next slide, at once
  const next = (i + 1) % slides.length;
  await page.keyboard.press("ArrowRight");
  await expect(viewer(page, next)).toBeVisible({ timeout: 5_000 });
  await expect(viewer(page, next).locator("img")).toHaveAttribute("src", slides[next].shot.src);

  // Esc closes just the view: still at the monitor, focus back on it (a click leaves focus nowhere, so: its heading)
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor");
  await expect(heading).toBeFocused();
  await expect(words(page)).toHaveAttribute("data-slide", String(next)); // the monitor followed the view

  // Back closes it too, without leaving the monitor
  await page.mouse.click(open.x + open.width / 2, open.y + open.height / 2);
  await expect(viewer(page, next)).toBeVisible({ timeout: MOVE_WAIT });
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor");

  // From the keyboard, by the expand button; the reel holds still while the view is open (the pointer away from it all)
  await page.mouse.move(2, 2);
  const expand = reel(page).getByRole("button", { name: COPY.reel.expand });
  await expand.focus();
  await page.keyboard.press("Enter");
  const held = await slideNow(page);
  await expect(viewer(page, held)).toBeVisible({ timeout: MOVE_WAIT });
  await reelSeconds(page, 7);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(words(page)).toHaveAttribute("data-slide", String(held));
  await expect(expand).toBeFocused(); // back on what opened it
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor");

  // a second Esc leaves the monitor
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(monitorButton).toBeFocused();
});

test("it moves on by itself, and holds while the pointer is on the laptop's words or the monitor's screenshot", async ({ page }) => {
  test.slow(); // over 19 s of the reel's clock (see reelSeconds)
  await standInOffice(page);
  await openMonitor(page);
  await expect(words(page)).toBeVisible({ timeout: MOVE_WAIT });
  await expect(shotOnMonitor(page)).toBeVisible({ timeout: MOVE_WAIT });
  const onWords = (await words(page).boundingBox())!;
  const onShot = (await shotOnMonitor(page).boundingBox())!;
  await page.mouse.move(2, 2);
  await reelSeconds(page, 5.7); // the hold and the slide
  // On the words straight away (before asserting, so the reel can't step on meanwhile), then: still on slide 1?
  await page.mouse.move(onWords.x + onWords.width / 2, onWords.y + onWords.height / 3);
  await expect(words(page)).toHaveAttribute("data-slide", "1", { timeout: MOVE_WAIT });
  await reelSeconds(page, 7);
  await expect(words(page)).toHaveAttribute("data-slide", "1");
  // and on the monitor's screenshot
  await page.mouse.move(onShot.x + onShot.width / 2, onShot.y + onShot.height / 2);
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
  test("no fall, no slide, no auto-advance: the arrows switch the screenshot and the words at once; Esc from the controls leaves", async ({ page }) => {
    test.slow(); // 6.5 s of the reel's clock (see reelSeconds)
    await standInOffice(page);
    const button = await openMonitor(page);
    await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: 5_000 }); // no fall: they're down at once
    await page.mouse.move(2, 2);
    await reelSeconds(page, 6.5);
    await expect(words(page)).toHaveAttribute("data-slide", "0"); // no auto-advance
    await reel(page).getByRole("button", { name: COPY.reel.next }).click();
    await expect(words(page)).toHaveAttribute("data-slide", "1", { timeout: 2_000 });
    await expect(shotOnMonitor(page)).toHaveAttribute("src", slides[1].shot.src);
    await expect(page.locator(".reel-moving")).toHaveCount(0);
    // Esc from the monitor's controls backs out of the monitor (spec 3.5.6), the notes back on the bezel.
    await expect(reel(page).getByRole("button", { name: COPY.reel.next })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
    await expect(office(page)).toHaveAttribute("data-notes", "up", { timeout: MOVE_WAIT });
    await expect(button).toBeFocused();
  });
});

// Phones, and a portrait tablet (squarer: the camera widens to keep the strip on screen). Under reduced motion, so each
// slide is stepped to at once: every slide is checked, and a new one checks itself.
for (const [width, height] of [
  [390, 844],
  [390, 664],
  [768, 1024],
]) {
  test.describe(`portrait ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, reducedMotion: "reduce" });
    test("the words move to a strip under the monitor, on the screen and big enough to tap, on every slide; ‹ › on the monitor are finger-sized and the dots only mark the place", async ({ page }) => {
      test.slow(); // a pass over every slide
      await standInOffice(page);
      await openMonitor(page);
      await expect(page.locator(".reel-words--strip")).toHaveCount(1, { timeout: MOVE_WAIT });
      await expect(page.locator(".reel-words--laptop")).toHaveCount(0);
      // Each print is hidden until drei has placed it in the scene (before that it lies flat at the canvas's top left).
      await expect(words(page)).toBeVisible({ timeout: MOVE_WAIT });
      await expect(shotOnMonitor(page)).toBeVisible({ timeout: MOVE_WAIT });
      const shot = (await shotOnMonitor(page).boundingBox())!;
      // the monitor's whole screen is on screen
      expect(shot.y).toBeGreaterThanOrEqual(0);
      expect(shot.x).toBeGreaterThanOrEqual(0);
      expect(shot.x + shot.width).toBeLessThanOrEqual(width);
      expect(await printedPx(words(page), ".reel-headline")).toBeGreaterThanOrEqual(12);
      // On the monitor: ‹ › big enough for a finger, over the screenshot; the dots too small to tap, so only a marker.
      await expect(reel(page).locator(".reel-dot")).toHaveCount(0);
      await expect(reel(page).locator(".reel-pip")).toHaveCount(slides.length);
      await expect(reel(page).getByText(COPY.reel.position(1, slides.length), { exact: true })).toHaveCount(1);
      for (const name of [COPY.reel.prev, COPY.reel.next]) {
        const box = (await reel(page).getByRole("button", { name }).boundingBox())!;
        test.info().annotations.push({ type: "measured", description: `${width}x${height} ${name}: ${box.width.toFixed(1)} x ${box.height.toFixed(1)}` });
        expect(box.width, name).toBeGreaterThanOrEqual(40);
        expect(box.height, name).toBeGreaterThanOrEqual(40);
        expect(box.x, name).toBeGreaterThanOrEqual(shot.x - 1);
        expect(box.x + box.width, name).toBeLessThanOrEqual(shot.x + shot.width + 1);
      }
      for (let k = 0; k < slides.length; k++) {
        if (k > 0) await reel(page).getByRole("button", { name: COPY.reel.next }).click();
        await expect(words(page)).toHaveAttribute("data-slide", String(k), { timeout: 5_000 });
        const at = `slide ${k} (${slides[k].label})`;
        const strip = (await words(page).boundingBox())!;
        expect(strip.y, at).toBeGreaterThan(shot.y + shot.height - 1); // under the monitor
        expect(strip.y + strip.height, at).toBeLessThanOrEqual(height);
        expect(strip.x, at).toBeGreaterThanOrEqual(0);
        expect(strip.x + strip.width, at).toBeLessThanOrEqual(width);
        expect(await fits(words(page)), `${at}: the strip holds its words and action`).toBe(true);
        // the label, the headline, two lines of the description and the action: no details line on the strip
        await expect(words(page).locator(".reel-description"), at).toHaveCount(slides[k].slug ? 1 : 0);
        if (slides[k].slug) await expect(words(page).locator(".reel-description"), at).toBeVisible();
        await expect(words(page).locator(".reel-details"), at).toHaveCount(0);
        const action = slides[k].slug ? [COPY.reel.caseStudy] : slides[k].href ? [COPY.reel.visit] : [];
        for (const name of action) {
          const box = (await words(page).getByRole("button", { name }).boundingBox())!;
          test.info().annotations.push({ type: "measured", description: `${width}x${height} ${at} ${name}: ${box.width.toFixed(1)} x ${box.height.toFixed(1)}` });
          expect(box.width, `${at}: ${name}`).toBeGreaterThanOrEqual(40);
          expect(box.height, `${at}: ${name}`).toBeGreaterThanOrEqual(40);
          expect(box.y + box.height, `${at}: ${name} inside the strip`).toBeLessThanOrEqual(strip.y + strip.height + 1);
          expect(box.x + box.width, `${at}: ${name} inside the strip`).toBeLessThanOrEqual(strip.x + strip.width + 1);
        }
      }
    });
  });
}
