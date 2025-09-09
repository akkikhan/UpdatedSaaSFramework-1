// Test tenant API to see if loggingApiKey is being returned
import { config } from "dotenv";
config();

async function testTenantAPI() {
  try {
    // Get a tenant that should have logging enabled
    console.log("🧪 Testing tenant API endpoints...\n");

    // Test with one of the tenants that has logging enabled
    const orgId = "h"; // This one has logging module and API key

    console.log(`Testing /api/tenants/by-org-id/${orgId}`);
    const response = await fetch(`http://localhost:5000/api/tenants/by-org-id/${orgId}`);

    if (!response.ok) {
      console.error(`API call failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error("Response body:", text);
      return;
    }

    const tenant = await response.json();
    console.log("✅ Tenant data received:");
    console.log(`   orgId: ${tenant.orgId}`);
    console.log(`   name: ${tenant.name}`);
    console.log(`   enabledModules: ${JSON.stringify(tenant.enabledModules)}`);
    console.log(`   loggingApiKey: ${tenant.loggingApiKey ? "PRESENT" : "MISSING"}`);

    if (tenant.loggingApiKey) {
      console.log(`   loggingApiKey value: ${tenant.loggingApiKey}`);

      // Test if the logging API key works
      console.log("\n🧪 Testing logging API with the key...");
      const logsResponse = await fetch("http://localhost:5000/api/v2/logging/events?limit=5", {
        headers: { "X-API-Key": tenant.loggingApiKey },
      });

      console.log(`Logging API response: ${logsResponse.status} ${logsResponse.statusText}`);

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        console.log("✅ Logging API call successful!");
        console.log(
          `   Received ${Array.isArray(logsData) ? logsData.length : "non-array"} log entries`
        );
      } else {
        const errorText = await logsResponse.text();
        console.error("❌ Logging API call failed:");
        console.error("   Response body:", errorText);
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testTenantAPI();
