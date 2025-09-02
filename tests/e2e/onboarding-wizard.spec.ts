import { test, expect } from "@playwright/test";

test.describe("Onboarding Wizard UI Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the onboarding wizard
    await page.goto("/register");
    await page.waitForSelector("form");
  });

  test("should display all form fields correctly", async ({ page }) => {
    // Test basic information fields
    await expect(page.locator('input[name="orgName"]')).toBeVisible();
    await expect(page.locator('input[name="orgId"]')).toBeVisible();
    await expect(page.locator('input[name="adminName"]')).toBeVisible();
    await expect(page.locator('input[name="adminEmail"]')).toBeVisible();
    await expect(page.locator('input[name="adminPassword"]')).toBeVisible();
    await expect(page.locator('input[name="companyWebsite"]')).toBeVisible();

    // Test password field type
    await expect(page.locator('input[name="adminPassword"]')).toHaveAttribute("type", "password");

    // Test navigation buttons
    await expect(page.locator('button:has-text("Next")')).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    // Try to submit without filling required fields
    await page.click('button:has-text("Next")');

    // Check for validation messages
    await expect(
      page.locator('text="Organization name must be at least 2 characters"')
    ).toBeVisible();
    await expect(
      page.locator('text="Organization ID must be at least 3 characters"')
    ).toBeVisible();
    await expect(page.locator('text="Admin name must be at least 2 characters"')).toBeVisible();
    await expect(page.locator('text="Admin password must be at least 8 characters"')).toBeVisible();
  });

  test("should navigate through all wizard steps", async ({ page }) => {
    // Fill basic information
    await page.fill('input[name="orgName"]', "Test Company UI");
    await page.fill('input[name="orgId"]', "test-company-ui");
    await page.fill('input[name="adminName"]', "UI Test Admin");
    await page.fill('input[name="adminEmail"]', "admin@testui.com");
    await page.fill('input[name="adminPassword"]', "SecurePassword123!");
    await page.fill('input[name="companyWebsite"]', "https://testui.com");

    // Click Next to go to modules step
    await page.click('button:has-text("Next")');

    // Verify we're on modules step
    await expect(page.locator('text="Select Modules"')).toBeVisible();

    // Select some modules
    await page.click('[data-testid="module-auth"] >> [role="checkbox"]');
    await page.click('[data-testid="module-rbac"] >> [role="checkbox"]');

    // Click Next to go to auth providers step
    await page.click('button:has-text("Next")');

    // Verify we're on auth providers step
    await expect(page.locator('text="Authentication Providers"')).toBeVisible();

    // Enable Azure AD provider
    await page.click('[data-testid="provider-azure-ad"] >> [role="checkbox"]');

    // Fill Azure AD config if visible
    const azureConfig = page.locator('[data-testid="azure-ad-config"]');
    if (await azureConfig.isVisible()) {
      await page.fill('input[name="authProviders.0.config.clientId"]', "test-client-id");
      await page.fill('input[name="authProviders.0.config.clientSecret"]', "test-client-secret");
      await page.fill('input[name="authProviders.0.config.tenantId"]', "test-tenant-id");
    }

    // Click Next to go to logging step
    await page.click('button:has-text("Next")');

    // Verify we're on logging step
    await expect(page.locator('text="Logging Configuration"')).toBeVisible();

    // Select logging levels
    await page.click('[data-testid="logging-level-info"] >> [role="checkbox"]');
    await page.click('[data-testid="logging-level-error"] >> [role="checkbox"]');

    // Click Next to go to review step
    await page.click('button:has-text("Next")');

    // Verify we're on review step
    await expect(page.locator('text="Review Configuration"')).toBeVisible();

    // Verify review data
    await expect(page.locator('text="Test Company UI"')).toBeVisible();
    await expect(page.locator('text="test-company-ui"')).toBeVisible();
    await expect(page.locator('text="admin@testui.com"')).toBeVisible();
  });

  test("should complete full onboarding flow", async ({ page }) => {
    // Fill basic information
    await page.fill('input[name="orgName"]', "Complete Test Company");
    await page.fill('input[name="orgId"]', `complete-test-${Date.now()}`);
    await page.fill('input[name="adminName"]', "Complete Test Admin");
    await page.fill('input[name="adminEmail"]', "admin@completetest.com");
    await page.fill('input[name="adminPassword"]', "CompletePassword123!");
    await page.fill('input[name="companyWebsite"]', "https://completetest.com");

    // Navigate through all steps
    await page.click('button:has-text("Next")');

    // Select modules
    await page.click('[data-testid="module-auth"] >> [role="checkbox"]');
    await page.click('[data-testid="module-rbac"] >> [role="checkbox"]');
    await page.click('button:has-text("Next")');

    // Skip auth providers or configure if needed
    await page.click('button:has-text("Next")');

    // Configure logging
    await page.click('[data-testid="logging-level-info"] >> [role="checkbox"]');
    await page.click('button:has-text("Next")');

    // Review and submit
    await page.click('button:has-text("Create Organization")');

    // Wait for success response
    await page.waitForSelector('text="Organization created successfully"', { timeout: 10000 });

    // Verify success message
    await expect(page.locator('text="Organization created successfully"')).toBeVisible();
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Fill form with invalid data (duplicate orgId)
    await page.fill('input[name="orgName"]', "Duplicate Test");
    await page.fill('input[name="orgId"]', "duplicate-test"); // Use a known existing ID
    await page.fill('input[name="adminName"]', "Duplicate Admin");
    await page.fill('input[name="adminEmail"]', "admin@duplicate.com");
    await page.fill('input[name="adminPassword"]', "DuplicatePassword123!");

    // Navigate through steps quickly
    await page.click('button:has-text("Next")');
    await page.click('[data-testid="module-auth"] >> [role="checkbox"]');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('[data-testid="logging-level-info"] >> [role="checkbox"]');
    await page.click('button:has-text("Next")');

    // Try to submit
    await page.click('button:has-text("Create Organization")');

    // Check for error message
    await expect(page.locator('text="Organization ID already exists"')).toBeVisible();
  });

  test("should have working back navigation", async ({ page }) => {
    // Fill basic info and go to next step
    await page.fill('input[name="orgName"]', "Back Test Company");
    await page.fill('input[name="orgId"]', "back-test-company");
    await page.fill('input[name="adminName"]', "Back Test Admin");
    await page.fill('input[name="adminEmail"]', "admin@backtest.com");
    await page.fill('input[name="adminPassword"]', "BackPassword123!");

    await page.click('button:has-text("Next")');

    // Verify we're on modules step
    await expect(page.locator('text="Select Modules"')).toBeVisible();

    // Click back
    await page.click('button:has-text("Back")');

    // Verify we're back on basic info and data is preserved
    await expect(page.locator('input[name="orgName"]')).toHaveValue("Back Test Company");
    await expect(page.locator('input[name="orgId"]')).toHaveValue("back-test-company");
    await expect(page.locator('input[name="adminName"]')).toHaveValue("Back Test Admin");
    await expect(page.locator('input[name="adminEmail"]')).toHaveValue("admin@backtest.com");
    await expect(page.locator('input[name="adminPassword"]')).toHaveValue("BackPassword123!");
  });

  test("should show loading states during submission", async ({ page }) => {
    // Fill minimum required fields
    await page.fill('input[name="orgName"]', "Loading Test Company");
    await page.fill('input[name="orgId"]', `loading-test-${Date.now()}`);
    await page.fill('input[name="adminName"]', "Loading Admin");
    await page.fill('input[name="adminEmail"]', "admin@loadingtest.com");
    await page.fill('input[name="adminPassword"]', "LoadingPassword123!");

    // Navigate to final step
    await page.click('button:has-text("Next")');
    await page.click('[data-testid="module-auth"] >> [role="checkbox"]');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('[data-testid="logging-level-info"] >> [role="checkbox"]');
    await page.click('button:has-text("Next")');

    // Click submit and check for loading state
    await page.click('button:has-text("Create Organization")');

    // Should show loading state (button disabled or loading text)
    await expect(page.locator('button:disabled, button:has-text("Creating...")')).toBeVisible();
  });
});
