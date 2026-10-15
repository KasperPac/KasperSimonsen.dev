import { test, expect, type Page } from "@playwright/test";
import { work } from "../content/work";
import { services } from "../content/services";

const office = (page: Page) => page.locator(".office");
const menu = (page: Page) => page.getByRole("dialog", { name: "Go straight to" });
const WAIT = 30_000;

async function ready(page: Page) {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 90_000 });
}

async function openCrate(page: Page) {
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await menu(page).getByRole("link", { name: "The work", exact: true }).click();
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_crate", { timeout: WAIT });
}

test.use({ reducedMotion: "reduce", viewport: { width: 1100, height: 740 } });

test("menu is available on arrival, traps focus and opens project, service and contact details directly", async ({ page }) => {
  await ready(page);
  await expect(office(page)).toHaveAttribute("data-director", "walkIn");
  const toggle = page.getByRole("button", { name: "Menu", exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(menu(page)).toBeVisible();
  for (const item of [...work, ...services]) await expect(menu(page).getByRole("link", { name: item.name, exact: true })).toBeVisible();
  await menu(page).getByRole("button", { name: "Close" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(menu(page).getByRole("link", { name: "Look around the office" })).toBeFocused();
  await menu(page).evaluate((el) => { el.scrollTop = 0; });
  await page.screenshot({ path: "test-results/navigation-desktop-menu.png" });
  await page.keyboard.press("Escape");
  await expect(menu(page)).not.toBeVisible();
  await expect(toggle).toBeFocused();
  await expect(office(page)).toHaveAttribute("data-director", "walkIn");

  await toggle.click();
  await menu(page).getByRole("link", { name: work[0].name, exact: true }).click();
  await expect(page.getByRole("dialog", { name: work[0].name, exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/work/${work[0].slug}$`));
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: WAIT });

  await toggle.click();
  await menu(page).getByRole("link", { name: services[0].name, exact: true }).click();
  await expect(page.getByRole("dialog", { name: services[0].name, exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: WAIT });

  await toggle.click();
  await menu(page).getByRole("link", { name: "Get in touch" }).click();
  const form = page.getByRole("dialog", { name: "Get in touch" });
  await expect(form.getByRole("textbox", { name: "Name", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/contact$/);
  const retainedBrowserZoom = await form.evaluate((el) => {
    const event = new WheelEvent("wheel", { deltaY: 60, ctrlKey: true, bubbles: true, cancelable: true });
    return el.dispatchEvent(event);
  });
  expect(retainedBrowserZoom).toBe(true);
  await expect(form).toBeVisible();
});

test("scrolling out and a trackpad pinch each step back once, while forward scrolling stays put", async ({ page }) => {
  await ready(page);
  await openCrate(page);
  await page.mouse.move(550, 350);
  await page.mouse.wheel(0, 160);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_crate");
  await page.mouse.wheel(0, -160);
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: WAIT });
  await openCrate(page);
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-playing", work[0].slug, { timeout: WAIT });
  await page.waitForTimeout(350); // distinct wheel gesture, after the previous scroll burst
  await page.locator("canvas").dispatchEvent("wheel", { deltaY: 60, ctrlKey: true, bubbles: true, cancelable: true });
  await expect(office(page)).toHaveAttribute("data-playing", "", { timeout: WAIT });
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_crate", { timeout: WAIT });
  // Momentum in the same burst must not also exit the crate.
  await page.locator("canvas").dispatchEvent("wheel", { deltaY: 60, ctrlKey: true, bubbles: true, cancelable: true });
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_crate");
});

test.describe("touch navigation", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  async function gesture(page: Page, from: { x: number; y: number }[], to: { x: number; y: number }[]) {
    const cdp = await page.context().newCDPSession(page);
    const timestamp = Date.now() / 1000;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", timestamp, touchPoints: from.map((p, id) => ({ ...p, id })) });
    for (let step = 1; step <= 5; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", timestamp: timestamp + step * 0.03, touchPoints: from.map((p, id) => ({ id, x: p.x + (to[id].x - p.x) * step / 5, y: p.y + (to[id].y - p.y) * step / 5 })) });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", timestamp: timestamp + 0.18, touchPoints: [] });
    await cdp.detach();
  }

  test("down flicks next, up flicks previous, right swipes back and pinch closes one layer", async ({ page }) => {
    await ready(page);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.screenshot({ path: "test-results/navigation-phone-menu.png" });
    await menu(page).getByRole("link", { name: "The work", exact: true }).click();
    await expect(office(page)).toHaveAttribute("data-director", "focused:hs_crate", { timeout: WAIT });
    await gesture(page, [{ x: 195, y: 400 }], [{ x: 195, y: 520 }]);
    await expect(office(page)).toHaveAttribute("data-dig", "1");
    await expect(office(page)).toHaveAttribute("data-playing", "");
    await gesture(page, [{ x: 195, y: 520 }], [{ x: 195, y: 400 }]);
    await expect(office(page)).toHaveAttribute("data-dig", "0");
    await gesture(page, [{ x: 75, y: 400 }], [{ x: 210, y: 410 }]);
    await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: WAIT });

    await openCrate(page);
    await page.keyboard.press("Enter");
    await expect(office(page)).toHaveAttribute("data-playing", work[0].slug, { timeout: WAIT });
    await gesture(page, [{ x: 80, y: 350 }, { x: 310, y: 350 }], [{ x: 145, y: 350 }, { x: 245, y: 350 }]);
    await expect(office(page)).toHaveAttribute("data-playing", "", { timeout: WAIT });
    await expect(office(page)).toHaveAttribute("data-director", "focused:hs_crate", { timeout: WAIT });
    await page.screenshot({ path: "test-results/navigation-phone-back.png" });
  });
});
