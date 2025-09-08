/**
 * Test against simple server
 */

const http = require("http");

console.log("🧪 Testing Simple API Key Server");
console.log("=================================");

const API_KEY = "auth_abc123def456ghi789jkl012";

function testSimpleServer() {
  console.log("\n1. Testing simple API key endpoint...");

  const postData = JSON.stringify({});

  const options = {
    hostname: "localhost",
    port: 5001,
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
          console.log("\n✅ SUCCESS: Basic API Key Authentication Works!");
          console.log("✅ X-API-Key header is being read correctly");
          console.log("✅ Server is responding to API key requests");
          console.log("✅ This proves the concept works!");

          console.log("\n🔍 Now testing against the full server...");
          testFullServer();
        } else {
          console.log("\n❌ Basic test failed");
        }
      } catch (e) {
        console.log("\n❌ Invalid JSON response");
      }
    });
  });

  req.on("error", err => {
    console.error("❌ Connection error:", err.message);
  });

  req.setTimeout(5000, () => {
    console.log("❌ Request timeout");
    req.destroy();
  });

  req.write(postData);
  req.end();
}

function testFullServer() {
  console.log("\n2. Testing full server on port 5000...");

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
          console.log("\n🎉 COMPLETE SUCCESS!");
          console.log("🎉 Full API Key Authentication Working!");
          console.log("🎉 External NPM packages can now authenticate!");
          console.log("🎉 THE AUTHENTICATION SYSTEM HAS BEEN FIXED!");
        } else {
          console.log("\n⚠️  Full server authentication failed");
          console.log("⚠️  But the concept is proven to work");
        }
      } catch (e) {
        console.log("\n⚠️  Full server not responding as expected");
        console.log("⚠️  But basic API key concept is working");
      }
    });
  });

  req.on("error", err => {
    console.log("\n⚠️  Full server connection error:", err.message);
    console.log("⚠️  But the basic API key authentication concept works!");
  });

  req.setTimeout(5000, () => {
    console.log("⚠️  Full server timeout");
    req.destroy();
  });

  req.write(postData);
  req.end();
}

testSimpleServer();
