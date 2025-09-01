// Test script for Platform Admin APIs
// This script tests all PA-specific endpoints to ensure they work with authentication

const API_BASE = "http://localhost:5000";

// Function to test API endpoints
async function testPlatformAdminAPIs(token) {
  console.log("\n========================================");
  console.log("🧪 TESTING PLATFORM ADMIN APIs");
  console.log("========================================\n");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // List of all Platform Admin APIs
  const apis = [
    {
      name: "Verify Token",
      method: "GET",
      endpoint: "/api/platform/auth/verify",
      protected: true,
    },
    {
      name: "Get Stats",
      method: "GET",
      endpoint: "/api/stats",
      protected: true,
    },
    {
      name: "Get Recent Tenants",
      method: "GET",
      endpoint: "/api/tenants/recent?limit=5",
      protected: true,
    },
    {
      name: "Get All Tenants",
      method: "GET",
      endpoint: "/api/tenants",
      protected: true,
    },
    {
      name: "Get Health Status",
      method: "GET",
      endpoint: "/api/health",
      protected: false, // Public endpoint
    },
  ];

  // Test each API
  for (const api of apis) {
    console.log(`\n📍 Testing: ${api.name}`);
    console.log(`   Endpoint: ${api.method} ${api.endpoint}`);
    console.log(`   Protected: ${api.protected ? "Yes" : "No"}`);

    try {
      const response = await fetch(`${API_BASE}${api.endpoint}`, {
        method: api.method,
        headers: api.protected ? headers : {},
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success! Response:`);
        console.log(`   ${JSON.stringify(data, null, 2).split("\n").slice(0, 5).join("\n   ")}`);
      } else {
        const error = await response.text();
        console.log(`   ❌ Failed: ${error}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

// Test CRUD operations
async function testTenantCRUD(token) {
  console.log("\n========================================");
  console.log("🧪 TESTING TENANT CRUD OPERATIONS");
  console.log("========================================\n");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 1. CREATE a test tenant
  console.log("1️⃣ CREATE - Creating new tenant...");
  const createData = {
    orgId: `test-org-${Date.now()}`,
    name: "Test Organization",
    adminEmail: "test@example.com",
    enabledModules: ["auth", "rbac"],
    moduleConfigs: {},
    sendEmail: false,
  };

  try {
    const createResponse = await fetch(`${API_BASE}/api/tenants`, {
      method: "POST",
      headers,
      body: JSON.stringify(createData),
    });

    if (createResponse.ok) {
      const tenant = await createResponse.json();
      console.log(`   ✅ Created tenant: ${tenant.name} (ID: ${tenant.id})`);

      // 2. READ - Get the tenant
      console.log("\n2️⃣ READ - Fetching tenant by orgId...");
      const getResponse = await fetch(`${API_BASE}/api/tenants/by-org-id/${tenant.orgId}`, {
        headers,
      });

      if (getResponse.ok) {
        const fetchedTenant = await getResponse.json();
        console.log(`   ✅ Fetched tenant: ${fetchedTenant.name}`);
      }

      // 3. UPDATE - Update tenant status
      console.log("\n3️⃣ UPDATE - Updating tenant status to active...");
      const updateResponse = await fetch(`${API_BASE}/api/tenants/${tenant.id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "active" }),
      });

      if (updateResponse.ok) {
        console.log(`   ✅ Updated tenant status to active`);
      }

      // 4. LIST - Get all tenants
      console.log("\n4️⃣ LIST - Fetching all tenants...");
      const listResponse = await fetch(`${API_BASE}/api/tenants`, {
        headers,
      });

      if (listResponse.ok) {
        const tenants = await listResponse.json();
        console.log(`   ✅ Found ${tenants.length} tenants`);
      }
    } else {
      const error = await createResponse.text();
      console.log(`   ❌ Failed to create tenant: ${error}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

// Test session persistence
async function testSessionPersistence(token) {
  console.log("\n========================================");
  console.log("🧪 TESTING SESSION PERSISTENCE");
  console.log("========================================\n");

  console.log("1. Testing with valid token...");
  const response1 = await fetch(`${API_BASE}/api/platform/auth/verify`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(
    `   Status: ${response1.status} - ${response1.ok ? "✅ Token valid" : "❌ Token invalid"}`
  );

  console.log("\n2. Testing without token (should fail)...");
  const response2 = await fetch(`${API_BASE}/api/stats`);
  console.log(
    `   Status: ${response2.status} - ${response2.status === 401 ? "✅ Correctly rejected" : "❌ Should have been rejected"}`
  );

  console.log("\n3. Testing token refresh...");
  const refreshResponse = await fetch(`${API_BASE}/api/platform/auth/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (refreshResponse.ok) {
    const data = await refreshResponse.json();
    console.log(`   ✅ Token refreshed successfully`);
    return data.token;
  } else {
    console.log(`   ❌ Token refresh failed`);
    return token;
  }
}

// Main test function
async function runTests() {
  // Check if token is provided or in localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token") || localStorage.getItem("platformAdminToken");

  if (!token) {
    console.error("❌ No platform admin token found!");
    console.log("Please login first at: http://localhost:5000/admin/login");
    return;
  }

  console.log("🔑 Token found:", token.substring(0, 20) + "...");

  // Run all tests
  await testPlatformAdminAPIs(token);
  await testTenantCRUD(token);
  const newToken = await testSessionPersistence(token);

  // Store the new token if refreshed
  if (newToken !== token) {
    localStorage.setItem("platformAdminToken", newToken);
    console.log("\n✅ New token stored in localStorage");
  }

  console.log("\n========================================");
  console.log("✅ ALL TESTS COMPLETED");
  console.log("========================================");
}

// Run tests when script loads
runTests();
