import { expect, test } from "@playwright/test";

test("contact is one click away while the models are still loading", async ({ page }) => {
  // Leave the models pending: visitors who want to enquire must not need to wait for them.
  await page.route("**/models/**", () => {});
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const contact = page.getByRole("link", { name: "Contact", exact: true });
  await expect(contact).toBeVisible();
  const bounds = await contact.boundingBox();
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await contact.click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { name: "Get in touch" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Name", exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "hello@kaspersimonsen.dev", exact: true })).toBeVisible();
});

test("contact handles a failed enquiry and a successful retry", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/contact", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      name: "Contact test",
      email: "contact-test@example.com",
      subject: "Tools & dashboards enquiry",
      message: "Checking the enquiry form without sending an email.",
    });
    attempts += 1;
    await route.fulfill({ status: attempts === 1 ? 500 : 200, json: attempts === 1 ? { error: "Test failure" } : { ok: true } });
  });
  await page.goto("/contact?topic=tools");
  expect(await page.locator("html").evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Contact test");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("contact-test@example.com");
  await expect(page.getByRole("textbox", { name: "What's it about" })).toHaveValue("Tools & dashboards enquiry");
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("Checking the enquiry form without sending an email.");
  await page.getByRole("button", { name: "Send it", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Email me instead");
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveValue("Checking the enquiry form without sending an email.");
  await page.getByRole("button", { name: "Send it", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Sent. Talk soon.");
  expect(attempts).toBe(2);
});

test("direct contact details are readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:3010/contact?topic=platforms");
  await expect(page.getByRole("heading", { name: "Get in touch" })).toBeVisible();
  await expect(page.getByRole("link", { name: "hello@kaspersimonsen.dev", exact: true })).toHaveAttribute("href", "mailto:hello@kaspersimonsen.dev");
  await expect(page.getByRole("textbox", { name: "What's it about" })).toHaveValue("Platforms & systems enquiry");
  await expect(page.locator("canvas")).toHaveCount(0);
  await context.close();
});
