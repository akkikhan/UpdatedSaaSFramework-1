/**
 * External API Key Test - No project dependencies
 */

const http = require("http");

console.log("🧪 External API Key Authentication Test");
console.log("======================================");

const API_KEY = "auth_abc123def456ghi789jkl012";

function test() {
  console.log("\n1. Testing API key authentication...");

  const postData = JSON.stringify({});

  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/auth/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
      "X-API-Key": API_KEY,
    },
  };

  const req = http.request(options, res => {
    let data = "";

    res.on("data", chunk => {
      data += chunk;
    });

    res.on("end", () => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log("Response:", data);

      try {
        const parsed = JSON.parse(data);
        if (res.statusCode === 200 && parsed.success) {
          console.log("\n✅ SUCCESS: API Key Authentication Working!");
          console.log("✅ JWT Token Generated:", parsed.token ? "Yes" : "No");
          console.log("✅ Tenant ID:", parsed.tenantId);
          console.log("✅ Fix Complete: External NPM packages can now authenticate!");
        } else {
          console.log("\n❌ Authentication failed");
        }
      } catch (e) {
        console.log("\n❌ Invalid JSON response");
      }
    });
  });

  req.on("error", err => {
    console.error("❌ Connection error:", err.message);
    console.log("Make sure the server is running on port 5000");
  });

  req.setTimeout(5000, () => {
    console.log("❌ Request timeout");
    req.destroy();
  });

  req.write(postData);
  req.end();
}

test();
