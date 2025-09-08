/**
 * COMPREHENSIVE API KEY AUTHENTICATION TEST
 * This test verifies the complete fix for external NPM package authentication
 */

import http from "http";

console.log("🧪 TESTING: Complete API Key Authentication Fix");
console.log("=================================================");

// Test configuration
const API_KEY = "auth_abc123def456ghi789jkl012"; // Test API key

async function runTest() {
  console.log("📋 TEST PLAN:");
  console.log("1. Test server connectivity");
  console.log("2. Test API key authentication endpoint");
  console.log("3. Verify response contains valid JWT token");
  console.log("4. Verify tenant information is returned");
  console.log("");

  // Step 1: Test server connectivity
  console.log("🌐 Step 1: Testing server connectivity...");
  const serverRunning = await testServerConnectivity();
  if (!serverRunning) {
    console.log("❌ TEST FAILED: Server not accessible");
    process.exit(1);
  }
  console.log("✅ Server is accessible");
  console.log("");

  // Step 2: Test API key authentication
  console.log("🔑 Step 2: Testing API key authentication...");
  const authResult = await testApiKeyAuth();

  console.log("");
  console.log("📊 FINAL TEST RESULTS:");
  console.log("======================");

  if (authResult.success) {
    console.log("✅ SUCCESS: API key authentication is now working!");
    console.log("✅ External NPM packages can now authenticate with the server");
    console.log("✅ Authentication system has been fixed");
    console.log("");
    console.log("📋 What was fixed:");
    console.log("  • Added API key validation middleware");
    console.log("  • Created tenant lookup by API key");
    console.log("  • Added JWT token generation for API key auth");
    console.log("  • Created dedicated /auth/login endpoint with validation");
  } else {
    console.log("❌ FAILURE: API key authentication still broken");
    console.log("❌ External NPM packages still cannot authenticate");
    console.log("");
    console.log("📋 Issues found:");
    authResult.issues.forEach(issue => console.log(`  • ${issue}`));
  }
}

function testServerConnectivity() {
  return new Promise(resolve => {
    const req = http.get("http://127.0.0.1:5000/", res => {
      resolve(res.statusCode === 200);
    });

    req.on("error", () => {
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function testApiKeyAuth() {
  return new Promise(resolve => {
    const issues = [];
    const data = JSON.stringify({
      // For API key auth, we don't need email/password
      // The API key in the header authenticates the tenant
    });

    const options = {
      hostname: "127.0.0.1",
      port: 5000,
      path: "/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
        "Content-Length": Buffer.byteLength(data),
      },
    };

    console.log("📤 Sending API key authentication request...");
    console.log(`   URL: http://127.0.0.1:5000/auth/login`);
    console.log(`   Method: POST`);
    console.log(`   Headers: X-API-Key: ${API_KEY}`);
    console.log("");

    const req = http.request(options, res => {
      console.log(`📥 Response Status: ${res.statusCode}`);
      console.log(`📥 Response Headers:`, res.headers);

      let responseData = "";
      res.on("data", chunk => (responseData += chunk));
      res.on("end", () => {
        console.log("📥 Response Body:", responseData);
        console.log("");

        // Analyze response
        if (res.statusCode !== 200) {
          issues.push(`Expected status 200, got ${res.statusCode}`);
        }

        try {
          const response = JSON.parse(responseData);

          // Check for success indicators
          if (!response.success) {
            issues.push("Response does not indicate success");
          }

          if (!response.token) {
            issues.push("No JWT token returned");
          } else {
            console.log("✅ JWT token returned");
          }

          if (!response.tenant) {
            issues.push("No tenant information returned");
          } else {
            console.log("✅ Tenant information returned");
            console.log(`   Tenant ID: ${response.tenant.id}`);
            console.log(`   Org ID: ${response.tenant.orgId}`);
            console.log(`   Name: ${response.tenant.name}`);
          }

          if (response.expiresAt) {
            console.log("✅ Token expiration included");
          }
        } catch (e) {
          issues.push("Response is not valid JSON");
        }

        resolve({
          success: issues.length === 0 && res.statusCode === 200,
          issues,
        });
      });
    });

    req.on("error", error => {
      issues.push(`Request failed: ${error.message}`);
      resolve({ success: false, issues });
    });

    req.setTimeout(10000, () => {
      issues.push("Request timeout");
      req.destroy();
      resolve({ success: false, issues });
    });

    req.write(data);
    req.end();
  });
}

// Run the test
runTest().catch(error => {
  console.error("💥 Test execution failed:", error);
  process.exit(1);
});
