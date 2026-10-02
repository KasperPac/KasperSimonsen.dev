import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * How long to wait for the camera, the director or an object to arrive. On a GPU these take about a second; under
 * software WebGL a long run of heavy pages in one headless browser can freeze rendering for ~10 s at a time (one
 * frame measured 9.87 s), so give it room. The assertions are unchanged.
 */
const MOVE_WAIT = 30_000;

const office = (page: Page) => page.locator(".office");
const progress = async (page: Page) => Number(await office(page).getAttribute("data-walkin-progress"));

async function standInOffice(page: Page) {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
}

/** The details are printed on the card in the drawer, and the camera has come in until it fills `share` of the width. */
async function expectCardInFrame(page: Page, card: Locator, share: number) {
  const { width, height } = page.viewportSize()!;
  await expect(office(page)).toHaveAttribute("data-camera", "focus", { timeout: MOVE_WAIT });
  await expect(card).toBeVisible();
  const box = (await card.boundingBox())!;
  expect(box.width).toBeGreaterThan(width * share);
  expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(width * 0.15);
  expect(Math.abs(box.y + box.height / 2 - height / 2)).toBeLessThan(height * 0.2);
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
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-drawer", "open", { timeout: MOVE_WAIT });
  const card = page.getByRole("region", { name: "Kasper Simonsen" });
  await expect(card).toBeVisible();
  await expectCardInFrame(page, card, 0.24);
  await expect(card.getByRole("heading", { name: "Kasper Simonsen" })).toBeFocused();
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
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-drawer", "shut", { timeout: MOVE_WAIT });
  await expect(link).toBeFocused();
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
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
});

test("a double activation adds one history entry, so one Back closes it", async ({ page }) => {
  await standInOffice(page);
  await page.getByRole("button", { name: "Monitor" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", /focus(ing|ed):hs_monitor/, { timeout: MOVE_WAIT });
  await page.goBack();
  await expect(office(page)).toHaveAttribute("data-director", /returning|idle/, { timeout: MOVE_WAIT });
  expect(new URL(page.url()).pathname).toBe("/");
});

test("the crate, shelf and monitor focus locally with no URL change", async ({ page }) => {
  await standInOffice(page);
  for (const [name, hotspot] of [["The work", "hs_crate"], ["What I do", "hs_shelf"], ["Monitor", "hs_monitor"]] as const) {
    await page.getByRole("button", { name }).focus();
    await page.keyboard.press("Enter");
    await expect(office(page)).toHaveAttribute("data-director", `focused:${hotspot}`, { timeout: MOVE_WAIT });
    expect(new URL(page.url()).pathname).toBe("/");
    // the crate's own control takes focus (arrow keys flick, Enter pulls); the shelf and monitor give it to Back
    const into = hotspot === "hs_crate" ? page.locator('[aria-roledescription="record crate"]') : page.getByRole("button", { name: "Back" });
    await expect(into).toBeFocused();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  }
});

test("a reload doesn't reopen a local layer", async ({ page }) => {
  await standInOffice(page);
  await page.getByRole("button", { name: "Monitor" }).focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_monitor", { timeout: MOVE_WAIT });
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
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: MOVE_WAIT });
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
  test("cuts to the open drawer instead of gliding", async ({ page }) => {
    await standInOffice(page);
    await openDrawer(page);
    await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: MOVE_WAIT });
    await expect(office(page)).toHaveAttribute("data-camera", "focus");
    await expect(office(page)).toHaveAttribute("data-drawer", "open");
    await expectCardInFrame(page, page.getByRole("region", { name: "Kasper Simonsen" }), 0.24);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("comes in until the card fills most of the width", async ({ page }) => {
    await standInOffice(page);
    await openDrawer(page);
    const card = page.getByRole("region", { name: "Kasper Simonsen" });
    await expect(card).toBeVisible({ timeout: MOVE_WAIT }); // the drawer's move is the slow one
    await expectCardInFrame(page, card, 0.65);
  });
});
