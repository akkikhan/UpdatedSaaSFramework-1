// Check tenant modules in database
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Client } = pkg;
import { tenants } from "./shared/schema.ts";

config();

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const db = drizzle(client);

try {
  console.log("🔍 Checking tenant modules in database...\n");

  const allTenants = await db.select().from(tenants);

  if (allTenants.length === 0) {
    console.log("No tenants found in database.");
  } else {
    console.log(`Found ${allTenants.length} tenant(s):\n`);

    allTenants.forEach((tenant, index) => {
      console.log(`${index + 1}. Tenant: ${tenant.orgId} (${tenant.name})`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   Admin Email: ${tenant.adminEmail}`);
      console.log(`   Enabled Modules: ${JSON.stringify(tenant.enabledModules, null, 2)}`);
      const hasLogging = tenant.enabledModules?.includes("logging");
      console.log(`   Has Logging Module: ${hasLogging}`);
      console.log(`   Logging API Key: ${tenant.loggingApiKey ? "YES" : "NO"}`);
      if (tenant.loggingApiKey) {
        console.log(`   Logging API Key Value: ${tenant.loggingApiKey}`);
      }
      console.log(`   Auth API Key: ${tenant.authApiKey ? "YES" : "NO"}`);
      console.log(`   Created: ${tenant.createdAt}`);
      console.log("");
    });
  }
} catch (error) {
  console.error("❌ Error checking database:", error);
} finally {
  await client.end();
}
