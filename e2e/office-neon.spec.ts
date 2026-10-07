import { test, expect, type Page } from "@playwright/test";

/** Software WebGL can freeze rendering for ~10 s at a time; see MOVE_WAIT in office-interaction.spec.ts. */
const MOVE_WAIT = 30_000;

const office = (page: Page) => page.locator(".office");
const progress = async (page: Page) => Number(await office(page).getAttribute("data-walkin-progress"));

/** Records every value `.office[data-neon]` takes from now on (as office-monitor.spec.ts records data-notes). */
async function recordNeon(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector(".office")!;
    const seen: string[] = [];
    (window as unknown as { neonSeen: string[] }).neonSeen = seen;
    new MutationObserver((records) => records.forEach((r, k) => seen.push(records[k + 1]?.oldValue ?? el.getAttribute("data-neon")!)))
      .observe(el, { attributeFilter: ["data-neon"], attributeOldValue: true });
  });
  return () => page.evaluate(() => [...(window as unknown as { neonSeen: string[] }).neonSeen]);
}

async function arrive(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(office(page)).toHaveAttribute("data-director", "idle", { timeout: MOVE_WAIT });
}

test("the sign is off in the walk-in, powers up on arrival, goes off on leaving and comes back on", async ({ page }) => {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await expect(office(page)).toHaveAttribute("data-neon", "off");
  const seen = await recordNeon(page);
  await arrive(page);
  await expect(office(page)).toHaveAttribute("data-neon", "on", { timeout: MOVE_WAIT });
  expect(await seen()).toEqual(["powering", "on"]);

  await page.mouse.wheel(0, -5000);
  await expect.poll(() => progress(page), { timeout: MOVE_WAIT }).toBeLessThan(0.97);
  await expect(office(page)).toHaveAttribute("data-neon", "off", { timeout: MOVE_WAIT });

  await arrive(page);
  await expect(office(page)).toHaveAttribute("data-neon", "on", { timeout: MOVE_WAIT });
  // coming back powers it up again, not straight to on
  expect(await seen()).toEqual(["powering", "on", "off", "powering", "on"]);
});

test("opening an object leaves the sign on", async ({ page }) => {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await arrive(page);
  await expect(office(page)).toHaveAttribute("data-neon", "on", { timeout: MOVE_WAIT });
  const seen = await recordNeon(page);
  const link = page.getByRole("link", { name: "Get in touch" });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", "focused:hs_drawer", { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-neon", "on");
  expect(await seen()).toEqual([]); // it never left on
});

test("a direct visit that opens an object powers the sign up too", async ({ page }) => {
  await page.goto("/");
  await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  const link = page.getByRole("link", { name: "Get in touch" });
  await link.focus();
  // still out in the walk-in, with the sign off
  await expect(office(page)).toHaveAttribute("data-neon", "off");
  expect(await progress(page)).toBeLessThan(0.97);
  const seen = await recordNeon(page);
  await page.keyboard.press("Enter");
  await expect(office(page)).toHaveAttribute("data-director", /focus(ing|ed):hs_drawer/, { timeout: MOVE_WAIT });
  await expect(office(page)).toHaveAttribute("data-neon", "on", { timeout: MOVE_WAIT });
  const values = await seen();
  expect(values[0]).toBe("powering");
  expect(values).not.toContain("off");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("goes straight to on, with no power-up", async ({ page }) => {
    await page.goto("/");
    await expect(office(page)).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
    const seen = await recordNeon(page);
    await arrive(page);
    await expect(office(page)).toHaveAttribute("data-neon", "on", { timeout: MOVE_WAIT });
    expect(await seen()).toEqual(["on"]);
  });
});
