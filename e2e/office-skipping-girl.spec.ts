import { test, expect } from "@playwright/test";

test.use({ reducedMotion: "no-preference", viewport: { width: 1100, height: 740 } });

test("the Skipping Girl keeps skipping while the visitor is not scrolling", async ({ page }) => {
  await page.goto("/");
  const office = page.locator(".office");
  await expect(office).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await expect(office).toHaveAttribute("data-walkin-progress", "0.0000");
  const poses = new Set<string>();
  await expect.poll(async () => {
    const pose = await office.getAttribute("data-skipping-girl-pose");
    if (pose !== null) poses.add(pose);
    return poses.size;
  }, { timeout: 20_000, intervals: [150] }).toBeGreaterThanOrEqual(3);
  await expect(office).toHaveAttribute("data-walkin-progress", "0.0000");
  await page.screenshot({ path: "test-results/skipping-girl-street.png" });
});
