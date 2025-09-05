import { test, expect } from "@playwright/test";

// Smoke-level e2e: verifies onboarding -> default roles -> tenant portal RBAC settings visible
// Note: This is a light scaffold and assumes server is running on localhost:5000

test.describe("RBAC onboarding sync", () => {
  test("wizard creates tenant and roles appear in tenant portal", async ({ page }) => {
    // Platform admin login step is environment-specific; skipping and going directly
    // to wizard page if session exists. Otherwise this test acts as a placeholder.
    await page.goto("http://localhost:5000/tenants/wizard");
    await expect(page.locator("text=Tenant Onboarding")).toBeVisible();

    // Basic info
    await page.getByLabel("Organization Name *").fill("Playwright Co");
    const slug = `pw-${Date.now().toString().slice(-6)}`;
    await page.getByLabel("Organization ID *").fill(slug);
    await page.getByLabel("Admin Email *").fill("owner@example.com");
    await page.getByLabel("Admin Name *").fill("Owner");
    await page.getByRole("button", { name: "Next" }).click();

    // Select modules (RBAC)
    await page.locator("text=RBAC").first().click();
    await page.getByRole("button", { name: "Next" }).click();

    // Configure modules -> RBAC default roles visible
    await expect(page.locator("text=RBAC Configuration")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    // Review & Create
    await page.getByRole("button", { name: "Onboard Tenant" }).click();

    // Success redirect (best-effort)
    await page.waitForTimeout(2000);

    // Tenant portal (requires separate login in real flow). This is a smoke placeholder.
    // Navigate to a known route to avoid flakiness.
    await page.goto(`http://localhost:5000/tenant/${slug}/dashboard`);
    // Expect at least the page scaffold to load
    await expect(page.locator("text=RBAC")).toBeVisible();
  });
});
