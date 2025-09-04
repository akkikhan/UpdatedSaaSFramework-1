const http = require("http");

console.log("🔧 Updating test tenant with the correct API key...");

async function updateTestTenantApiKey() {
  try {
    // We need to update the tenant's authApiKey to 'auth_abc123def456ghi789jkl012'
    // Since we don't have a direct API for this, let's try via platform admin API

    console.log("Looking for platform admin update endpoint...");

    // First, we need to get a platform admin token
    // For now, let's use a simple SQL update approach via debug endpoint

    // Let's test if our API key works now
    console.log("Testing current API key before update...");

    const testResponse = await makeRequest({
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

    console.log("Current API key test status:", testResponse.status);
    console.log("Current API key test data:", testResponse.data);

    if (testResponse.status === 401) {
      console.log("❌ API key still not working, need to update database");
      console.log("");
      console.log("MANUAL STEP REQUIRED:");
      console.log("");
      console.log("Please run this SQL command to update the tenant API key:");
      console.log("");
      console.log(
        "UPDATE tenants SET auth_api_key = 'auth_abc123def456ghi789jkl012' WHERE org_id = 'test-auth-company';"
      );
      console.log("");
      console.log("Or use the database admin interface to update the tenant record.");
      console.log("");

      // Let's create a simple SQL script file
      const fs = require("fs");
      const sqlScript = `-- Update test tenant API key
UPDATE tenants SET auth_api_key = 'auth_abc123def456ghi789jkl012' WHERE org_id = 'test-auth-company';

-- Verify the update
SELECT id, name, org_id, auth_api_key, status FROM tenants WHERE org_id = 'test-auth-company';
`;

      fs.writeFileSync("update-test-tenant-api-key.sql", sqlScript);
      console.log("✅ SQL script created: update-test-tenant-api-key.sql");
    } else {
      console.log("✅ API key is already working!");
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

updateTestTenantApiKey();
