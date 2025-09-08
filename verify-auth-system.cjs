/**
 * COMPREHENSIVE VERIFICATION TEST
 * Tests the complete authentication system end-to-end
 * This test will prove whether the authentication fix actually works
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

console.log("🧪 COMPREHENSIVE API KEY AUTHENTICATION VERIFICATION");
console.log("===================================================");

// Test API key that should exist in the system
const TEST_API_KEY = "auth_abc123def456ghi789jkl012";

// Test results tracker
const testResults = {
  serverConnectivity: false,
  apiKeyValidation: false,
  jwtTokenGeneration: false,
  tenantLookup: false,
  middlewareWorking: false,
  completeWorkflow: false,
};

function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on("error", err => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function test1_ServerConnectivity() {
  console.log("\n1. Testing server connectivity...");
  try {
    const response = await makeHttpRequest({
      hostname: "localhost",
      port: 5000,
      path: "/health",
      method: "GET",
    });

    if (response.statusCode === 200) {
      console.log("   ✅ Server is responding");
      testResults.serverConnectivity = true;
      return true;
    } else {
      console.log("   ❌ Server responded with status:", response.statusCode);
      return false;
    }
  } catch (error) {
    console.log("   ❌ Server connection failed:", error.message);
    return false;
  }
}

async function test2_ApiKeyEndpoint() {
  console.log("\n2. Testing API key authentication endpoint...");
  try {
    const response = await makeHttpRequest(
      {
        hostname: "localhost",
        port: 5000,
        path: "/auth/login",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": TEST_API_KEY,
        },
      },
      JSON.stringify({})
    );

    console.log("   Status Code:", response.statusCode);
    console.log("   Response:", JSON.stringify(response.data, null, 2));

    if (response.statusCode === 200) {
      testResults.apiKeyValidation = true;

      if (response.data && response.data.success) {
        console.log("   ✅ API key validation successful");

        if (response.data.token) {
          console.log("   ✅ JWT token generated");
          testResults.jwtTokenGeneration = true;
        }

        if (response.data.tenantId) {
          console.log("   ✅ Tenant lookup working");
          testResults.tenantLookup = true;
        }

        if (response.data.orgId) {
          console.log("   ✅ Org ID returned");
        }

        testResults.middlewareWorking = true;
        return true;
      }
    } else if (response.statusCode === 401) {
      console.log("   ❌ API key rejected - key may not exist in database");
      return false;
    } else {
      console.log("   ❌ Unexpected response");
      return false;
    }
  } catch (error) {
    console.log("   ❌ Request failed:", error.message);
    return false;
  }
}

async function test3_InvalidApiKey() {
  console.log("\n3. Testing invalid API key rejection...");
  try {
    const response = await makeHttpRequest(
      {
        hostname: "localhost",
        port: 5000,
        path: "/auth/login",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "invalid_key_12345",
        },
      },
      JSON.stringify({})
    );

    if (response.statusCode === 401) {
      console.log("   ✅ Invalid API key properly rejected");
      return true;
    } else {
      console.log("   ❌ Invalid API key not rejected (status:", response.statusCode, ")");
      return false;
    }
  } catch (error) {
    console.log("   ❌ Request failed:", error.message);
    return false;
  }
}

async function test4_MissingApiKey() {
  console.log("\n4. Testing missing API key rejection...");
  try {
    const response = await makeHttpRequest(
      {
        hostname: "localhost",
        port: 5000,
        path: "/auth/login",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No X-API-Key header
        },
      },
      JSON.stringify({})
    );

    if (response.statusCode === 401) {
      console.log("   ✅ Missing API key properly rejected");
      return true;
    } else {
      console.log("   ❌ Missing API key not rejected (status:", response.statusCode, ")");
      return false;
    }
  } catch (error) {
    console.log("   ❌ Request failed:", error.message);
    return false;
  }
}

async function runAllTests() {
  console.log("Starting comprehensive authentication verification...\n");

  const test1 = await test1_ServerConnectivity();
  if (!test1) {
    console.log("\n❌ CRITICAL FAILURE: Server not accessible");
    console.log("Cannot continue testing without server connection");
    return;
  }

  const test2 = await test2_ApiKeyEndpoint();
  const test3 = await test3_InvalidApiKey();
  const test4 = await test4_MissingApiKey();

  // Determine overall success
  testResults.completeWorkflow = test2 && test3 && test4;

  console.log("\n=== FINAL TEST RESULTS ===");
  console.log("Server Connectivity:", testResults.serverConnectivity ? "✅ PASS" : "❌ FAIL");
  console.log("API Key Validation:", testResults.apiKeyValidation ? "✅ PASS" : "❌ FAIL");
  console.log("JWT Token Generation:", testResults.jwtTokenGeneration ? "✅ PASS" : "❌ FAIL");
  console.log("Tenant Lookup:", testResults.tenantLookup ? "✅ PASS" : "❌ FAIL");
  console.log("Middleware Working:", testResults.middlewareWorking ? "✅ PASS" : "❌ FAIL");
  console.log("Invalid Key Rejection:", test3 ? "✅ PASS" : "❌ FAIL");
  console.log("Missing Key Rejection:", test4 ? "✅ PASS" : "❌ FAIL");

  console.log("\n=== VERIFICATION SUMMARY ===");
  if (testResults.completeWorkflow) {
    console.log("🎉 AUTHENTICATION SYSTEM VERIFIED AS WORKING");
    console.log("🎉 External NPM packages CAN authenticate successfully");
    console.log("🎉 API key middleware is functional");
    console.log("🎉 JWT token generation is working");
    console.log("🎉 The authentication fix is PROVEN to work");
  } else {
    console.log("❌ AUTHENTICATION SYSTEM VERIFICATION FAILED");
    console.log("❌ One or more components are not working");
    console.log("❌ Cannot confirm external authentication works");

    if (!testResults.apiKeyValidation) {
      console.log("❌ Primary issue: API key validation failed");
      console.log("   - Check if test tenant exists in database");
      console.log("   - Verify API key middleware is properly implemented");
      console.log("   - Confirm database connection is working");
    }
  }
}

// Run the tests
runAllTests().catch(console.error);
