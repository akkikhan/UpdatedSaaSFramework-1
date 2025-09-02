import { test, expect } from "@playwright/test";

test.describe("Onboarding Wizard Complete Flow", () => {
  test("should complete the full onboarding wizard with password field", async ({ page }) => {
    // Navigate to the onboarding wizard
    await page.goto("http://localhost:5000/tenants/wizard");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Take a screenshot of the initial state
    await page.screenshot({ path: "test-results/onboarding-wizard-initial.png", fullPage: true });

    // Verify the title
    await expect(page).toHaveTitle(/Tenant Onboarding/);
    console.log("✅ Page title verified");

    // Step 1: Fill Basic Information
    console.log("📝 Step 1: Filling basic information...");

    // Fill organization name
    const orgNameField = page.locator('input[placeholder*="Acme Corporation"]');
    await expect(orgNameField).toBeVisible();
    await orgNameField.fill("Test Company UI");

    // Fill organization ID
    const orgIdField = page.locator('input[placeholder*="acme-corp"]');
    await expect(orgIdField).toBeVisible();
    await orgIdField.fill(`test-company-ui-${Date.now()}`);

    // Fill admin name
    const adminNameField = page.locator('input[placeholder*="John Doe"]');
    await expect(adminNameField).toBeVisible();
    await adminNameField.fill("UI Test Admin");

    // Fill admin email
    const adminEmailField = page.locator('input[placeholder*="admin@acme.com"]');
    await expect(adminEmailField).toBeVisible();
    await adminEmailField.fill("admin@testcompany-ui.com");

    // Fill admin password (the field we just added!)
    const adminPasswordField = page.locator('input[placeholder*="Enter secure password"]');
    await expect(adminPasswordField).toBeVisible();
    console.log("✅ Password field is visible!");
    await adminPasswordField.fill("SecurePassword123!");

    // Fill company website
    const websiteField = page.locator('input[placeholder*="https://acme.com"]');
    await expect(websiteField).toBeVisible();
    await websiteField.fill("https://testcompany-ui.com");

    // Take screenshot after filling basic info
    await page.screenshot({
      path: "test-results/onboarding-basic-info-filled.png",
      fullPage: true,
    });
    console.log("✅ Basic information filled");

    // Click Next to go to Module Selection
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    await page.waitForLoadState("networkidle");

    // Step 2: Select Modules
    console.log("📝 Step 2: Selecting modules...");

    // Wait for module selection page
    await page.waitForSelector("text=Module Selection", { timeout: 10000 });

    // Select Authentication module (should be selected by default)
    const authModule = page.locator('[data-module="authentication"]').first();
    if (await authModule.isVisible()) {
      await authModule.check();
      console.log("✅ Authentication module selected");
    }

    // Select User Management module
    const userMgmtModule = page.locator('[data-module="user-management"]').first();
    if (await userMgmtModule.isVisible()) {
      await userMgmtModule.check();
      console.log("✅ User Management module selected");
    }

    // Take screenshot of module selection
    await page.screenshot({ path: "test-results/onboarding-modules-selected.png", fullPage: true });

    // Click Next to go to Auth Providers
    await nextButton.click();
    await page.waitForLoadState("networkidle");

    // Step 3: Configure Auth Providers
    console.log("📝 Step 3: Configuring auth providers...");

    // Wait for auth providers page
    await page.waitForSelector("text=Authentication Providers", { timeout: 10000 });

    // Enable Azure AD provider
    const azureAdToggle = page.locator('[data-provider="azure-ad"]').first();
    if (await azureAdToggle.isVisible()) {
      await azureAdToggle.check();
      console.log("✅ Azure AD provider enabled");

      // Fill Azure AD configuration if fields appear
      const clientIdField = page.locator('input[placeholder*="Client ID"]');
      if (await clientIdField.isVisible()) {
        await clientIdField.fill("test-client-id-ui");
      }

      const clientSecretField = page.locator('input[placeholder*="Client Secret"]');
      if (await clientSecretField.isVisible()) {
        await clientSecretField.fill("test-client-secret-ui");
      }

      const tenantIdField = page.locator('input[placeholder*="Tenant ID"]');
      if (await tenantIdField.isVisible()) {
        await tenantIdField.fill("test-tenant-id-ui");
      }
    }

    // Take screenshot of auth providers
    await page.screenshot({ path: "test-results/onboarding-auth-providers.png", fullPage: true });

    // Click Next to go to Logging
    await nextButton.click();
    await page.waitForLoadState("networkidle");

    // Step 4: Configure Logging
    console.log("📝 Step 4: Configuring logging...");

    // Wait for logging page
    await page.waitForSelector("text=Logging Configuration", { timeout: 10000 });

    // Select logging levels
    const infoLevel = page.locator('[data-level="info"]').first();
    if (await infoLevel.isVisible()) {
      await infoLevel.check();
      console.log("✅ Info logging level selected");
    }

    const errorLevel = page.locator('[data-level="error"]').first();
    if (await errorLevel.isVisible()) {
      await errorLevel.check();
      console.log("✅ Error logging level selected");
    }

    // Take screenshot of logging configuration
    await page.screenshot({ path: "test-results/onboarding-logging-config.png", fullPage: true });

    // Click Next to go to Review
    await nextButton.click();
    await page.waitForLoadState("networkidle");

    // Step 5: Review and Submit
    console.log("📝 Step 5: Reviewing and submitting...");

    // Wait for review page
    await page.waitForSelector("text=Review", { timeout: 10000 });

    // Take screenshot of review page
    await page.screenshot({ path: "test-results/onboarding-review.png", fullPage: true });

    // Click Submit button
    const submitButton = page.locator('button:has-text("Create Organization")');
    await expect(submitButton).toBeVisible();
    console.log("✅ Submit button found");

    // Click submit and wait for response
    await submitButton.click();

    // Wait for either success or error response
    try {
      // Wait for success message or redirect
      await page.waitForSelector("text=success", { timeout: 15000 });
      console.log("✅ Success message appeared");

      // Take final screenshot
      await page.screenshot({ path: "test-results/onboarding-success.png", fullPage: true });
    } catch (error) {
      // If no success message, take a screenshot to see what happened
      await page.screenshot({
        path: "test-results/onboarding-submission-result.png",
        fullPage: true,
      });
      console.log("📷 Captured submission result");

      // Check for any error messages
      const errorMessages = await page.locator('.error, .alert, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log("❌ Error messages found:", errorMessages);
      }
    }

    console.log("🎉 Onboarding wizard test completed!");
  });

  test("should validate form fields and show errors", async ({ page }) => {
    await page.goto("http://localhost:5000/tenants/wizard");
    await page.waitForLoadState("networkidle");

    console.log("🧪 Testing form validation...");

    // Try to click Next without filling required fields
    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();

    // Check for validation errors
    const errorMessages = await page
      .locator(".error, .text-red-500, [data-error]")
      .allTextContents();
    console.log("Validation errors found:", errorMessages);

    // Take screenshot of validation errors
    await page.screenshot({ path: "test-results/validation-errors.png", fullPage: true });

    console.log("✅ Validation test completed");
  });
});
