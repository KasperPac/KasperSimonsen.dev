import { test, expect } from "@playwright/test";

test("agency is readable, routes visitors to services, and keeps industrial work separate", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const modelRequests: string[] = [];
  page.on("request", request => { if (/\.(glb|gltf)(?:\?|$)/.test(request.url())) modelRequests.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/agency");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Built aroundyour business.");
  await expect(page.getByRole("button", { name: "Send enquiry", exact: true })).toBeEnabled();
  await expect(page.locator("#services article")).toHaveCount(4);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator('#services')).not.toContainText("Industrial automation");
  await expect(page.getByRole("link", { name: "Industrial automation" })).toHaveAttribute("href", "/services/industrial-automation");
  await page.locator("#services summary").first().click();
  await expect(page.locator("#services details").first()).toHaveAttribute("open", "");
  await expect(page.locator("#services details").first()).toContainText("Booking tools");
  await page.locator("#services summary").first().click();
  const missingAnchors = await page.locator('a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute("href")!.slice(1)).filter(id => !document.getElementById(id)));
  expect(missingAnchors).toEqual([]);
  expect(await page.locator("img").evaluateAll(images => images.every(img => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0))).toBe(true);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({ top: 0, behavior: "instant" }); });
  await page.screenshot({ path: "test-results/agency-desktop-top.png" });
  await page.screenshot({ path: "test-results/agency-desktop.png", fullPage: true });
  expect(modelRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("enquiry validates, retains input on failure, and reports confirmed success", async ({ page }) => {
  await page.goto("/agency#contact");
  const submit = page.getByRole("button", { name: "Send enquiry", exact: true });
  await submit.click();
  expect(await page.locator('input[name="name"]').evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  await page.getByLabel("Your name", { exact: true }).fill("Agency preview test");
  await page.getByLabel("Email address", { exact: true }).fill("preview@example.com");
  await page.getByLabel("Business name").fill("Test business");
  await page.getByLabel("What would you like help with?").selectOption("AI agents & automation");
  await page.getByLabel("A little about what you need").fill("An agent to help prepare customer enquiries for review.");
  let payload: Record<string, string> | undefined;
  let succeed = false;
  await page.route("**/api/contact", async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: succeed ? 200 : 500, contentType: "application/json", body: JSON.stringify(succeed ? { ok: true } : { error: "Test failure" }) });
  });
  await submit.click();
  await expect(page.locator(".enquiry-form").getByRole("alert")).toContainText("couldn’t be sent");
  await expect(page.getByLabel("A little about what you need")).toHaveValue("An agent to help prepare customer enquiries for review.");
  succeed = true;
  await submit.click();
  await expect(page.getByRole("status")).toContainText("Your enquiry has been sent");
  expect(payload).toEqual({ name: "Agency preview test", email: "preview@example.com", subject: "KS enquiry: AI agents & automation", message: "Business: Test business\n\nAn agent to help prepare customer enquiries for review." });
});

test("phone navigation and content fit narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/agency");
  await page.getByText("Menu", { exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Who we help" }).click();
  await expect(page).toHaveURL(/#who-we-help$/);
  await page.getByText("Menu", { exact: true }).click();
  await page.goto("/agency");
  await expect(page.getByRole("button", { name: "Send enquiry", exact: true })).toBeEnabled();
  await page.screenshot({ path: "test-results/agency-phone-top.png" });
  await page.screenshot({ path: "test-results/agency-phone.png", fullPage: true });
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `layout at ${width}px`).toBe(true);
  }
});

test("services, business types and direct contact work without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("http://localhost:3010/agency");
  await expect(page.getByRole("heading", { name: "Digital support", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local & service businesses" })).toBeVisible();
  await expect(page.locator(".enquiry-form input").first()).toBeDisabled();
  await expect(page.getByRole("link", { name: "Contact Kasper directly" })).toHaveAttribute("href", "mailto:hello@kaspersimonsen.dev");
  await expect(page.locator('.contact-copy a[href^="mailto:"]')).toHaveAttribute("href", "mailto:hello@kaspersimonsen.dev");
  await page.locator("#services summary").first().click();
  await expect(page.locator("#services details").first()).toHaveAttribute("open", "");
  await context.close();
});
