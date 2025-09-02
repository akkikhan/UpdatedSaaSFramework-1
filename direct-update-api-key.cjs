const { Client } = require("pg");

console.log("🔧 Directly updating tenant API key in database...");

async function updateTenantApiKey() {
  const client = new Client({
    connectionString:
      "postgresql://postgres:NGPTmpisb@95@db.kakmznvbklmtpskudngq.supabase.co:5432/postgres",
  });

  try {
    await client.connect();
    console.log("✅ Connected to database");

    // First, check the current tenant data
    console.log("1. Checking current tenant data...");
    const currentResult = await client.query(
      "SELECT id, name, org_id, auth_api_key, status FROM tenants WHERE org_id = $1",
      ["test-auth-company"]
    );

    if (currentResult.rows.length === 0) {
      console.log("❌ No tenant found with org_id: test-auth-company");
      return;
    }

    const tenant = currentResult.rows[0];
    console.log("Current tenant data:");
    console.log(`  ID: ${tenant.id}`);
    console.log(`  Name: ${tenant.name}`);
    console.log(`  Org ID: ${tenant.org_id}`);
    console.log(`  Current API Key: ${tenant.auth_api_key || "NULL"}`);
    console.log(`  Status: ${tenant.status}`);

    // Update the API key
    console.log("\\n2. Updating API key...");
    const updateResult = await client.query(
      "UPDATE tenants SET auth_api_key = $1 WHERE org_id = $2 RETURNING id, name, org_id, auth_api_key",
      ["auth_abc123def456ghi789jkl012", "test-auth-company"]
    );

    if (updateResult.rows.length > 0) {
      const updatedTenant = updateResult.rows[0];
      console.log("✅ API key updated successfully!");
      console.log("Updated tenant data:");
      console.log(`  ID: ${updatedTenant.id}`);
      console.log(`  Name: ${updatedTenant.name}`);
      console.log(`  Org ID: ${updatedTenant.org_id}`);
      console.log(`  New API Key: ${updatedTenant.auth_api_key}`);
    } else {
      console.log("❌ Update failed - no rows affected");
    }
  } catch (error) {
    console.error("❌ Database error:", error.message);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

updateTenantApiKey();
