import pkg from "pg";
const { Client } = pkg;
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
    apiKeys.auth_api_key = generateApiKey();
  }
  if (enabledModules.includes("rbac")) {
    apiKeys.rbac_api_key = generateApiKey();
  }
  if (enabledModules.includes("logging")) {
    apiKeys.logging_api_key = generateApiKey();
  }
  if (enabledModules.includes("notifications")) {
    apiKeys.notifications_api_key = generateApiKey();
  }

  return apiKeys;
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
      const tenantQuery = `
        INSERT INTO tenants (org_id, name, admin_email, status, enabled_modules, module_configs, auth_api_key, rbac_api_key, logging_api_key, notifications_api_key)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, org_id, name;
      `;

      const tenantResult = await client.query(tenantQuery, [
        tenantData.orgId,
        tenantData.name,
        tenantData.adminEmail,
        tenantData.status,
        JSON.stringify(tenantData.enabledModules),
        JSON.stringify({}),
        apiKeys.auth_api_key || null,
        apiKeys.rbac_api_key || null,
        apiKeys.logging_api_key || null,
        apiKeys.notifications_api_key || null,
      ]);

      const tenant = tenantResult.rows[0];
      console.log(`✅ Tenant created with ID: ${tenant.id}`);

      // Create default roles for tenant
      const rolesQuery = `
        INSERT INTO roles (tenant_id, name, description, permissions, is_system)
        VALUES 
          ($1, 'Admin', 'Full administrative access', $2::text[], true),
          ($1, 'User', 'Standard user access', $3::text[], true),
          ($1, 'Manager', 'Management level access', $4::text[], false)
        RETURNING id, name;
      `;

      const rolesResult = await client.query(rolesQuery, [
        tenant.id,
        ["*"],
        ["read", "update_profile"],
        ["read", "write", "manage_users", "view_reports"],
      ]);

      console.log(`📋 Created ${rolesResult.rows.length} default roles`);

      // Find admin role
      const adminRole = rolesResult.rows.find(role => role.name === "Admin");

      // Create admin user
      const hashedPassword = await bcrypt.hash(tenantData.adminUser.password, 10);
      const userQuery = `
        INSERT INTO users (tenant_id, email, password_hash, is_active)
        VALUES ($1, $2, $3, true)
        RETURNING id, email;
      `;

      const userResult = await client.query(userQuery, [
        tenant.id,
        tenantData.adminUser.email,
        hashedPassword,
      ]);

      const adminUser = userResult.rows[0];
      console.log(`👤 Admin user created: ${adminUser.email}`);

      // Assign admin role to user
      if (adminRole) {
        const userRoleQuery = `
          INSERT INTO user_roles (tenant_id, user_id, role_id, assigned_by, assigned_at)
          VALUES ($1, $2, $3, $2, NOW());
        `;

        await client.query(userRoleQuery, [tenant.id, adminUser.id, adminRole.id]);
        console.log(`🔐 Assigned Admin role to user`);
      }

      console.log(`🎯 Tenant setup complete for: ${tenantData.name}`);
      console.log(`   - Org ID: ${tenantData.orgId}`);
      console.log(`   - Admin: ${tenantData.adminUser.email}`);
      console.log(`   - Modules: ${tenantData.enabledModules.join(", ")}`);
      console.log(`   - Status: ${tenantData.status}`);
      if (apiKeys.auth_api_key)
        console.log(`   - Auth API Key: ${apiKeys.auth_api_key.substring(0, 20)}...`);
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
seedTenants();
