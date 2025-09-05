// Test Tenant Login Functionality
const fetch = require("node-fetch");

const BASE_URL = "http://localhost:5000";

// Test configuration
const TEST_TENANT = {
  name: "Test Company",
  orgId: "test-company",
  adminEmail: "admin@test.com",
  adminName: "Test Admin",
  adminPassword: "TestPassword123!",
  enabledModules: ["auth", "rbac"],
};

/*
async function registerTenant() {
  console.log("📝 Registering new tenant...");

  try {
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(TEST_TENANT),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Registration failed:", data.message);
      return null;
    }

    console.log("✅ Tenant registered successfully:", data);
    return data.tenant;
  } catch (error) {
    console.error("❌ Registration error:", error.message);
    return null;
  }
}
*/

async function testTenantLogin() {
  console.log("\n🔐 Testing tenant login...");

  try {
    // First, get tenant ID by orgId
    const tenantResponse = await fetch(`${BASE_URL}/api/tenants/by-org-id/${TEST_TENANT.orgId}`, {
      method: "GET",
    });

    if (!tenantResponse.ok) {
      console.error("❌ Failed to get tenant info");
      return null;
    }

    const tenant = await tenantResponse.json();
    console.log("📋 Tenant found:", { id: tenant.id, orgId: tenant.orgId, name: tenant.name });

    // Test login via V2 API
    const loginResponse = await fetch(`${BASE_URL}/api/v2/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: TEST_TENANT.adminEmail,
        password: TEST_TENANT.adminPassword,
        tenantId: tenant.id,
      }),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      console.error("❌ Login failed:", loginData.message);
      return null;
    }

    console.log("✅ Login successful!");
    console.log("   Token:", loginData.token.substring(0, 20) + "...");
    console.log("   User:", loginData.user);

    return loginData;
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return null;
  }
}

async function testTokenVerification(token) {
  console.log("\n🔍 Testing token verification...");

  try {
    const response = await fetch(`${BASE_URL}/api/v2/auth/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Token verification failed:", data.message);
      return false;
    }

    console.log("✅ Token verified successfully:", data);
    return true;
  } catch (error) {
    console.error("❌ Verification error:", error.message);
    return false;
  }
}

async function testLogout(token) {
  console.log("\n👋 Testing logout...");

  try {
    const response = await fetch(`${BASE_URL}/api/v2/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Logout failed:", data.message);
      return false;
    }

    console.log("✅ Logout successful:", data.message);
    return true;
  } catch (error) {
    console.error("❌ Logout error:", error.message);
    return false;
  }
}

async function runTests() {
  console.log("🚀 Starting Tenant Login Tests");
  console.log("================================\n");

  // Step 1: Register tenant (if needed)
  // Uncomment this if you need to create a new tenant
  // const tenant = await registerTenant();
  // if (!tenant) {
  //   console.error('❌ Failed to register tenant. Exiting...');
  //   return;
  // }

  // Step 2: Test login
  const loginResult = await testTenantLogin();
  if (!loginResult) {
    console.error("❌ Login test failed. Exiting...");
    return;
  }

  // Step 3: Test token verification
  const verified = await testTokenVerification(loginResult.token);
  if (!verified) {
    console.error("❌ Token verification failed.");
  }

  // Step 4: Test logout
  const loggedOut = await testLogout(loginResult.token);
  if (!loggedOut) {
    console.error("❌ Logout test failed.");
  }

  console.log("\n================================");
  console.log("✅ All tests completed!");
  console.log("\n📱 You can now access the tenant portal at:");
  console.log(`   http://localhost:5000/tenant/${TEST_TENANT.orgId}/login`);
  console.log("\n   Use these credentials:");
  console.log(`   Email: ${TEST_TENANT.adminEmail}`);
  console.log(`   Password: ${TEST_TENANT.adminPassword}`);
}

// Run the tests
runTests().catch(console.error);
