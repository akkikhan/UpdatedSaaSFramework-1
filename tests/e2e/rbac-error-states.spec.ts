import { test, expect } from "@playwright/test";

// Ensures tenant dashboard surfaces RBAC-related errors to the user

test.describe("RBAC error states", () => {
  test("shows toast when catalog fetch fails", async ({ page }) => {
    await page.route("**/rbac/catalog/**", route => route.abort());
    await page.goto("http://localhost:5000/tenant/demo/dashboard");
    await expect(page.locator("text=Failed to load RBAC catalog")).toBeVisible();
  });

  test("shows toast when role save fails", async ({ page }) => {
    await page.route("**/api/tenants/by-org-id/demo", route =>
      route.fulfill({ json: { id: "t1", adminEmail: "owner@example.com", enabledModules: ["rbac"] } })
    );
    await page.route("**/api/tenant/t1/rbac/settings", route =>
      route.fulfill({ json: { customPermissions: [] } })
    );
    await page.route("**/api/tenant/t1/rbac/catalog/*", route => route.fulfill({ json: [] }));
    await page.route("**/auth/users", route => route.fulfill({ json: [] }));
    await page.route("**/auth/sessions", route => route.fulfill({ json: [] }));
    await page.route("**/api/v2/rbac/roles", route => {
      if (route.request().method() === "POST") {
        route.fulfill({ status: 500, body: "{}" });
      } else {
        route.fulfill({ json: [] });
      }
    });

    await page.goto("http://localhost:5000/tenant/demo/dashboard");
    await page.getByTestId("button-add-role").click();
    await page.getByLabel("Role Name").fill("Editor");
    await page.getByLabel("users.read").check();
    await page.getByRole("button", { name: "Create Role" }).click();
    await expect(page.locator("text=Failed to save role")).toBeVisible();
  });

  test("shows toast when platform rbac-config fetch fails", async ({ page }) => {
    await page.route("**/api/rbac-config/permission-templates", route => route.abort());
    await page.route("**/api/rbac-config/business-types", route => route.abort());
    await page.route("**/auth/sessions", route => route.fulfill({ json: [] }));
    await page.route("**/api/tenants/by-org-id/demo", route =>
      route.fulfill({ json: { id: "t1", adminEmail: "owner@example.com", enabledModules: ["rbac"] } })
    );
    await page.route("**/api/tenant/t1/rbac/settings", route =>
      route.fulfill({ json: { customPermissions: [] } })
    );
    await page.route("**/api/tenant/t1/rbac/catalog/*", route => route.fulfill({ json: [] }));
    await page.route("**/auth/users", route => route.fulfill({ json: [] }));

    await page.goto("http://localhost:5000/tenant/demo/dashboard");
    await expect(page.locator("text=Failed to load platform RBAC config")).toBeVisible();
  });
});
