import { test, expect } from "@playwright/test";

test.describe("RBAC role assignment", () => {
  test("creates role and assigns to user", async ({ page }) => {
    const roles: any[] = [{ id: "r1", name: "Manager", permissions: [] }];
    let userRoles: any[] = [];

    await page.route("**/api/tenants/by-org-id/demo", route =>
      route.fulfill({ json: { id: "t1", adminEmail: "owner@example.com", enabledModules: ["auth", "rbac"] } })
    );
    await page.route("**/auth/users", route =>
      route.fulfill({ json: [{ id: "u1", email: "u1@example.com", status: "active", createdAt: new Date().toISOString() }] })
    );
    await page.route("**/api/v2/rbac/roles", route => {
      if (route.request().method() === "GET") {
        route.fulfill({ json: roles });
      } else {
        const newRole = { id: "r2", name: "Editor", permissions: ["users.read"] };
        roles.push(newRole);
        route.fulfill({ json: newRole });
      }
    });
    await page.route("**/api/v2/rbac/users/u1/roles", route => {
      const method = route.request().method();
      if (method === "GET") {
        route.fulfill({ json: userRoles });
      } else if (method === "POST") {
        userRoles = [{ id: "r2", name: "Editor" }];
        route.fulfill({ json: {} });
      } else {
        route.fulfill({ json: {} });
      }
    });
    await page.route("**/api/tenant/t1/rbac/settings", route => route.fulfill({ json: { customPermissions: [] } }));
    await page.route("**/api/tenant/t1/rbac/catalog/*", route => route.fulfill({ json: [] }));
    await page.route("**/auth/sessions", route => route.fulfill({ json: [] }));

    await page.goto("http://localhost:5000/tenant/demo/dashboard");

    await page.getByRole("tab", { name: "Roles" }).click();
    await page.getByTestId("button-add-role").click();
    await page.getByLabel("Role Name").fill("Editor");
    await page.getByLabel("users.read").check();
    await page.getByRole("button", { name: "Create Role" }).click();

    await page.getByRole("tab", { name: "Users" }).click();
    await page.getByTestId("button-manage-roles-u1").click();
    await page.getByLabel("Editor").check();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator("text=Editor")).toBeVisible();
  });
});
