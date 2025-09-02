import { storage } from "./server/storage.ts";

async function checkTenant() {
  try {
    console.log("🔍 Checking tenant: mohd-aakib1");

    const tenant = await storage.getTenantByOrgId("mohd-aakib1");
    console.log("📊 Tenant Details:", JSON.stringify(tenant, null, 2));

    if (tenant) {
      const users = await storage.getTenantUsers(tenant.id);
      console.log("👥 Tenant Users:", JSON.stringify(users, null, 2));

      // Check if there's an admin user
      const adminUser = users.find(u => u.email === "akki@primussoft.com");
      if (adminUser) {
        console.log("🔑 Admin User Found:", {
          id: adminUser.id,
          email: adminUser.email,
          status: adminUser.status,
          hasPassword: !!adminUser.passwordHash,
        });
      } else {
        console.log("❌ No admin user found with email: akki@primussoft.com");
      }
    } else {
      console.log("❌ Tenant not found: mohd-aakib1");
    }
  } catch (error) {
    console.error("💥 Error:", error.message);
  }
}

checkTenant();
