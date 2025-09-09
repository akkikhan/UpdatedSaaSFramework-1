// Fix tenants that have logging module enabled but no logging API key
import { config } from "dotenv";
import pkg from "pg";
const { Client } = pkg;
import { randomUUID } from "crypto";

config();

async function fixLoggingApiKeys() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log("🔧 Checking for tenants with logging module but no API key...\n");

    // Find tenants with logging module enabled but no logging API key
    const result = await client.query(`
      SELECT 
        id,
        "org_id",
        "name",
        "status",
        "enabled_modules",
        "logging_api_key"
      FROM tenants
      WHERE 
        "enabled_modules" @> '["logging"]'::jsonb
        AND ("logging_api_key" IS NULL OR "logging_api_key" = '')
    `);

    if (result.rows.length === 0) {
      console.log("✅ All tenants with logging module have API keys!");
      return;
    }

    console.log(`Found ${result.rows.length} tenant(s) that need logging API keys:\n`);

    for (const tenant of result.rows) {
      console.log(`Fixing tenant: ${tenant.org_id} (${tenant.name})`);

      // Generate new logging API key
      const loggingApiKey = `logging_${randomUUID().replace(/-/g, "").substring(0, 20)}`;

      // Update the tenant
      await client.query(
        `
        UPDATE tenants 
        SET "logging_api_key" = $1, "updated_at" = NOW()
        WHERE id = $2
      `,
        [loggingApiKey, tenant.id]
      );

      console.log(`   ✅ Generated logging API key: ${loggingApiKey}`);
    }

    console.log(`\n🎉 Fixed ${result.rows.length} tenant(s)!`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.end();
  }
}

fixLoggingApiKeys();
