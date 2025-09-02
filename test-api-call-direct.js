// Test the actual API call with the corrected data structure
const fetch = require("node-fetch");

const testData = {
  name: "Test Company API",
  orgId: "test-api-call",
  adminEmail: "test@primussoft.com",
  sendEmail: true,
  enabledModules: ["auth", "rbac", "logging"],
  moduleConfigs: {
    auth: {
      providers: [
        {
          type: "azure-ad",
          name: "Azure Ad",
          priority: 1,
          config: {
            tenantId: "test-tenant-id",
            clientId: "test-client-id",
          },
          userMapping: {
            emailField: "email",
            nameField: "name",
          },
          enabled: true,
        },
        {
          type: "local",
          name: "Local",
          priority: 2,
          config: {
            secretKey: "test-secret",
          },
          userMapping: {
            emailField: "email",
            nameField: "name",
          },
          enabled: true,
        },
      ],
    },
    rbac: {
      defaultRoles: ["admin", "user"],
    },
    logging: {
      levels: ["error", "warn", "info"],
    },
  },
  metadata: {
    adminName: "Test Admin",
    companyWebsite: "https://test.com",
  },
};

async function testApiCall() {
  try {
    console.log("🚀 Testing API call with transformed data...");
    console.log(JSON.stringify(testData, null, 2));

    const response = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    const result = await response.text();

    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📋 Response Body: ${result}`);

    if (response.status === 200 || response.status === 201) {
      console.log("✅ SUCCESS: Tenant created successfully!");
    } else {
      console.log("❌ FAILED: API returned error");
      try {
        const errorData = JSON.parse(result);
        console.log("🔍 Error Details:", JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.log("🔍 Raw Error:", result);
      }
    }
  } catch (error) {
    console.error("💥 Request failed:", error.message);
  }
}

testApiCall();
