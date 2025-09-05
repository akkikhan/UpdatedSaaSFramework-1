const http = require("http");

console.log("🔧 Creating test tenant with API key via API call...");

async function createTestTenantViaAPI() {
  try {
    // First check if tenant exists by making a test API call
    console.log("Checking if test tenant already exists...");

    const checkResponse = await makeRequest({
      method: "POST",
      path: "/auth/login",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "auth_abc123def456ghi789jkl012",
      },
      data: {
        email: "test@example.com",
        password: "test123",
      },
    });

    console.log("Test tenant check response:", checkResponse.status);

    if (checkResponse.status === 500) {
      console.log("❌ Test tenant does not exist, need to create it");

      // Create tenant via registration API
      console.log("Attempting to create test tenant...");

      const createResponse = await makeRequest({
        method: "POST",
        path: "/api/public/tenant-registration",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          name: "Test Auth Company",
          orgId: "test-auth-company",
          contactEmail: "admin@testauth.com",
          businessType: "technology",
          enabledModules: ["auth", "users", "rbac"],
        },
      });

      console.log("Tenant creation response:", createResponse.status, createResponse.data);

      if (createResponse.status === 201) {
        console.log("✅ Test tenant created successfully");

        // Now we need to manually set the API key in the database
        console.log("⚠️ Need to manually update the API key for this tenant");
        console.log(
          "The tenant was created but needs the specific API key: auth_abc123def456ghi789jkl012"
        );
      } else {
        console.log("❌ Failed to create test tenant");
      }
    } else if (checkResponse.status === 401) {
      console.log(
        "✅ Test tenant exists but authentication failed (expected for wrong credentials)"
      );
    } else {
      console.log("⚠️ Unexpected response status:", checkResponse.status);
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

createTestTenantViaAPI();
