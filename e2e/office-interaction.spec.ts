import { test, expect, type Page } from "@playwright/test";

const office = (page: Page) => page.locator(".office");
const progress = async (page: Page) => Number(await office(page).getAttribute("data-walkin-progress"));

async function standInOffice(page: Page) {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 15_000 });
}

async function openDrawer(page: Page) {
  const link = page.getByRole("link", { name: "Get in touch" });
  await link.focus();
  await page.keyboard.press("Enter");
  return link;
}

test("tabbing to an object labels and lights it", async ({ page }) => {
  await standInOffice(page);
  await page.getByRole("link", { name: "Get in touch" }).focus();
  await expect(office(page)).toHaveAttribute("data-hover", "hs_drawer");
  await page.getByRole("button", { name: "The work" }).focus();
  await expect(office(page)).toHaveAttribute("data-hover", "hs_crate");
});

test("the drawer opens with the business card, Write to me opens the form, Esc peels one layer at a time", async ({ page }) => {
  await standInOffice(page);
  const link = await openDrawer(page);
  await expect(page).toHaveURL(/\/contact$/);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: 10_000 });
  await expect(office(page)).toHaveAttribute("data-drawer", "open", { timeout: 10_000 });
  const card = page.getByRole("region", { name: "Kasper Simonsen" });
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "hello@kaspersimonsen.dev" })).toHaveAttribute("href", "mailto:hello@kaspersimonsen.dev");

  const write = card.getByRole("button", { name: "Write to me" });
  await write.click();
  const dialog = page.getByRole("dialog", { name: "Get in touch" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/contact$/);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(write).toBeFocused();
  await expect(page).toHaveURL(/\/contact$/);

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });
  await expect(office(page)).toHaveAttribute("data-drawer", "shut", { timeout: 10_000 });
  await expect(link).toBeAttached();
  expect(await progress(page)).toBeGreaterThan(0.99);
});

test("browser Back peels the same layers", async ({ page }) => {
  await standInOffice(page);
  await openDrawer(page);
  await page.getByRole("button", { name: "Write to me" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("region", { name: "Kasper Simonsen" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });
});

test("a double activation adds one history entry, so one Back closes it", async ({ page }) => {
  await standInOffice(page);
  await page.getByRole("button", { name: "Monitor" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", /focus(ing|ed):hs_monitor/, { timeout: 10_000 });
  await page.goBack();
  await expect(office(page)).toHaveAttribute("data-director", /returning|idle/, { timeout: 10_000 });
  expect(new URL(page.url()).pathname).toBe("/");
});

test("the crate, shelf and monitor focus locally with no URL change", async ({ page }) => {
  await standInOffice(page);
  for (const [name, hotspot] of [["The work", "hs_crate"], ["What I do", "hs_shelf"], ["Monitor", "hs_monitor"]] as const) {
    await page.getByRole("button", { name }).focus();
    await page.keyboard.press("Enter");
    await expect(office(page)).toHaveAttribute("data-director", `focused:${hotspot}`, { timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe("/");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: 10_000 });
  }
});

test("a reload doesn't reopen a local layer", async ({ page }) => {
  await standInOffice(page);
  await page.getByRole("button", { name: "Monitor" }).focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: 10_000 });
  await page.reload();
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await expect(office(page)).toHaveAttribute("data-director", /walkIn|idle/);
});

test("Esc with focus outside the panel still backs out exactly one layer", async ({ page }) => {
  await standInOffice(page);
  await openDrawer(page);
  await page.getByRole("button", { name: "Write to me" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(/\/contact$/);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/);
});

test("focus stays inside the panel", async ({ page }) => {
  await standInOffice(page);
  await openDrawer(page);
  await page.getByRole("button", { name: "Write to me" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 15; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
});

test("the walk-in can't be scrolled while an object is open", async ({ page }) => {
  await standInOffice(page);
  await openDrawer(page);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: 10_000 });
  await page.mouse.wheel(0, -5000);
  await page.waitForTimeout(2000);
  expect(await progress(page)).toBeGreaterThan(0.99);
});

test("refreshing /contact gives the standalone page", async ({ page }) => {
  const res = await page.goto("/contact");
  expect(res?.status()).toBe(200);
  await expect(office(page)).toHaveCount(0);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("opens the drawer without moving the camera", async ({ page }) => {
    await standInOffice(page);
    await openDrawer(page);
    await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: 10_000 });
    await expect(office(page)).toHaveAttribute("data-camera", "base");
    await expect(office(page)).toHaveAttribute("data-drawer", "open");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("docks the card at the bottom of the screen", async ({ page }) => {
    await standInOffice(page);
    await openDrawer(page);
    const card = page.getByRole("region", { name: "Kasper Simonsen" });
    await expect(card).toBeVisible({ timeout: 10_000 });
    const box = await card.boundingBox();
    expect(box && box.y + box.height).toBeGreaterThan(844 - 40);
    expect(box && box.x).toBeGreaterThanOrEqual(15);
  });
});
