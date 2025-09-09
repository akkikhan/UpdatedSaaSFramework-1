import { test, expect } from "@playwright/test";

test.describe("RBAC role revocation", () => {
  test("removes default roles no longer in platform config", async ({ page }) => {
    await page.route("**/api/tenants/by-org-id/demo", route =>
      route.fulfill({ json: { id: "t1", adminEmail: "owner@example.com", enabledModules: ["auth", "rbac"] } })
    );
    await page.route("**/api/v2/rbac/roles", route =>
      route.fulfill({ json: [{ id: "r1", name: "Manager", permissions: [], isDefault: true }] })
    );
    await page.route("**/api/rbac-config/default-roles", route => route.fulfill({ json: [] }));
    await page.route("**/api/tenant/t1/rbac/catalog/*", route => route.fulfill({ json: [] }));
    await page.route("**/auth/users", route =>
      route.fulfill({ json: [{ id: "u1", email: "u1@example.com", status: "active", createdAt: new Date().toISOString() }] })
    );
    await page.route("**/auth/sessions", route => route.fulfill({ json: [] }));

    await page.goto("http://localhost:5000/tenant/demo/dashboard");
    await expect(page.locator("text=Removed default roles: Manager")).toBeVisible();
    await page.getByRole("tab", { name: "Users" }).click();
    await page.getByTestId("button-manage-roles-u1").click();
    await expect(page.locator("text=Manager")).not.toBeVisible();
  });
});
