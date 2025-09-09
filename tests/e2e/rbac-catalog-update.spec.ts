import { test, expect } from "@playwright/test";

// Ensures catalog updates are reflected in the tenant dashboard UI

test.describe("RBAC catalog updates", () => {
  test("revoked roles disappear after catalog refresh", async ({ page }) => {
    await page.route("**/rbac/catalog/templates", route =>
      route.fulfill({ json: [] })
    );
    await page.route("**/rbac/catalog/business-types", route =>
      route.fulfill({ json: [] })
    );
    // initial roles include editor
    await page.route("**/rbac-config/default-roles**", route =>
      route.fulfill({ json: [{ id: "viewer", name: "Viewer" }, { id: "editor", name: "Editor" }] })
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
    await expect(page.locator("text=Editor")).toBeVisible();

    // updated catalog removes editor role
    await page.route("**/rbac-config/default-roles**", route =>
      route.fulfill({ json: [{ id: "viewer", name: "Viewer" }] })
    );
    await page.reload();
    await expect(page.locator("text=Editor")).not.toBeVisible();
  });
});
