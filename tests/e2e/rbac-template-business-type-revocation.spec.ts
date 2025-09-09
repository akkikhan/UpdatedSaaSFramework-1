import { test, expect } from "@playwright/test";

// Ensure revoked permission templates and business types are surfaced to the tenant

test("revoked template and business type trigger toast", async ({ page }) => {
  await page.route("**/auth/sessions", route => route.fulfill({ json: [] }));
  await page.route("**/api/tenants/by-org-id/demo", route =>
    route.fulfill({ json: { id: "t1", adminEmail: "owner@example.com", enabledModules: ["auth", "rbac"] } })
  );
  await page.route("**/api/tenant/t1/rbac/settings", route =>
    route.fulfill({ json: { permissionTemplate: "oldTpl", businessType: "oldBt", customPermissions: [] } })
  );
  await page.route("**/api/tenant/t1/rbac/catalog/templates", route =>
    route.fulfill({ json: [{ id: "oldTpl", name: "OldTpl" }] })
  );
  await page.route("**/api/tenant/t1/rbac/catalog/business-types", route =>
    route.fulfill({ json: [{ id: "oldBt", name: "OldBt" }] })
  );
  await page.route("**/api/rbac-config/permission-templates", route => route.fulfill({ json: [] }));
  await page.route("**/api/rbac-config/business-types", route => route.fulfill({ json: [] }));
  await page.route("**/api/rbac-config/default-roles", route => route.fulfill({ json: [] }));
  await page.route("**/api/v2/rbac/**", route => route.fulfill({ json: [] }));
  await page.route("**/auth/users", route => route.fulfill({ json: [] }));

  await page.goto("http://localhost:5000/tenant/demo/dashboard");
  await expect(page.locator("text=Permission template revoked")).toBeVisible();
  await expect(page.locator("text=Business type revoked")).toBeVisible();
});
