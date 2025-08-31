import { storage } from "./server/storage.ts";

async function checkTenants() {
  try {
    const tenants = await storage.getAllTenants();
    console.log("Tenants:", JSON.stringify(tenants, null, 2));

    // Also check platform admins
    const admins = await storage.getAllPlatformAdmins();
    console.log("Platform Admins:", JSON.stringify(admins, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTenants();
