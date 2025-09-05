import http from "http";

console.log("Testing basic HTTP connection...");

const req = http.get("http://127.0.0.1:5000/", res => {
  console.log(`✅ Connection successful! Status: ${res.statusCode}`);
  console.log("Headers:", res.headers);

  let data = "";
  res.on("data", chunk => (data += chunk));
  res.on("end", () => {
    console.log("Response body length:", data.length);
    console.log("First 200 chars:", data.substring(0, 200));

    // Now test the auth endpoint
    testAuthEndpoint();
  });
});

req.on("error", error => {
  console.log("💥 Connection failed:", error.message);
  console.log("Error code:", error.code);
  process.exit(1);
});

function testAuthEndpoint() {
  console.log("\n🔍 Testing auth endpoint...");

  const data = JSON.stringify({
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
      "X-API-Key": "auth_abc123def456ghi789jkl012",
      "Content-Length": Buffer.byteLength(data),
    },
  };

  const req = http.request(options, res => {
    console.log(`📤 Auth request status: ${res.statusCode}`);
    console.log("Response headers:", res.headers);

    let responseData = "";
    res.on("data", chunk => (responseData += chunk));
    res.on("end", () => {
      console.log("📋 Response body:", responseData);

      // Analysis
      if (res.statusCode === 200) {
        console.log("\n✅ SUCCESS: Authentication endpoint is working!");
      } else {
        console.log("\n❌ FAILURE: Authentication endpoint returned error");
        console.log("This confirms our NPM packages CANNOT authenticate with the server");
      }
    });
  });

  req.on("error", error => {
    console.log("💥 Auth request failed:", error.message);
  });

  req.write(data);
  req.end();
}
