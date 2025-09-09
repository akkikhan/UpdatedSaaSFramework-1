// Simple SQL query to check logging API keys
import { config } from "dotenv";
import pkg from "pg";
const { Client } = pkg;

config();

async function checkLoggingKeys() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log("🔍 Checking tenants for logging API keys...\n");

    const result = await client.query(`
      SELECT 
        "org_id",
        "name",
        "status",
        "enabled_modules",
        CASE WHEN "logging_api_key" IS NOT NULL THEN 'YES' ELSE 'NO' END as has_logging_key,
        "logging_api_key"
      FROM tenants
      ORDER BY "created_at" DESC
    `);

    if (result.rows.length === 0) {
      console.log("No tenants found.");
    } else {
      console.log(`Found ${result.rows.length} tenant(s):\n`);

      result.rows.forEach((tenant, index) => {
        const modules = tenant.enabled_modules || [];
        const hasLogging = modules.includes("logging");

        console.log(`${index + 1}. Tenant: ${tenant.org_id} (${tenant.name})`);
        console.log(`   Status: ${tenant.status}`);
        console.log(`   Has Logging Module: ${hasLogging}`);
        console.log(`   Has Logging API Key: ${tenant.has_logging_key}`);
        if (tenant.logging_api_key) {
          console.log(`   Logging API Key: ${tenant.logging_api_key}`);
        }
        console.log("");
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

checkLoggingKeys();
