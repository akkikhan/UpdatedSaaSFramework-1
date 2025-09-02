const http = require("http");

const TEST_API_KEY = "auth_abc123def456ghi789jkl012";
const BASE_URL = "http://localhost:5000";

async function makeRequest({ method, path, headers = {}, data }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: headers,
    };

    const req = http.request(options, res => {
      let body = "";
      res.on("data", chunk => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on("error", error => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testRBACOnly() {
  console.log("🧪 RBAC-Only Test");
  console.log("================");

  try {
    // First get auth token
    console.log("Getting auth token...");
    const authResponse = await makeRequest({
      method: "POST",
      path: "/auth/login",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": TEST_API_KEY,
      },
      data: {
        email: "admin@testauth.com",
        password: "temp123!",
      },
    });

    console.log(`Auth Status: ${authResponse.status}`);

    if (authResponse.status !== 200) {
      console.log("Auth failed, cannot test RBAC");
      return;
    }

    console.log("Auth successful, testing permission check...");

    // Test permission check
    const permissionResponse = await makeRequest({
      method: "POST",
      path: "/rbac/check-permission",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": TEST_API_KEY,
      },
      data: {
        userId: "1",
        permission: "read",
      },
    });

    console.log(`Permission Check Status: ${permissionResponse.status}`);
    console.log(`Response:`, JSON.stringify(permissionResponse.data, null, 2));
  } catch (error) {
    console.error("Test error:", error.message);
  }
}

testRBACOnly();
