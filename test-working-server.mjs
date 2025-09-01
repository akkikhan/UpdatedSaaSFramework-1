// Comprehensive test of working SaaS server
async function testServer() {
  const baseURL = "http://localhost:3000";

  console.log("🧪 Testing SaaS Framework Server");
  console.log("================================\n");

  // Test 1: Health Check
  console.log("1️⃣ Testing Health Check...");
  try {
    const response = await fetch(`${baseURL}/health`);
    const health = await response.json();
    console.log("✅ Health Check:", health.status);
    console.log("   Server:", health.server);
    console.log("   Port:", health.port);
    console.log("");
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
    return;
  }

  // Test 2: Admin Login (Valid Credentials)
  console.log("2️⃣ Testing Admin Login (Valid)...");
  try {
    const response = await fetch(`${baseURL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@test.com",
        password: "test123",
      }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log("✅ Login successful!");
      console.log("   User:", result.user.email);
      console.log("   Role:", result.user.role);
      console.log("   Token:", result.token);
      console.log("");
    } else {
      console.log("❌ Login failed:", result.error);
    }
  } catch (error) {
    console.log("❌ Login request failed:", error.message);
  }

  // Test 3: Admin Login (Invalid Credentials)
  console.log("3️⃣ Testing Admin Login (Invalid)...");
  try {
    const response = await fetch(`${baseURL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "wrong@test.com",
        password: "wrong",
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.log("✅ Invalid login properly rejected");
      console.log("   Error:", result.error);
      console.log("");
    } else {
      console.log("❌ Should have rejected invalid credentials");
    }
  } catch (error) {
    console.log("❌ Login request failed:", error.message);
  }

  // Test 4: Tenant Creation (All 4 Modules)
  console.log("4️⃣ Testing Tenant Creation with All Modules...");
  try {
    const response = await fetch(`${baseURL}/api/admin/tenants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Corporation",
        adminEmail: "admin@testcorp.com",
        modules: ["auth", "rbac", "azure-ad", "auth0"],
      }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log("✅ Tenant created successfully!");
      console.log("   ID:", result.tenant.id);
      console.log("   Name:", result.tenant.name);
      console.log("   Admin:", result.tenant.adminEmail);
      console.log("   Modules:", result.tenant.modules);
      console.log("   Status:", result.tenant.status);
      console.log("");
    } else {
      console.log("❌ Tenant creation failed:", result.error);
    }
  } catch (error) {
    console.log("❌ Tenant creation request failed:", error.message);
  }

  // Test 5: API Endpoints Check
  console.log("5️⃣ Testing API Endpoints...");
  try {
    const response = await fetch(`${baseURL}/api/test`);
    const result = await response.json();
    console.log("✅ API Test endpoint working");
    console.log("   Message:", result.message);
    console.log("   Available endpoints:", result.endpoints);
    console.log("");
  } catch (error) {
    console.log("❌ API test failed:", error.message);
  }

  console.log("🎉 Server Testing Complete!");
  console.log("🌐 Admin UI: http://localhost:3000/admin/login");
  console.log("📋 Use credentials: admin@test.com / test123");
}

testServer().catch(console.error);
