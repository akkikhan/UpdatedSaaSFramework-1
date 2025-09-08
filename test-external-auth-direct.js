/**
 * FUNCTIONAL VERIFICATION: External Developer Authentication Test
 * This simulates an external developer using our NPM package to authenticate
 */

import http from "http";

console.log("🔍 FUNCTIONAL VERIFICATION: External Developer Authentication Test");
console.log("================================================");

// Simulate what our NPM package @saas-framework/auth does
function testExternalAuthentication() {
  const apiKey = "auth_abc123def456ghi789jkl012"; // Simulated API key
  const requestData = JSON.stringify({
    email: "test@example.com",
    password: "testpass123",
    tenantId: "test-tenant",
  });

  const options = {
    hostname: "127.0.0.1",
    port: 5000,
    path: "/auth/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey, // This is what our NPM package sends
      "Content-Length": Buffer.byteLength(requestData),
    },
  };

  console.log("📤 Sending Request:");
  console.log(`   URL: http://127.0.0.1:5000/auth/login`);
  console.log(`   Method: POST`);
  console.log(`   Headers:`, options.headers);
  console.log(`   Body:`, requestData);
  console.log("");

  const req = http.request(options, res => {
    console.log("📥 Server Response:");
    console.log(`   Status Code: ${res.statusCode}`);
    console.log(`   Headers:`, res.headers);
    console.log("");

    let responseBody = "";
    res.on("data", chunk => {
      responseBody += chunk;
    });

    res.on("end", () => {
      console.log("📋 Response Body:");
      console.log(responseBody);
      console.log("");

      // Analysis
      if (res.statusCode === 200) {
        console.log("✅ SUCCESS: External authentication worked!");
      } else {
        console.log("❌ FAILURE: External authentication failed");
        console.log(`   Expected: Status 200 with auth token`);
        console.log(`   Received: Status ${res.statusCode}`);
      }

      // Check if API key was validated
      try {
        const response = JSON.parse(responseBody);
        if (response.error && response.error.includes("API key")) {
          console.log("🔑 API Key Validation: Server rejected API key");
        } else if (response.token) {
          console.log("🔑 API Key Validation: Server accepted API key and returned token");
        } else {
          console.log("🔑 API Key Validation: Unclear - no specific API key error or token");
        }
      } catch (e) {
        console.log("🔑 API Key Validation: Unable to parse response");
      }
    });
  });

  req.on("error", error => {
    console.log("💥 CONNECTION ERROR:");
    console.log(`   ${error.message}`);
    console.log("   Server may not be running or accessible");
  });

  req.write(requestData);
  req.end();
}

// Test server connectivity first
function testServerConnectivity() {
  const options = {
    hostname: "127.0.0.1",
    port: 5000,
    path: "/",
    method: "GET",
  };

  console.log("🌐 Testing server connectivity...");

  const req = http.request(options, res => {
    console.log(`✅ Server is reachable (Status: ${res.statusCode})`);
    console.log("");
    console.log("🔄 Proceeding with authentication test...");
    console.log("");
    testExternalAuthentication();
  });

  req.on("error", error => {
    console.log("💥 SERVER NOT REACHABLE:");
    console.log(`   ${error.message}`);
    console.log("   Please ensure server is running on port 5000");
    process.exit(1);
  });

  req.end();
}

// Start the test
testServerConnectivity();
