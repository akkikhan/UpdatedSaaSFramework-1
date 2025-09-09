import { storage } from "./server/storage.js";

async function checkLoggingKeys() {
  try {
    const db = storage.db;
    const tenants = await db.select().from(storage.schema.tenants);

    console.log("Tenants with logging module and API keys:");
    tenants.forEach(tenant => {
      const modules = tenant.enabledModules || [];
      const hasLogging = modules.includes("logging");
      console.log(
        `${tenant.orgId}: hasLogging=${hasLogging}, loggingApiKey=${tenant.loggingApiKey ? "YES" : "NO"}`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkLoggingKeys();
