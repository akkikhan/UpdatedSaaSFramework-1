import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { tenants, users, roles, userRoles } from "../shared/schema.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Simple API key generator
function generateApiKey() {
  return "sk_" + crypto.randomBytes(32).toString("hex");
}

const client = new Client({
  connectionString:
    process.env.DATABASE_URL || "postgresql://saasuser:devpassword123@localhost:5432/saasdb",
});

const db = drizzle(client);

const SEED_TENANTS = [
  {
    orgId: "acme-corp",
    name: "ACME Corporation",
    adminEmail: "admin@acmecorp.com",
    status: "active",
    enabledModules: ["authentication", "rbac", "logging"],
    adminUser: {
      email: "admin@acmecorp.com",
      password: "Admin123!",
      name: "John Smith",
    },
  },
  {
    orgId: "tech-innovations",
    name: "Tech Innovations Inc",
    adminEmail: "admin@techinnovations.com",
    status: "active",
    enabledModules: ["authentication", "rbac", "notifications"],
    adminUser: {
      email: "admin@techinnovations.com",
      password: "TechAdmin2024!",
      name: "Sarah Johnson",
    },
  },
  {
    orgId: "startup-hub",
    name: "Startup Hub",
    adminEmail: "founder@startuphub.io",
    status: "active",
    enabledModules: ["authentication", "rbac", "logging", "notifications"],
    adminUser: {
      email: "founder@startuphub.io",
      password: "StartupLife2024!",
      name: "Mike Chen",
    },
  },
  {
    orgId: "global-solutions",
    name: "Global Solutions Ltd",
    adminEmail: "admin@globalsolutions.com",
    status: "pending",
    enabledModules: ["authentication", "rbac"],
    adminUser: {
      email: "admin@globalsolutions.com",
      password: "GlobalAdmin2024!",
      name: "Emma Wilson",
    },
  },
  {
    orgId: "creative-agency",
    name: "Creative Digital Agency",
    adminEmail: "director@creativedigital.com",
    status: "active",
    enabledModules: ["authentication", "rbac", "notifications"],
    adminUser: {
      email: "director@creativedigital.com",
      password: "CreativeDir2024!",
      name: "Alex Rodriguez",
    },
  },
];

async function generateModuleApiKeys(enabledModules) {
  const apiKeys = {};

  if (enabledModules.includes("authentication")) {
    apiKeys.authApiKey = generateApiKey();
  }
  if (enabledModules.includes("rbac")) {
    apiKeys.rbacApiKey = generateApiKey();
  }
  if (enabledModules.includes("logging")) {
    apiKeys.loggingApiKey = generateApiKey();
  }
  if (enabledModules.includes("notifications")) {
    apiKeys.notificationsApiKey = generateApiKey();
  }

  return apiKeys;
}

async function createDefaultRoles(tenantId) {
  const defaultRoles = [
    {
      tenantId,
      name: "Admin",
      description: "Full administrative access",
      permissions: ["*"],
      isSystem: true,
    },
    {
      tenantId,
      name: "User",
      description: "Standard user access",
      permissions: ["read", "update_profile"],
      isSystem: true,
    },
    {
      tenantId,
      name: "Manager",
      description: "Management level access",
      permissions: ["read", "write", "manage_users", "view_reports"],
      isSystem: false,
    },
  ];

  return await db.insert(roles).values(defaultRoles).returning();
}

async function seedTenants() {
  try {
    await client.connect();
    console.log("🔌 Connected to database");

    for (const tenantData of SEED_TENANTS) {
      console.log(`\n🏢 Creating tenant: ${tenantData.name}`);

      // Generate API keys for enabled modules
      const apiKeys = await generateModuleApiKeys(tenantData.enabledModules);

      // Create tenant
      const [tenant] = await db
        .insert(tenants)
        .values({
          orgId: tenantData.orgId,
          name: tenantData.name,
          adminEmail: tenantData.adminEmail,
          status: tenantData.status,
          enabledModules: tenantData.enabledModules,
          moduleConfigs: {},
          ...apiKeys,
        })
        .returning();

      console.log(`✅ Tenant created with ID: ${tenant.id}`);

      // Create default roles for tenant
      const createdRoles = await createDefaultRoles(tenant.id);
      console.log(`📋 Created ${createdRoles.length} default roles`);

      // Find admin role
      const adminRole = createdRoles.find(role => role.name === "Admin");

      // Create admin user
      const hashedPassword = await bcrypt.hash(tenantData.adminUser.password, 10);
      const [adminUser] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: tenantData.adminUser.email,
          passwordHash: hashedPassword,
          isActive: true,
        })
        .returning();

      console.log(`👤 Admin user created: ${adminUser.email}`);

      // Assign admin role to user
      if (adminRole) {
        await db.insert(userRoles).values({
          userId: adminUser.id,
          roleId: adminRole.id,
          assignedBy: adminUser.id, // Self-assigned for initial setup
          assignedAt: new Date(),
        });
        console.log(`🔐 Assigned Admin role to user`);
      }

      console.log(`🎯 Tenant setup complete for: ${tenantData.name}`);
      console.log(`   - Org ID: ${tenantData.orgId}`);
      console.log(`   - Admin: ${tenantData.adminUser.email}`);
      console.log(`   - Modules: ${tenantData.enabledModules.join(", ")}`);
      console.log(`   - Status: ${tenantData.status}`);
    }

    console.log(`\n🎉 Successfully seeded ${SEED_TENANTS.length} tenants!`);
    console.log("\n📖 Login credentials:");
    SEED_TENANTS.forEach(tenant => {
      console.log(`${tenant.name}: ${tenant.adminUser.email} / ${tenant.adminUser.password}`);
    });
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    await client.end();
  }
}

// Run the seed script
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTenants();
}

export { seedTenants };
