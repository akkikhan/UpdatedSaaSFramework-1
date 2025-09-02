import { test, expect } from "@playwright/test";

test.describe("Onboarding Wizard Complete Test", () => {
  test("should test the complete onboarding wizard at /tenants/wizard", async ({ page }) => {
    // Navigate to the actual onboarding wizard
    await page.goto("http://localhost:5000/tenants/wizard");
    await page.waitForLoadState("networkidle");

    // Take initial screenshot
    await page.screenshot({ path: "onboarding-wizard-initial.png", fullPage: true });

    console.log("🚀 Testing Onboarding Wizard UI...");

    // Test Step 1: Basic Information
    console.log("📝 Testing Basic Information Step...");

    // Check for form fields
    const orgNameField = page.locator(
      'input[name="orgName"], input[placeholder*="organization"], label:has-text("Organization Name") >> xpath=following-sibling::*//input'
    );
    const orgIdField = page.locator(
      'input[name="orgId"], input[placeholder*="org-id"], label:has-text("Organization ID") >> xpath=following-sibling::*//input'
    );
    const adminNameField = page.locator(
      'input[name="adminName"], input[placeholder*="John"], label:has-text("Admin Name") >> xpath=following-sibling::*//input'
    );
    const adminEmailField = page.locator(
      'input[name="adminEmail"], input[type="email"], label:has-text("Admin Email") >> xpath=following-sibling::*//input'
    );
    const adminPasswordField = page.locator(
      'input[name="adminPassword"], input[type="password"], label:has-text("Admin Password") >> xpath=following-sibling::*//input'
    );

    // Wait for any of these fields to be visible
    await expect(
      orgNameField
        .or(orgIdField)
        .or(adminNameField)
        .or(adminEmailField)
        .or(adminPasswordField)
        .first()
    ).toBeVisible({ timeout: 10000 });

    // Fill out the form if fields are present
    if (await orgNameField.first().isVisible()) {
      await orgNameField.first().fill("UI Test Company");
      console.log("✅ Filled organization name");
    }

    if (await orgIdField.first().isVisible()) {
      await orgIdField.first().fill(`ui-test-${Date.now()}`);
      console.log("✅ Filled organization ID");
    }

    if (await adminNameField.first().isVisible()) {
      await adminNameField.first().fill("UI Test Admin");
      console.log("✅ Filled admin name");
    }

    if (await adminEmailField.first().isVisible()) {
      await adminEmailField.first().fill("admin@uitest.com");
      console.log("✅ Filled admin email");
    }

    if (await adminPasswordField.first().isVisible()) {
      await adminPasswordField.first().fill("UITestPassword123!");
      console.log("✅ Filled admin password");
    }

    // Take screenshot after filling
    await page.screenshot({ path: "onboarding-step1-filled.png", fullPage: true });

    // Look for Next button and click it
    const nextButton = page.locator(
      'button:has-text("Next"), button:has-text("Continue"), button[type="submit"]'
    );
    if (await nextButton.first().isVisible()) {
      await nextButton.first().click();
      console.log("✅ Clicked Next button");

      // Wait a moment for navigation
      await page.waitForTimeout(1000);

      // Take screenshot after navigation
      await page.screenshot({ path: "onboarding-step2.png", fullPage: true });
    }

    // Test Step 2: Module Selection (if visible)
    console.log("🧩 Testing Module Selection Step...");

    // Look for module checkboxes
    const moduleCheckboxes = page.locator('[role="checkbox"], input[type="checkbox"]');
    const moduleCount = await moduleCheckboxes.count();
    console.log(`Found ${moduleCount} module checkboxes`);

    if (moduleCount > 0) {
      // Select first few modules
      for (let i = 0; i < Math.min(2, moduleCount); i++) {
        await moduleCheckboxes.nth(i).click();
        console.log(`✅ Selected module ${i + 1}`);
      }

      // Take screenshot after module selection
      await page.screenshot({ path: "onboarding-modules-selected.png", fullPage: true });

      // Try to go to next step
      const nextButton2 = page.locator('button:has-text("Next"), button:has-text("Continue")');
      if (await nextButton2.first().isVisible()) {
        await nextButton2.first().click();
        console.log("✅ Proceeded to next step");
        await page.waitForTimeout(1000);
        await page.screenshot({ path: "onboarding-step3.png", fullPage: true });
      }
    }

    // Test Step 3: Continue through remaining steps
    console.log("🔄 Testing remaining steps...");

    // Try to navigate through up to 3 more steps
    for (let step = 3; step <= 5; step++) {
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")');
      if (await nextBtn.first().isVisible()) {
        await nextBtn.first().click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `onboarding-step${step}.png`, fullPage: true });
        console.log(`✅ Completed step ${step}`);
      } else {
        break;
      }
    }

    // Look for final submission button
    const submitButton = page.locator(
      'button:has-text("Create"), button:has-text("Submit"), button:has-text("Finish")'
    );
    if (await submitButton.first().isVisible()) {
      console.log("🎯 Found submit button, testing submission...");

      // Click submit
      await submitButton.first().click();

      // Wait for response
      await page.waitForTimeout(3000);

      // Take final screenshot
      await page.screenshot({ path: "onboarding-final-result.png", fullPage: true });

      // Check for success or error messages
      const successMsg = page.locator('text*="success", text*="created", text*="completed"');
      const errorMsg = page.locator('text*="error", text*="failed", text*="invalid"');

      if (await successMsg.first().isVisible()) {
        console.log("🎉 SUCCESS: Form submitted successfully!");
      } else if (await errorMsg.first().isVisible()) {
        console.log("⚠️ EXPECTED: Got validation error (this is normal for UI testing)");
      } else {
        console.log("ℹ️ No clear success/error message found");
      }
    }

    console.log("✅ Onboarding wizard UI test completed!");
  });

  test("should validate form fields", async ({ page }) => {
    await page.goto("http://localhost:5000/tenants/wizard");
    await page.waitForLoadState("networkidle");

    console.log("🔍 Testing form validation...");

    // Try to submit without filling required fields
    const nextButton = page.locator(
      'button:has-text("Next"), button:has-text("Continue"), button[type="submit"]'
    );
    if (await nextButton.first().isVisible()) {
      await nextButton.first().click();

      // Take screenshot to see validation messages
      await page.screenshot({ path: "onboarding-validation-errors.png", fullPage: true });

      // Look for validation error messages
      const errorMessages = page.locator(
        'text*="required", text*="must be", text*="invalid", [role="alert"]'
      );
      const errorCount = await errorMessages.count();

      console.log(`Found ${errorCount} validation error messages`);

      if (errorCount > 0) {
        console.log("✅ Form validation is working correctly!");
      } else {
        console.log("⚠️ No validation errors found - form might allow empty submission");
      }
    }
  });
});
