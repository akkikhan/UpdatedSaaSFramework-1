import fetch from "node-fetch";

// Test data for a new tenant with password (for /api/register endpoint)
const tenantData = {
  // Basic Information (matching /api/register endpoint expectations)
  name: "Test Company With Password",
  orgId: `test-company-${Date.now()}`, // Make it unique
  adminName: "Test Admin",
  adminEmail: "admin@testcompany.com",
  adminPassword: "SecurePassword123!",

  // Modules (using correct backend enum values)
  enabledModules: ["auth", "rbac"],
};

async function testCompleteOnboarding() {
  console.log("🧪 Testing complete onboarding flow with password...");

  try {
    // Step 1: Register tenant with admin user (using public registration endpoint)
    console.log("\n📝 Step 1: Registering tenant with admin user...");
    const response = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tenantData),
    });

    const result = await response.json();
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error("❌ Tenant creation failed!");
      return;
    }

    console.log("✅ Tenant registered successfully!");
    const { tenant } = result; // The registration endpoint returns tenant info

    // Step 2: Verify tenant was created
    console.log("\n📋 Step 2: Verifying tenant details...");
    console.log("Tenant ID:", tenant.id);
    console.log("Org ID:", tenant.orgId);
    console.log("Tenant Name:", tenant.name);
    console.log("Tenant Status:", tenant.status);

    // Step 3: Test login with the created credentials
    console.log("\n🔐 Step 3: Testing admin login...");
    const loginResponse = await fetch(`http://localhost:5000/api/v2/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: tenantData.adminEmail,
        password: tenantData.adminPassword,
        tenantId: tenant.id, // Include tenant ID in request body
      }),
    });

    const loginResult = await loginResponse.json();
    console.log("Login response status:", loginResponse.status);
    console.log("Login result:", JSON.stringify(loginResult, null, 2));

    if (loginResponse.ok) {
      console.log("✅ Admin login successful!");
      console.log("🎉 COMPLETE ONBOARDING FLOW WORKING!");
      console.log("\n📋 Summary:");
      console.log(`- Tenant: ${tenant.orgId}`);
      console.log(`- Admin Email: ${tenantData.adminEmail}`);
      console.log(`- Admin Password: ${tenantData.adminPassword}`);
      console.log(`- Login URL: http://localhost:5000/tenant/${tenant.orgId}/login`);
    } else {
      console.log("❌ Admin login failed!");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testCompleteOnboarding();
