// Simple migration script using Supabase connection
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function migrateExistingTenant() {
  const client = new Client({
    connectionString:
      "postgresql://postgres:NGPTmpisb@95@db.kakmznvbklmtpskudngq.supabase.co:5432/postgres",
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log("🔄 Connected to Supabase database...");

    // Get the tenant ID for akki-test-638923509655646643
    const tenantQuery = await client.query("SELECT id, name FROM tenants WHERE org_id = $1", [
      "akki-test-638923509655646643",
    ]);

    if (tenantQuery.rows.length === 0) {
      console.log("❌ Tenant not found");
      return;
    }

    const tenant = tenantQuery.rows[0];
    console.log(`✅ Found tenant: ${tenant.name} (ID: ${tenant.id})`);

    // Check if user already exists in tenant_users table
    const existingUserQuery = await client.query(
      "SELECT id FROM tenant_users WHERE tenant_id = $1 AND email = $2",
      [tenant.id, "akki@primussoft.com"]
    );

    if (existingUserQuery.rows.length > 0) {
      console.log("✅ User already exists in tenant_users table");
      return;
    }

    // Hash the password using the same method as the server
    const passwordHash = await bcrypt.hash("temp123!", 12);

    // Create user in tenant_users table with the exact schema
    const insertQuery = `
      INSERT INTO tenant_users (
        tenant_id, 
        email, 
        password_hash, 
        first_name,
        last_name,
        status, 
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email
    `;

    const result = await client.query(insertQuery, [
      tenant.id,
      "akki@primussoft.com",
      passwordHash,
      "Akki",
      "Khan",
      "active",
    ]);

    console.log("✅ Successfully created user in tenant_users table!");
    console.log(`📝 User ID: ${result.rows[0].id}`);
    console.log("🎉 You can now login to the tenant portal with:");
    console.log("   Email: akki@primussoft.com");
    console.log("   Password: temp123!");
    console.log("   URL: http://localhost:5000/tenant/akki-test-638923509655646643/login");
  } catch (error) {
    console.error("❌ Migration error:", error.message);
    console.error("Full error:", error);
  } finally {
    await client.end();
  }
}

migrateExistingTenant().catch(console.error);
