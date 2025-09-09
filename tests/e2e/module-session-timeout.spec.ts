import { test, expect } from "@playwright/test";

// Ensures session timeout surfaces a clear message to the user

test.describe("Module session timeout", () => {
  test("shows session expired when backend returns 401", async ({ page }) => {
    await page.route("**/auth/sessions", route => route.fulfill({ status: 401, body: "{}" }));
    await page.route("**/api/tenants/by-org-id/demo", route =>
      route.fulfill({ json: { id: "t1", adminEmail: "owner@example.com", enabledModules: ["auth", "rbac"] } })
    );
    await page.route("**/api/tenant/t1/rbac/settings", route =>
      route.fulfill({ json: { customPermissions: [] } })
    );
    await page.route("**/api/tenant/t1/rbac/catalog/*", route => route.fulfill({ json: [] }));
    await page.route("**/api/v2/rbac/**", route => route.fulfill({ json: [] }));
    await page.route("**/auth/users", route => route.fulfill({ json: [] }));

    await page.goto("http://localhost:5000/tenant/demo/dashboard");
    await expect(page.locator("text=Session expired")).toBeVisible();
    await expect(page.getByTestId("session-diagnostics")).toBeVisible();
  });
});
