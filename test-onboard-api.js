// Test OnBoard API functionality
const fetch = require("node-fetch");

async function testOnboardAPI() {
  console.log("Testing OnBoard API functionality...\n");

  // Test data for creating a tenant
  const testData = {
    name: "Test Company",
    orgId: "test-company-001",
    adminEmail: "test@example.com",
    adminName: "Test Admin",
    sendEmail: false, // Don't actually send email for testing
    enabledModules: ["auth", "rbac"],
    moduleConfigs: {
      auth: {
        providers: ["local"],
      },
      rbac: {
        defaultRoles: ["admin", "user"],
      },
    },
    metadata: {
      adminName: "Test Admin",
      companyWebsite: "https://test.example.com",
    },
  };

  try {
    // First, check if the API is reachable
    console.log("1. Checking API health...");
    const healthResponse = await fetch("http://localhost:5000/api/health");
    const healthData = await healthResponse.json();
    console.log("Health Check:", healthData);
    console.log("");

    // Try to create a tenant without auth (should fail)
    console.log("2. Attempting to create tenant without authentication (should fail)...");
    const noAuthResponse = await fetch("http://localhost:5000/api/tenants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    console.log("Response Status:", noAuthResponse.status);
    const noAuthData = await noAuthResponse.text();
    console.log("Response:", noAuthData);
    console.log("");

    // Check if we need platform admin authentication
    if (noAuthResponse.status === 401 || noAuthResponse.status === 403) {
      console.log("✓ API correctly requires platform admin authentication");
      console.log("");
      console.log("To fix the OnBoard button issue:");
      console.log("1. Make sure you are logged in as a platform admin");
      console.log(
        "2. Platform admin emails configured in .env:",
        "akki@primussoft.com, khan.aakib@outlook.com, admin@primussoft.com"
      );
      console.log("3. You can login at: http://localhost:5000/admin/login");
      console.log("");
      console.log("If you need to create a platform admin account, run:");
      console.log("npm run setup:platform-admin");
    } else if (noAuthResponse.status === 400) {
      console.log("✗ Validation error - check the request data");
    } else if (noAuthResponse.status === 201) {
      console.log("✓ Tenant created successfully!");
      console.log("API keys should have been generated.");
    }
  } catch (error) {
    console.error("Error testing API:", error.message);
    console.log("");
    console.log("Possible issues:");
    console.log("1. Server is not running - run: npm run dev");
    console.log("2. Port 5000 is blocked or in use by another application");
    console.log("3. Database connection issue - check DATABASE_URL in .env");
  }
}

// Run the test
testOnboardAPI();
