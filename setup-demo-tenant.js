// Check current tenants and create demo tenant if needed
import { db } from "./server/storage.js";
import { tenants, users } from "./shared/schema.js";
import bcrypt from "bcryptjs";

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function main() {
  try {
    console.log("🔍 Checking current tenants...");

    // Check existing tenants
    const allTenants = await db.select().from(tenants);
    console.log(`Found ${allTenants.length} tenants:`);
    allTenants.forEach(t => {
      console.log(`  ✅ ${t.name} (orgId: ${t.orgId})`);
    });

    // Check if demo tenant exists
    const demoTenant = allTenants.find(t => t.orgId === "demo");

    if (demoTenant) {
      console.log("\n✅ Demo tenant already exists!");
      return;
    }

    console.log("\n🚀 Creating demo tenant...");

    // Create demo tenant
    const newTenant = {
      id: crypto.randomUUID(),
      name: "Demo Company",
      orgId: "demo",
      businessType: "Technology",
      adminEmail: "akki@primussoft.com",
      adminName: "Akki Khan",
      website: "https://demo.primussoft.com",
      description: "Demo tenant for testing",
      enabledModules: ["authentication", "users", "roles"],
      moduleConfigs: {
        authentication: {
          providers: ["email"],
        },
        users: {},
        roles: {},
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [insertedTenant] = await db.insert(tenants).values(newTenant).returning();
    console.log("✅ Demo tenant created:", insertedTenant.orgId);

    // Create demo user
    console.log("👤 Creating demo user...");
    const hashedPassword = await hashPassword("Demo123");
    const newUser = {
      id: crypto.randomUUID(),
      tenantId: insertedTenant.id,
      email: "akki@primussoft.com",
      name: "Akki Khan",
      passwordHash: hashedPassword,
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [insertedUser] = await db.insert(users).values(newUser).returning();
    console.log("✅ Demo user created:", insertedUser.email);

    console.log("\n🎉 Demo tenant setup complete!");
    console.log("You can now login at: http://localhost:5000/tenant/demo/login");
    console.log("Email: akki@primussoft.com");
    console.log("Password: Demo123");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  process.exit(0);
}

main();
