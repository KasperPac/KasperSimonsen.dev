import { expect, test } from "@playwright/test";
import { services } from "../content/services";
import { work } from "../content/work";
import { STEPS } from "../office/neon/mark";

test("the homepage offers immediate contact without requesting a model", async ({ page }) => {
  const models: string[] = [];
  await page.route("**/models/**", (route) => {
    models.push(route.request().url());
    return route.abort();
  });
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Enter Office", exact: true })).toHaveAttribute("href", "/office#enter");
  const contact = page.getByRole("link", { name: "Contact Me", exact: true });
  await expect(contact).toBeInViewport();
  expect((await contact.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await contact.click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { name: "Get in touch" })).toBeVisible();
  expect(models).toEqual([]);
  await expect(page.locator("canvas")).toHaveCount(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("only the KS logo's rope moves, can pause, and respects reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const poses = page.locator(".site-mark-rope");
    const letters = page.locator(".site-mark-letters");
    await expect(poses).toHaveCount(STEPS);
    await expect(letters).toBeVisible();
    const letterBounds = await letters.boundingBox();
    const seen = new Set<number>();
    await expect.poll(async () => {
      const visible = await poses.evaluateAll((elements) =>
        elements.flatMap((element, i) => getComputedStyle(element).opacity === "1" ? [i] : []),
      );
      expect(visible).toHaveLength(1);
      seen.add(visible[0]);
      return seen.size;
    }, { intervals: [100], timeout: 6000 }).toBe(STEPS);
    expect(await letters.boundingBox()).toEqual(letterBounds);
    expect(await letters.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);

    const pause = page.getByRole("checkbox", { name: "Pause animation" });
    await pause.check();
    await expect(poses.first()).toHaveCSS("animation-play-state", "paused");
    await pause.uncheck();
    await expect(poses.first()).toHaveCSS("animation-play-state", "running");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(pause).toBeHidden();
    await expect(poses.first()).toHaveCSS("animation-name", "none");
    expect(await poses.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).opacity)))
      .toEqual(["1", ...Array(STEPS - 1).fill("0")]);
  });

  test("the static site offers case studies, services, and contact", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Browse the static site" }).click();
    await expect(page).toHaveURL(/\/portfolio$/);
    for (const item of work) {
      await expect(page.getByRole("link", { name: item.name, exact: true })).toHaveAttribute("href", `/portfolio/${item.slug}`);
    }
    for (const service of services) {
      await expect(page.getByRole("link", { name: service.name, exact: true })).toHaveAttribute("href", `/services/${service.slug}`);
    }
    await page.getByRole("link", { name: work[0].name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: work[0].name })).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.getByRole("link", { name: "Static portfolio", exact: true }).click();
    await page.getByRole("link", { name: services[0].name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: services[0].name })).toBeVisible();
    await page.getByRole("link", { name: "Contact Me", exact: true }).click();
    await expect(page.getByRole("link", { name: "hello@kaspersimonsen.dev" })).toBeVisible();
  });
});
