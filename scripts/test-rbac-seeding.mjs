#!/usr/bin/env node
// Test RBAC seeding with automatic token generation

const BASE = "http://localhost:5000";

async function getOrCreatePlatformAdmin() {
  console.log("🔐 Getting platform admin token...");

  // Try to login with default admin credentials
  try {
    const loginResponse = await fetch(`${BASE}/api/platform/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "admin123",
      }),
    });

    if (loginResponse.ok) {
      const data = await loginResponse.json();
      console.log("✅ Platform admin login successful");
      return data.token;
    } else {
      console.log("⚠️ Platform admin login failed, checking if admin exists...");
    }
  } catch (error) {
    console.log("⚠️ Login attempt failed:", error.message);
  }

  return null;
}

async function testSeeding() {
  console.log("🧪 Testing RBAC Seeding");
  console.log("======================\n");

  // Test server connection
  try {
    const healthResponse = await fetch(`${BASE}/api/health`);
    if (!healthResponse.ok) {
      throw new Error("Server health check failed");
    }
    console.log("✅ Server is running\n");
  } catch (error) {
    console.error("❌ Server connection failed:", error.message);
    console.log("\nPlease start the server with: npm run dev");
    return;
  }

  // Get platform admin token
  const token = await getOrCreatePlatformAdmin();

  if (!token) {
    console.log("\n❌ Unable to get platform admin token");
    console.log("Please run: npm run setup:platform-admin");
    console.log("Then set PLATFORM_ADMIN_TOKEN environment variable");
    return;
  }

  console.log("🔑 Token obtained successfully\n");

  // Test API access
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    // Check existing business types
    const btResponse = await fetch(`${BASE}/api/rbac-config/business-types`, { headers });
    if (btResponse.ok) {
      const businessTypes = await btResponse.json();
      console.log(`📊 Current business types: ${businessTypes.length}`);
    }

    // Check existing permission templates
    const ptResponse = await fetch(`${BASE}/api/rbac-config/permission-templates`, { headers });
    if (ptResponse.ok) {
      const templates = await ptResponse.json();
      console.log(`📋 Current permission templates: ${templates.length}`);
    }

    // Check existing default roles
    const drResponse = await fetch(`${BASE}/api/rbac-config/default-roles`, { headers });
    if (drResponse.ok) {
      const roles = await drResponse.json();
      console.log(`👥 Current default roles: ${roles.length}`);
    }
  } catch (error) {
    console.error("❌ API test failed:", error.message);
    return;
  }

  console.log("\n🌱 Ready to seed RBAC data!");
  console.log(`\nTo run seeding, use:`);
  console.log(`PLATFORM_ADMIN_TOKEN="${token}" npm run seed:rbac-quick`);

  // Set environment variable for this session
  process.env.PLATFORM_ADMIN_TOKEN = token;

  console.log("\n🚀 Running quick seeding now...\n");

  // Import and run the quick seeding script
  try {
    const { execSync } = await import("child_process");
    execSync("node scripts/seed-rbac-quick.mjs", {
      stdio: "inherit",
      env: { ...process.env, PLATFORM_ADMIN_TOKEN: token },
    });
  } catch (error) {
    console.error("❌ Seeding execution failed:", error.message);
  }
}

testSeeding().catch(error => {
  console.error("❌ Test failed:", error.message);
});
