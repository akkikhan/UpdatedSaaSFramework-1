import { test, expect } from "@playwright/test";

// Verifies that RBAC settings pull template and business type options dynamically
// from the platform admin RBAC catalog endpoints.

test.describe("RBAC catalog dynamic data", () => {
  test("renders templates and business types from catalog endpoints", async ({ page }) => {
    await page.route("**/rbac/catalog/templates", route =>
      route.fulfill({ json: [{ id: "fin", name: "Finance" }] })
    );
    await page.route("**/rbac/catalog/business-types", route =>
      route.fulfill({ json: [{ id: "retail", name: "Retail" }] })
    );
    await page.route("**/rbac-config/default-roles**", route =>
      route.fulfill({ json: [{ id: "viewer", name: "Viewer" }] })
    );
    await page.route("**/api/tenants/by-org-id/demo", route =>
      route.fulfill({ json: { id: "t1", adminEmail: "owner@example.com", enabledModules: ["rbac"] } })
    );
    await page.route("**/api/tenant/t1/rbac/settings", route =>
      route.fulfill({ json: { customPermissions: [] } })
    );
    await page.route("**/api/tenant/t1/rbac/catalog/*", route => route.fulfill({ json: [] }));
    await page.route("**/api/v2/rbac/**", route => route.fulfill({ json: [] }));
    await page.route("**/auth/users", route => route.fulfill({ json: [] }));
    await page.route("**/auth/sessions", route => route.fulfill({ json: [] }));

    await page.goto("http://localhost:5000/tenant/demo/dashboard");

    await expect(page.locator("text=Finance")).toBeVisible();
    await expect(page.locator("text=Retail")).toBeVisible();
    await expect(page.locator("text=Viewer")).toBeVisible();
  });
});
