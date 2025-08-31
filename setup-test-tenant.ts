import dotenv from "dotenv";
dotenv.config();

import { db } from "./server/db";
import { tenants } from "./shared/schema";
import { nanoid } from "nanoid";

console.log("🏢 Setting up test tenant...");

async function setupTestTenant() {
  try {
    if (!db) {
      throw new Error("Database connection failed");
    }

    // Create the test tenant
    const testTenant = {
      name: "Primus Demo Tenant",
      orgId: "primusdemo",
      adminEmail: "admin@primusdemo.com",
      status: "active",
      authApiKey: `auth_${nanoid(32)}`,
      rbacApiKey: `rbac_${nanoid(32)}`,
      enabledModules: ["auth", "rbac", "azure-ad"],
      moduleConfigs: {
        "azure-ad": {
          enabled: true,
          autoProvision: true,
          defaultRole: "user",
        },
      },
    };

    // Insert or update the tenant
    const result = await db
      .insert(tenants)
      .values(testTenant)
      .onConflictDoUpdate({
        target: tenants.orgId,
        set: {
          name: testTenant.name,
          adminEmail: testTenant.adminEmail,
          status: testTenant.status,
          enabledModules: testTenant.enabledModules,
          moduleConfigs: testTenant.moduleConfigs,
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log("✅ Test tenant created/updated successfully:");
    console.log(`   Name: ${testTenant.name}`);
    console.log(`   Org ID: ${testTenant.orgId}`);
    console.log(`   Admin Email: ${testTenant.adminEmail}`);
    console.log(`   Status: ${testTenant.status}`);
    console.log(`   Modules: ${testTenant.enabledModules.join(", ")}`);
    console.log("");
    console.log("🔗 Test the Azure AD OAuth flow:");
    console.log("   http://localhost:3001/api/auth/azure/primusdemo");
  } catch (error) {
    console.error("❌ Failed to setup test tenant:", error);
    process.exit(1);
  }
}

setupTestTenant();
