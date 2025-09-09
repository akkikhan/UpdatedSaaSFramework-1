import { test, expect } from "@playwright/test";

// Ensures custom permissions input adds values via the Add button
// and surfaces the new permission in the list.

test.describe("RBAC custom permissions", () => {
  test("adds custom permission through Add button", async ({ page }) => {
    await page.route("**/rbac/settings", route => {
      const method = route.request().method();
      if (method === "PATCH") {
        route.fulfill({ status: 200, body: "{}" });
      } else {
        route.fulfill({ json: { customPermissions: [] } });
      }
    });

    await page.goto("http://localhost:5000/tenant/demo/dashboard");
    const input = page.locator('input[placeholder="e.g., invoices.approve"]');
    await input.fill("reports.publish");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.locator("text=reports.publish")).toBeVisible();
  });
});
