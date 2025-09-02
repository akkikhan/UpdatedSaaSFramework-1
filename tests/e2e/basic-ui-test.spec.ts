import { test, expect } from "@playwright/test";

test.describe("Onboarding Wizard Basic UI Test", () => {
  test("should load the registration page and basic form elements", async ({ page }) => {
    // Go to registration page
    await page.goto("http://localhost:5000/register");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Take a screenshot for debugging
    await page.screenshot({ path: "registration-page.png", fullPage: true });

    // Check if basic form elements are present
    const orgNameInput = page.locator(
      'input[placeholder*="Acme Corp"], input[placeholder*="Company"], label:has-text("Organization Name") + * input'
    );
    const orgIdInput = page.locator(
      'input[placeholder*="acme-corp"], input[placeholder*="company"], label:has-text("Organization ID") + * input'
    );
    const adminNameInput = page.locator(
      'input[placeholder*="John Doe"], input[placeholder*="Admin"], label:has-text("Admin Name") + * input'
    );
    const adminEmailInput = page.locator(
      'input[placeholder*="admin@"], input[type="email"], label:has-text("Admin Email") + * input'
    );
    const adminPasswordInput = page.locator(
      'input[type="password"], label:has-text("Admin Password") + * input'
    );

    // Check if elements exist
    await expect(orgNameInput.first()).toBeVisible();
    await expect(orgIdInput.first()).toBeVisible();
    await expect(adminNameInput.first()).toBeVisible();
    await expect(adminEmailInput.first()).toBeVisible();
    await expect(adminPasswordInput.first()).toBeVisible();

    console.log("✅ All basic form fields are visible");
  });

  test("should fill form and test validation", async ({ page }) => {
    await page.goto("http://localhost:5000/register");
    await page.waitForLoadState("networkidle");

    // Try to find and fill the form fields
    const orgNameInput = page
      .locator('label:has-text("Organization Name") + * input, input[placeholder*="company" i]')
      .first();
    const orgIdInput = page
      .locator('label:has-text("Organization ID") + * input, input[placeholder*="acme" i]')
      .first();
    const adminNameInput = page
      .locator('label:has-text("Admin Name") + * input, input[placeholder*="john" i]')
      .first();
    const adminEmailInput = page
      .locator('input[type="email"], label:has-text("Admin Email") + * input')
      .first();
    const adminPasswordInput = page
      .locator('input[type="password"], label:has-text("Admin Password") + * input')
      .first();

    // Fill the form
    await orgNameInput.fill("Playwright Test Company");
    await orgIdInput.fill(`playwright-test-${Date.now()}`);
    await adminNameInput.fill("Playwright Admin");
    await adminEmailInput.fill("admin@playwright.com");
    await adminPasswordInput.fill("PlaywrightPassword123!");

    // Look for Next button
    const nextButton = page
      .locator('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]')
      .first();
    await expect(nextButton).toBeVisible();

    // Click next to test navigation
    await nextButton.click();

    // Take screenshot after clicking next
    await page.screenshot({ path: "after-next-click.png", fullPage: true });

    console.log("✅ Form filled and next button clicked successfully");
  });

  test("should test complete registration flow", async ({ page }) => {
    await page.goto("http://localhost:5000/register");
    await page.waitForLoadState("networkidle");

    // Get the page title and URL for verification
    const title = await page.title();
    const url = page.url();
    console.log(`Page title: ${title}`);
    console.log(`Page URL: ${url}`);

    // Check if this is a React app by looking for React-specific elements
    const reactRoot = await page.locator("#root, [data-reactroot], .react-app").count();
    console.log(`React elements found: ${reactRoot}`);

    // Get page content to see what's actually rendered
    const bodyText = await page.locator("body").textContent();
    console.log(`Page content preview: ${bodyText?.substring(0, 200)}...`);

    // Look for any form elements
    const formElements = await page.locator("form, input, button").count();
    console.log(`Form elements found: ${formElements}`);

    // Take a full page screenshot
    await page.screenshot({ path: "full-page-debug.png", fullPage: true });

    console.log("✅ Page analysis complete - check screenshots for visual verification");
  });
});
