const http = require("http");

console.log("🔍 Checking for existing tenants and creating test tenant if needed...");

async function checkAndCreateTestTenant() {
  try {
    // First, try to get all tenants to see what exists
    console.log("1. Checking existing tenants via platform admin API...");

    // We need platform admin access for this, let's try a different approach
    // Let's use the register endpoint to create our test tenant

    console.log("2. Creating test tenant via public registration...");

    const response = await makeRequest({
      method: "POST",
      path: "/api/register",
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        name: "Test Auth Company",
        orgId: "test-auth-company",
        adminEmail: "admin@testauth.com",
        adminName: "Test Admin",
        adminPassword: "temp123!",
        enabledModules: ["auth", "users", "rbac"],
      },
    });

    console.log("Registration response status:", response.status);
    console.log("Registration response data:", response.data);

    if (response.status === 201) {
      console.log("✅ Test tenant created successfully");
      console.log("⚠️ Now need to manually update the authApiKey in the database");
      console.log(
        "The tenant was created but has a different API key than our test key: auth_abc123def456ghi789jkl012"
      );

      // Now try our authentication test again
      console.log("3. Testing authentication with the test API key...");

      const authResponse = await makeRequest({
        method: "POST",
        path: "/auth/login",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "auth_abc123def456ghi789jkl012",
        },
        data: {
          email: "admin@testauth.com",
          password: "temp123!",
        },
      });

      console.log("Auth test response status:", authResponse.status);
      console.log("Auth test response data:", authResponse.data);
    } else if (
      response.status === 400 &&
      response.data &&
      response.data.message === "Organization ID already exists"
    ) {
      console.log("✅ Test tenant already exists");

      // Try authentication
      console.log("3. Testing authentication with existing tenant...");

      const authResponse = await makeRequest({
        method: "POST",
        path: "/auth/login",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "auth_abc123def456ghi789jkl012",
        },
        data: {
          email: "admin@testauth.com",
          password: "temp123!",
        },
      });

      console.log("Auth test response status:", authResponse.status);
      console.log("Auth test response data:", authResponse.data);
    } else {
      console.log("❌ Unexpected response:", response);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const data = options.data ? JSON.stringify(options.data) : null;

    const requestOptions = {
      hostname: "localhost",
      port: 5000,
      path: options.path,
      method: options.method,
      headers: options.headers || {},
    };

    if (data) {
      requestOptions.headers["Content-Length"] = Buffer.byteLength(data);
    }

    const req = http.request(requestOptions, res => {
      let responseData = "";

      res.on("data", chunk => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : null;
          resolve({
            status: res.statusCode,
            data: parsedData,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData,
          });
        }
      });
    });

    req.on("error", error => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

checkAndCreateTestTenant();
