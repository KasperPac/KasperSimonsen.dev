import { test, expect, type Page } from "@playwright/test";
import { engagementModels, services } from "../content/services";
import { subjectForTopic } from "../content/contact";
import { COPY } from "../office/copy";

/** See office-crate.spec.ts: software WebGL can stall for seconds at a time late in a run. */
const MOVE_WAIT = 30_000;

const office = (page: Page) => page.locator(".office");
const link = (page: Page, i: number) => page.getByRole("link", { name: services[i].name });
const plaque = (page: Page, i: number) => page.getByRole("region", { name: services[i].name });

async function standInOffice(page: Page) {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
}

async function openShelf(page: Page) {
  const button = page.getByRole("button", { name: COPY.labels.hs_shelf });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_shelf", { timeout: MOVE_WAIT });
  await expect(link(page, 0)).toBeFocused();
  return button;
}

test("the keyboard picks a service, reads it, writes from it, and steps back out one layer at a time", async ({ page }) => {
  await standInOffice(page);
  const button = await openShelf(page);
  await expect(page).toHaveURL(/\/$/); // browsing the shelf is local
  await page.keyboard.press("Tab");
  await expect(link(page, 1)).toBeFocused();
  await page.keyboard.press("Enter");

  const s = services[1];
  await expect(page).toHaveURL(new RegExp(`/services/${s.slug}$`));
  await expect(office(page)).toHaveAttribute("data-presented", s.slug);
  await expect(office(page)).toHaveAttribute("data-shelf", "out", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_shelf"); // the ornament came to the camera, not the camera to it
  await expect(plaque(page, 1).getByRole("heading", { name: s.name })).toBeFocused();

  const more = plaque(page, 1).getByRole("button", { name: COPY.plaque.readMore });
  await more.click();
  const dialog = page.getByRole("dialog", { name: s.name });
  await expect(dialog.getByRole("heading", { name: COPY.service.ways })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/services/${s.slug}$`)); // Read more never changes the URL

  const cta = dialog.getByRole("button", { name: engagementModels[0].ctaLabel });
  await cta.click();
  const form = page.getByRole("dialog", { name: COPY.contact.title });
  await expect(form.getByLabel(COPY.contact.subject)).toHaveValue(subjectForTopic(engagementModels[0].topic));
  await expect(page.locator(".panel-scrim", { has: page.locator("#service-title") })).toHaveAttribute("inert", ""); // the service under it is out of reach
  await expect(page).toHaveURL(new RegExp(`/services/${s.slug}$`));

  await page.keyboard.press("Escape");
  await expect(form).toBeHidden();
  await expect(dialog).toBeVisible(); // the service is still open under it
  await expect(cta).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(more).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-shelf", "in", { timeout: MOVE_WAIT });
  await expect(link(page, 1)).toBeFocused(); // back on the one that was out
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await expect(button).toBeFocused();
});

test("picking another ornament swaps it without a new history entry", async ({ page }) => {
  await standInOffice(page);
  await openShelf(page);
  await page.keyboard.press("Enter");
  await expect(plaque(page, 0)).toBeVisible({ timeout: MOVE_WAIT });
  await link(page, 2).focus();
  await page.keyboard.press("Enter");
  await expect(link(page, 2)).toBeFocused(); // while the first goes home and the next comes out, not lost to <body>
  await expect(page).toHaveURL(new RegExp(`/services/${services[2].slug}$`));
  await expect(plaque(page, 2)).toBeVisible({ timeout: MOVE_WAIT });
  await expect(plaque(page, 0)).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_shelf"); // one Back: the shelf, not the first ornament
});

test("Forward onto a service from the standing spot brings its ornament out again", async ({ page }) => {
  await standInOffice(page);
  await openShelf(page);
  await link(page, 3).focus();
  await page.keyboard.press("Enter");
  await expect(plaque(page, 3)).toBeVisible({ timeout: MOVE_WAIT });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
  await page.goForward();
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/services/${services[3].slug}$`));
  await expect(plaque(page, 3)).toBeVisible({ timeout: MOVE_WAIT });
});

test("a refreshed or shared service link is the standalone page", async ({ page }) => {
  await standInOffice(page);
  await openShelf(page);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/services/${services[0].slug}$`));
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: services[0].name })).toBeVisible();
  await expect(page.locator(".office")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: COPY.service.ways })).toBeVisible();
  for (const m of engagementModels) await expect(page.getByRole("link", { name: m.ctaLabel })).toHaveAttribute("href", `/contact?topic=${m.topic}`);
  await expect(page.getByRole("link", { name: COPY.enter })).toHaveAttribute("href", "/");
});

test("an unknown service is a 404", async ({ page }) => {
  const response = await page.goto("/services/tools-and-dashboards");
  expect(response?.status()).toBe(404);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the camera cuts to the shelf and the ornament is out at once", async ({ page }) => {
    await standInOffice(page);
    await page.evaluate(() => {
      const el = document.querySelector(".office")!;
      const seen: string[] = ((window as unknown as { __cams: string[] }).__cams = []);
      new MutationObserver(() => seen.push(el.getAttribute("data-camera") ?? "")).observe(el, { attributeFilter: ["data-camera"] });
    });
    await openShelf(page);
    await page.keyboard.press("Enter");
    await expect(office(page)).toHaveAttribute("data-shelf", "out", { timeout: 5_000 });
    expect(await page.evaluate(() => (window as unknown as { __cams: string[] }).__cams)).not.toContain("moving");
  });
  test("swapping ornaments shows the new plaque", async ({ page }) => {
    await standInOffice(page);
    await openShelf(page);
    await page.keyboard.press("Enter");
    await expect(plaque(page, 0)).toBeVisible({ timeout: MOVE_WAIT });
    await link(page, 2).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/services/${services[2].slug}$`));
    await expect(plaque(page, 2)).toBeVisible({ timeout: MOVE_WAIT });
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the plaque docks at the bottom of the screen", async ({ page }) => {
    await standInOffice(page);
    await openShelf(page);
    await page.keyboard.press("Enter");
    await expect(plaque(page, 0)).toBeVisible({ timeout: MOVE_WAIT });
    const box = (await plaque(page, 0).boundingBox())!;
    expect(box.x).toBeCloseTo(16, 0);
    expect(box.x + box.width).toBeCloseTo(390 - 16, 0);
    expect(box.y + box.height).toBeCloseTo(844 - 16, 0);
  });
});
