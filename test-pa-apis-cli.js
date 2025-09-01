// Test Platform Admin APIs from command line
// Usage: node test-pa-apis-cli.js [token]

const API_BASE = "http://localhost:5000";

// Get token from command line or use a test token
const token = process.argv[2];

if (!token) {
  console.error("❌ Please provide a token as argument");
  console.log("Usage: node test-pa-apis-cli.js <token>");
  console.log("\nTo get a token:");
  console.log("1. Login at http://localhost:5000/admin/login");
  console.log('2. Open browser console and run: localStorage.getItem("platformAdminToken")');
  process.exit(1);
}

console.log("\n🔑 Testing with token:", token.substring(0, 30) + "...\n");

// Test all Platform Admin APIs
async function testAPIs() {
  const apis = [
    { name: "Verify Token", method: "GET", path: "/api/platform/auth/verify" },
    { name: "Get Stats", method: "GET", path: "/api/stats" },
    { name: "Get Recent Tenants", method: "GET", path: "/api/tenants/recent?limit=5" },
    { name: "Get All Tenants", method: "GET", path: "/api/tenants" },
    { name: "Get Health (Public)", method: "GET", path: "/api/health", public: true },
  ];

  for (const api of apis) {
    console.log(`\n📍 Testing: ${api.name}`);
    console.log(`   ${api.method} ${api.path}`);

    try {
      const headers = api.public
        ? {}
        : {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          };

      const response = await fetch(`${API_BASE}${api.path}`, {
        method: api.method,
        headers,
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success!`);
        console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200));
      } else {
        const error = await response.text();
        console.log(`   ❌ Failed:`, error.substring(0, 100));
      }
    } catch (error) {
      console.log(`   ❌ Error:`, error.message);
    }
  }
}

testAPIs()
  .then(() => {
    console.log("\n✅ Tests completed!\n");
  })
  .catch(error => {
    console.error("❌ Test failed:", error);
  });
