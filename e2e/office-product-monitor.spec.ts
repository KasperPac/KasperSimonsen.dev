import { test, expect, type Page } from "@playwright/test";
import { work } from "../content/work";
import { slides } from "../content/screens";

const WAIT = 60_000;
const office = (page: Page) => page.locator(".office");

async function readProduct(page: Page, slug: string) {
  const index = work.findIndex(item => item.slug === slug);
  const item = work[index];
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: WAIT });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: WAIT });
  await page.getByRole("button", { name: "The work", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_crate", { timeout: WAIT });
  for (let i = 0; i < index; i++) await page.keyboard.press("ArrowDown");
  await expect(office(page)).toHaveAttribute("data-dig", String(index));
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-sleeve", "out", { timeout: WAIT });
  const sleeve = page.getByRole("region", { name: item.name, exact: true });
  await expect(sleeve).toBeVisible({ timeout: WAIT });
  await sleeve.getByRole("button", { name: "Read more" }).click();
  const dialog = page.getByRole("dialog", { name: item.name, exact: true });
  await expect(dialog).toBeVisible();
  return { item, dialog };
}

async function seeOnMonitor(page: Page, slug: string, touch = false) {
  const { item, dialog } = await readProduct(page, slug);
  const slide = slides.findIndex(shot => shot.slug === slug);
  const action = dialog.getByRole("button", { name: "See on the monitor" });
  await expect.poll(() => dialog.evaluate(el => Number(getComputedStyle(el).opacity)), { timeout: WAIT }).toBe(1);
  await page.screenshot({ path: `.superpowers/sdd/2026-10-12-product-monitor/${slug}-reading.png` });
  if (touch) await action.tap({ timeout: WAIT });
  else await action.click({ timeout: WAIT });
  await expect(dialog).toBeHidden();
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: WAIT });
  await expect(page.locator(".reel-words")).toHaveAttribute("data-slide", String(slide), { timeout: WAIT });
  await expect(page.locator(".office-reel .reel-shot:not(.reel-moving) img")).toHaveAttribute("src", slides[slide].shot.src);
  await expect(page.getByRole("heading", { name: "Some things I've built" })).toBeFocused({ timeout: WAIT });
  await expect(office(page)).toHaveAttribute("data-notes", "down", { timeout: WAIT });
  await expect.poll(() => page.locator(".reel-words").evaluate(el => Number(getComputedStyle(el.closest(".office-card-face")!).opacity)), { timeout: WAIT }).toBe(1);
  await page.screenshot({ path: `.superpowers/sdd/2026-10-12-product-monitor/${slug}-monitor.png` });
  // The prior reading entry stays in history; both Back and Escape can return to it.
  await page.goBack();
  await expect(dialog).toBeVisible({ timeout: WAIT });
  await expect(page).toHaveURL(new RegExp(`/work/${item.slug}$`));
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_crate", { timeout: WAIT });
  await expect(office(page)).toHaveAttribute("data-sleeve", "out", { timeout: WAIT });
  await expect(dialog).toBeFocused({ timeout: WAIT });
}

test("a product description opens its matching monitor screenshot and Back returns to the reading panel", async ({ page }) => {
  await seeOnMonitor(page, "silio");
});

test.describe("phone with reduced motion", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
  test("a product with several screenshots starts on its first one and returns to its description", async ({ page }) => {
    await seeOnMonitor(page, "manuva", true);
  });
});
