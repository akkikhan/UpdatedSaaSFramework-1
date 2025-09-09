import { test, expect } from "@playwright/test";

// Ensures module session diagnostics surface failures to the user.

test.describe("Module session diagnostics", () => {
  test("retry loads sessions after initial failure", async ({ page }) => {
    let first = true;
    await page.route("**/auth/sessions", route => {
      if (first) {
        first = false;
        route.abort();
      } else {
        route.fulfill({ json: [{ id: "1", userId: "u1" }] });
      }
    });
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
    await expect(page.locator("text=Failed to load sessions")).toBeVisible();
    await expect(page.getByTestId("session-diagnostics")).toBeVisible();
    await page.getByTestId("button-retry-sessions").click();
    await expect(page.locator("text=u1")).toBeVisible();
  });

  test("retry surfaces failure when backend persists", async ({ page }) => {
    await page.route("**/auth/sessions", route => route.abort());
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
    await expect(page.locator("text=Failed to load sessions")).toBeVisible();
    await expect(page.getByTestId("session-diagnostics")).toBeVisible();
    await page.getByTestId("button-retry-sessions").click();
    await expect(page.locator("text=Failed to load sessions")).toBeVisible();
  });
});
