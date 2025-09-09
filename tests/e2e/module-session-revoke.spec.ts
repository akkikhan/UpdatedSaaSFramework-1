import { test, expect } from "@playwright/test";

// Verify that active sessions can be revoked from the tenant dashboard

test("revokes active sessions", async ({ page }) => {
  let revoked = false;
  await page.route("**/auth/sessions", route => {
    if (revoked) {
      route.fulfill({ json: [] });
    } else {
      route.fulfill({ json: [{ id: "s1", userId: "u1", createdAt: "2024-01-01T00:00:00Z" }] });
    }
  });
  await page.route("**/auth/sessions/s1", route => {
    revoked = true;
    route.fulfill({ json: { message: "ok" } });
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
  await expect(page.locator("text=u1")).toBeVisible();
  await page.getByTestId("button-revoke-session-s1").click();
  await expect(page.locator("text=u1")).not.toBeVisible();
});
