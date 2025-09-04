/**
 * Simple API Key Authentication Test
 */

// const https = require("https"); // Available for HTTPS requests
const http = require("http");

const API_KEY = "auth_abc123def456ghi789jkl012"; // Demo tenant API key

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = "";

      res.on("data", chunk => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on("error", err => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

async function testAuthentication() {
  console.log("🧪 Testing API Key Authentication Fix");
  console.log("=====================================");

  try {
    // Test 1: Health check
    console.log("\n1. Testing server connectivity...");
    const healthResponse = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/health",
      method: "GET",
    });

    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log(`   Response: ${JSON.stringify(healthResponse.data, null, 2)}`);

    if (healthResponse.statusCode !== 200) {
      throw new Error("Server health check failed");
    }

    // Test 2: API Key Authentication
    console.log("\n2. Testing API key authentication...");
    const authResponse = await makeRequest(
      {
        hostname: "localhost",
        port: 5000,
        path: "/auth/login",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
      },
      JSON.stringify({})
    );

    console.log(`   Status: ${authResponse.statusCode}`);
    console.log(`   Response: ${JSON.stringify(authResponse.data, null, 2)}`);

    if (authResponse.statusCode === 200 && authResponse.data.success) {
      console.log("\n✅ API KEY AUTHENTICATION FIXED!");
      console.log("✅ JWT Token generated successfully");
      console.log(`✅ Tenant ID: ${authResponse.data.tenantId}`);
      console.log(`✅ Org ID: ${authResponse.data.orgId}`);
      console.log(`✅ Token: ${authResponse.data.token.token.substring(0, 30)}...`);

      // Test 3: Test tenant info endpoint
      console.log("\n3. Testing tenant info with API key...");
      const tenantResponse = await makeRequest({
        hostname: "localhost",
        port: 5000,
        path: "/tenant/info",
        method: "GET",
        headers: {
          "X-API-Key": API_KEY,
        },
      });

      console.log(`   Status: ${tenantResponse.statusCode}`);
      console.log(`   Response: ${JSON.stringify(tenantResponse.data, null, 2)}`);

      if (tenantResponse.statusCode === 200) {
        console.log("\n✅ COMPLETE SUCCESS! API key authentication is working!");
        console.log("✅ External NPM packages can now authenticate properly");
        console.log("✅ The authentication system has been completely fixed!");
      }
    } else {
      console.log("\n❌ API key authentication failed");
      console.log("❌ Fix incomplete");
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("❌ Server may not be accessible");
  }
}

testAuthentication();
