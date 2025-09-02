const http = require("http");

console.log("🧪 COMPREHENSIVE MODULE VERIFICATION TEST");
console.log("==========================================");
console.log("Testing ALL modules for publishing readiness");
console.log("");

const TEST_API_KEY = "auth_abc123def456ghi789jkl012";
const TEST_EMAIL = "admin@testauth.com";
const TEST_PASSWORD = "temp123!";

let authToken = null;
let tenantInfo = null;

async function runComprehensiveTests() {
  console.log("📋 TESTING CHECKLIST:");
  console.log("1. Authentication Module (JWT)");
  console.log("2. RBAC Module (roles and permissions)");
  console.log("3. Logging Module (different levels)");
  console.log("4. Notifications Module (email SMTP)");
  console.log("5. UI Form Module Availability Check");
  console.log("6. NPM Package Publishing Readiness");
  console.log("");

  const results = {
    authentication: { tested: false, working: false, details: "" },
    rbac: { tested: false, working: false, details: "" },
    logging: { tested: false, working: false, details: "" },
    notifications: { tested: false, working: false, details: "" },
    uiModules: { tested: false, working: false, details: "" },
    npmPackages: { tested: false, working: false, details: "" },
  };

  // Test 1: Authentication Module
  console.log("🔐 TEST 1: Authentication Module (JWT)");
  console.log("=====================================");
  try {
    results.authentication.tested = true;

    // Test API key authentication
    const authResponse = await makeRequest({
      method: "POST",
      path: "/auth/login",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": TEST_API_KEY,
      },
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    console.log(`Auth Response Status: ${authResponse.status}`);

    if (authResponse.status === 200 && authResponse.data && authResponse.data.token) {
      authToken = authResponse.data.token;
      tenantInfo = authResponse.data.tenant;
      results.authentication.working = true;
      results.authentication.details = `JWT token generated: ${authResponse.data.token.substring(0, 20)}...`;
      console.log("✅ Authentication: JWT token generated successfully");
      console.log(`   Tenant: ${tenantInfo.name} (${tenantInfo.orgId})`);
      console.log(`   Enabled Modules: ${tenantInfo.enabledModules.join(", ")}`);
    } else {
      results.authentication.details = `Failed: Status ${authResponse.status} - ${JSON.stringify(authResponse.data)}`;
      console.log("❌ Authentication: Failed to generate JWT token");
      console.log(`   Response: ${JSON.stringify(authResponse.data)}`);
    }
  } catch (error) {
    results.authentication.details = `Error: ${error.message}`;
    console.log("❌ Authentication: Test error -", error.message);
  }
  console.log("");

  // Test 2: RBAC Module
  console.log("🛡️  TEST 2: RBAC Module (Roles and Permissions)");
  console.log("===============================================");
  try {
    results.rbac.tested = true;

    if (!authToken) {
      results.rbac.details = "Cannot test - no auth token available";
      console.log("❌ RBAC: Cannot test - authentication failed");
    } else {
      // Test role creation
      const roleResponse = await makeRequest({
        method: "POST",
        path: "/rbac/roles",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": TEST_API_KEY,
        },
        data: {
          name: "test-role",
          description: "Test role for verification",
          permissions: ["read", "write"],
        },
      });

      console.log(`Role Creation Status: ${roleResponse.status}`);

      if (roleResponse.status === 201 || roleResponse.status === 200) {
        // Test permission checking
        const permissionResponse = await makeRequest({
          method: "POST",
          path: "/rbac/check-permission",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": TEST_API_KEY,
          },
          data: {
            userId: "1", // Use a test user ID
            permission: "read",
          },
        });

        console.log(`Permission Check Status: ${permissionResponse.status}`);

        if (permissionResponse.status === 200) {
          results.rbac.working = true;
          results.rbac.details = "Role creation and permission checking working";
          console.log("✅ RBAC: Role creation and permission checking working");
        } else {
          results.rbac.details = `Permission check failed: ${permissionResponse.status}`;
          console.log("❌ RBAC: Permission checking failed");
        }
      } else {
        results.rbac.details = `Role creation failed: ${roleResponse.status}`;
        console.log("❌ RBAC: Role creation failed");
        console.log(`   Response: ${JSON.stringify(roleResponse.data)}`);
      }
    }
  } catch (error) {
    results.rbac.details = `Error: ${error.message}`;
    console.log("❌ RBAC: Test error -", error.message);
  }
  console.log("");

  // Test 3: Logging Module
  console.log("📝 TEST 3: Logging Module (Different Levels)");
  console.log("===========================================");
  try {
    results.logging.tested = true;

    if (!authToken) {
      results.logging.details = "Cannot test - no auth token available";
      console.log("❌ Logging: Cannot test - authentication failed");
    } else {
      // Test logging at different levels
      const logLevels = ["debug", "info", "warn", "error"];
      const logResults = [];

      for (const level of logLevels) {
        const logResponse = await makeRequest({
          method: "POST",
          path: "/logging/events",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": TEST_API_KEY,
          },
          data: {
            level: level,
            message: `Test ${level} log message`,
            source: "verification-test",
            metadata: { testRun: new Date().toISOString() },
          },
        });

        console.log(`${level.toUpperCase()} Log Status: ${logResponse.status}`);
        logResults.push({
          level,
          status: logResponse.status,
          working: logResponse.status === 200 || logResponse.status === 201,
        });
      }

      const workingLogs = logResults.filter(r => r.working);
      if (workingLogs.length === logLevels.length) {
        results.logging.working = true;
        results.logging.details = "All log levels working";
        console.log("✅ Logging: All log levels working");
      } else {
        results.logging.details = `Only ${workingLogs.length}/${logLevels.length} log levels working`;
        console.log(
          `⚠️  Logging: Only ${workingLogs.length}/${logLevels.length} log levels working`
        );
      }
    }
  } catch (error) {
    results.logging.details = `Error: ${error.message}`;
    console.log("❌ Logging: Test error -", error.message);
  }
  console.log("");

  // Test 4: Notifications/Email Module
  console.log("📧 TEST 4: Notifications Module (Email SMTP)");
  console.log("===========================================");
  try {
    results.notifications.tested = true;

    if (!authToken) {
      results.notifications.details = "Cannot test - no auth token available";
      console.log("❌ Notifications: Cannot test - authentication failed");
    } else {
      // Test email sending
      const emailResponse = await makeRequest({
        method: "POST",
        path: "/email/send",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": TEST_API_KEY,
        },
        data: {
          to: "test@example.com",
          subject: "Verification Test Email",
          text: "This is a test email to verify SMTP functionality",
          html: "<p>This is a test email to verify SMTP functionality</p>",
        },
      });

      console.log(`Email Send Status: ${emailResponse.status}`);

      if (emailResponse.status === 200 || emailResponse.status === 201) {
        results.notifications.working = true;
        results.notifications.details = "Email sending working";
        console.log("✅ Notifications: Email sending working");
      } else {
        results.notifications.details = `Email sending failed: ${emailResponse.status} - ${JSON.stringify(emailResponse.data)}`;
        console.log("❌ Notifications: Email sending failed");
        console.log(`   Response: ${JSON.stringify(emailResponse.data)}`);
      }
    }
  } catch (error) {
    results.notifications.details = `Error: ${error.message}`;
    console.log("❌ Notifications: Test error -", error.message);
  }
  console.log("");

  // Test 5: UI Module Availability Check
  console.log("🖥️  TEST 5: UI Form Module Availability");
  console.log("=====================================");
  try {
    results.uiModules.tested = true;

    // Check registration page to see what modules are offered to users
    const regPageResponse = await makeRequest({
      method: "GET",
      path: "/register",
      headers: {},
    });

    console.log(`Registration Page Status: ${regPageResponse.status}`);

    if (regPageResponse.status === 200) {
      // Look for module-related content in the response
      const pageContent =
        typeof regPageResponse.data === "string"
          ? regPageResponse.data
          : JSON.stringify(regPageResponse.data);

      const moduleCheckKeywords = [
        "authentication",
        "rbac",
        "logging",
        "notifications",
        "module",
        "checkbox",
        "select",
      ];
      const foundKeywords = moduleCheckKeywords.filter(keyword =>
        pageContent.toLowerCase().includes(keyword.toLowerCase())
      );

      results.uiModules.details = `Registration page loaded. Found keywords: ${foundKeywords.join(", ")}`;
      results.uiModules.working = foundKeywords.length > 2; // Basic threshold

      console.log(
        `Registration page loaded. Found module-related keywords: ${foundKeywords.join(", ")}`
      );
      if (foundKeywords.length > 2) {
        console.log("✅ UI Modules: Registration page appears to have module selection");
      } else {
        console.log("⚠️  UI Modules: Registration page may not have proper module selection");
      }
    } else {
      results.uiModules.details = `Registration page failed: ${regPageResponse.status}`;
      console.log("❌ UI Modules: Registration page not accessible");
    }
  } catch (error) {
    results.uiModules.details = `Error: ${error.message}`;
    console.log("❌ UI Modules: Test error -", error.message);
  }
  console.log("");

  // Test 6: NPM Package Publishing Readiness
  console.log("📦 TEST 6: NPM Package Publishing Readiness");
  console.log("==========================================");
  try {
    results.npmPackages.tested = true;

    // This is a placeholder - would need to check package.json files, build process, etc.
    // For now, checking if auth package exists and has proper structure
    results.npmPackages.details =
      "Cannot verify without examining package.json and build artifacts";
    console.log("⚠️  NPM Packages: Cannot verify build readiness without examining package files");
  } catch (error) {
    results.npmPackages.details = `Error: ${error.message}`;
    console.log("❌ NPM Packages: Test error -", error.message);
  }
  console.log("");

  // Final Summary
  console.log("📊 FINAL VERIFICATION RESULTS");
  console.log("=============================");

  const testedModules = Object.keys(results).filter(key => results[key].tested);
  const workingModules = Object.keys(results).filter(
    key => results[key].tested && results[key].working
  );

  console.log(`Modules Tested: ${testedModules.length}/6`);
  console.log(`Modules Working: ${workingModules.length}/${testedModules.length}`);
  console.log("");

  for (const [module, result] of Object.entries(results)) {
    const status = result.tested ? (result.working ? "✅ PASS" : "❌ FAIL") : "⚪ NOT TESTED";
    console.log(`${module.toUpperCase()}: ${status}`);
    console.log(`   Details: ${result.details}`);
  }

  console.log("");
  console.log("🎯 PUBLISHING READINESS ASSESSMENT:");

  if (workingModules.length === testedModules.length && testedModules.length >= 4) {
    console.log("🟢 POTENTIALLY READY - All tested modules working");
    console.log("⚠️  Still need to verify NPM package build process");
  } else {
    console.log("🔴 NOT READY - Some modules not working or not tested");
    console.log(`Missing/Broken: ${6 - workingModules.length} modules`);
  }

  return results;
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

// Run the comprehensive tests
runComprehensiveTests().catch(console.error);
