const { storage } = await import("./server/storage.js");

console.log("🔧 Creating test tenant with API key for authentication testing...");

try {
  // Check if tenant already exists
  const existingTenant = await storage.getTenantByAuthApiKey("auth_abc123def456ghi789jkl012");

  if (existingTenant) {
    console.log("✅ Test tenant already exists:");
    console.log(`   ID: ${existingTenant.id}`);
    console.log(`   Name: ${existingTenant.name}`);
    console.log(`   OrgID: ${existingTenant.orgId}`);
    console.log(`   Status: ${existingTenant.status}`);
    console.log(`   API Key: ${existingTenant.authApiKey}`);
    process.exit(0);
  }

  // Create test tenant
  const testTenant = await storage.createTenant({
    name: "Test Auth Company",
    orgId: "test-auth-company",
    enabledModules: ["auth", "users", "rbac"],
    businessType: "technology",
    contactEmail: "admin@testauth.com",
    status: "active",
    authApiKey: "auth_abc123def456ghi789jkl012",
  });

  console.log("✅ Test tenant created successfully:");
  console.log(`   ID: ${testTenant.id}`);
  console.log(`   Name: ${testTenant.name}`);
  console.log(`   OrgID: ${testTenant.orgId}`);
  console.log(`   Status: ${testTenant.status}`);
  console.log(`   API Key: ${testTenant.authApiKey}`);

  // Test the lookup function
  const foundTenant = await storage.getTenantByAuthApiKey("auth_abc123def456ghi789jkl012");
  if (foundTenant) {
    console.log("✅ Tenant lookup by API key works correctly");
  } else {
    console.log("❌ Tenant lookup by API key failed");
  }
} catch (error) {
  console.error("❌ Error creating test tenant:", error);
  process.exit(1);
}
