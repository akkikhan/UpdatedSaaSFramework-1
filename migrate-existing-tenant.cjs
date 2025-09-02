// Migration script for existing tenant user (CommonJS)
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function migrateExistingTenant() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/saas_framework",
  });

  try {
    await client.connect();
    console.log("🔄 Connected to database, migrating existing tenant user...");

    // Get the tenant ID for akki-test-638923509655646643
    const tenantQuery = await client.query('SELECT id, name FROM tenants WHERE "orgId" = $1', [
      "akki-test-638923509655646643",
    ]);

    if (tenantQuery.rows.length === 0) {
      console.log("❌ Tenant not found");
      return;
    }

    const tenant = tenantQuery.rows[0];
    console.log(`✅ Found tenant: ${tenant.name} (ID: ${tenant.id})`);

    // Check if user already exists in tenantUsers table
    const existingUserQuery = await client.query(
      'SELECT id FROM "tenantUsers" WHERE "tenantId" = $1 AND email = $2',
      [tenant.id, "akki@primussoft.com"]
    );

    if (existingUserQuery.rows.length > 0) {
      console.log("✅ User already exists in tenantUsers table");
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash("temp123!", 12);

    // Create user in tenantUsers table
    const insertQuery = `
      INSERT INTO "tenantUsers" (
        "tenantId", 
        email, 
        name, 
        "passwordHash", 
        status, 
        "isEmailVerified",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `;

    await client.query(insertQuery, [
      tenant.id,
      "akki@primussoft.com",
      "Akki Khan",
      passwordHash,
      "active",
      true,
    ]);

    console.log("✅ Successfully created user in tenantUsers table!");
    console.log("🎉 You can now login to the tenant portal with:");
    console.log("   Email: akki@primussoft.com");
    console.log("   Password: temp123!");
  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    await client.end();
  }
}

migrateExistingTenant().catch(console.error);
