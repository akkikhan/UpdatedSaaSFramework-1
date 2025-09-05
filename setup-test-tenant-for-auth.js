/**
 * Setup test tenant with known API key for testing
 */

import { storage } from "./server/storage.js";

console.log("🔧 Setting up test tenant for API key authentication...");

async function setupTestTenant() {
  try {
    // Check if test tenant already exists
    let tenant = await storage.getTenantByOrgId("test-tenant");

    if (tenant) {
      console.log("✅ Test tenant already exists");
      console.log(`   Tenant ID: ${tenant.id}`);
      console.log(`   Org ID: ${tenant.orgId}`);
      console.log(`   API Key: ${tenant.authApiKey}`);
      return tenant;
    }

    // Create test tenant
    console.log("Creating new test tenant...");

    const testTenantData = {
      name: "Test Tenant for API Key Auth",
      orgId: "test-tenant",
      enabledModules: ["auth", "rbac"],
      businessType: "testing",
      email: "test@example.com",
      status: "active",
      authApiKey: "auth_abc123def456ghi789jkl012", // Known test key
      rbacApiKey: "rbac_test123456789",
      notificationApiKey: "notif_test123456789",
      emailApiKey: "email_test123456789",
      loggingApiKey: "log_test123456789",
    };

    tenant = await storage.createTenant(testTenantData);

    console.log("✅ Test tenant created successfully!");
    console.log(`   Tenant ID: ${tenant.id}`);
    console.log(`   Org ID: ${tenant.orgId}`);
    console.log(`   API Key: ${tenant.authApiKey}`);

    return tenant;
  } catch (error) {
    console.error("❌ Failed to setup test tenant:", error);
    throw error;
  }
}

setupTestTenant()
  .then(() => {
    console.log("🎉 Test tenant setup complete!");
    console.log("Ready to test API key authentication");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Setup failed:", error);
    process.exit(1);
  });
