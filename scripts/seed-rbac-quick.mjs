#!/usr/bin/env node
// Quick RBAC seeding via API endpoints - requires running server

const BASE = process.env.BASE_URL || "http://localhost:5000";
const TOKEN = process.env.PLATFORM_ADMIN_TOKEN || process.env.ADMIN_TOKEN;

console.log("🌱 RBAC Data Seeding Utility");
console.log("================================");

if (!TOKEN) {
  console.error("❌ Missing authentication token!");
  console.log("\nPlease set one of these environment variables:");
  console.log("  - PLATFORM_ADMIN_TOKEN");
  console.log("  - ADMIN_TOKEN");
  console.log("\nExample:");
  console.log("  PLATFORM_ADMIN_TOKEN=your_token node scripts/seed-rbac-quick.mjs");
  process.exit(1);
}

const headers = {
  "content-type": "application/json",
  authorization: `Bearer ${TOKEN}`,
};

// Quick seed data - focused on essential templates and types
const quickSeedData = {
  businessTypes: [
    {
      name: "Standard",
      description: "Standard business operations",
      requiredCompliance: ["data_protection"],
      defaultPermissions: ["user.read", "role.read"],
      riskLevel: "low",
    },
    {
      name: "Healthcare",
      description: "HIPAA-compliant healthcare organizations",
      requiredCompliance: ["hipaa", "phi_protection", "audit_logging"],
      defaultPermissions: ["user.read", "patient.read", "audit.read"],
      riskLevel: "high",
      maxTenants: 100,
    },
    {
      name: "Financial",
      description: "SOX and PCI-DSS compliant financial services",
      requiredCompliance: ["sox", "pci_dss", "transaction_monitoring"],
      defaultPermissions: ["user.read", "transaction.read", "audit.read"],
      riskLevel: "critical",
      maxTenants: 50,
    },
    {
      name: "E-commerce",
      description: "Online retail and e-commerce",
      requiredCompliance: ["pci_dss", "gdpr"],
      defaultPermissions: ["user.read", "product.read", "order.read"],
      riskLevel: "medium",
      maxTenants: 500,
    },
  ],

  permissionTemplates: [
    {
      name: "Standard Business",
      description: "Basic permissions for standard operations",
      permissions: ["user.create", "user.read", "user.update", "user.delete", "role.manage"],
      roles: ["admin", "manager", "user"],
      businessTypes: ["standard"],
      isDefault: true,
    },
    {
      name: "Healthcare Basic",
      description: "Basic healthcare permissions",
      permissions: ["user.read", "patient.read", "patient.update", "medical_records.read"],
      roles: ["healthcare_admin", "doctor", "nurse"],
      businessTypes: ["healthcare"],
      isDefault: false,
    },
    {
      name: "Financial Basic",
      description: "Basic financial permissions",
      permissions: ["user.read", "transaction.read", "risk.assess", "audit.read"],
      roles: ["financial_admin", "analyst"],
      businessTypes: ["financial"],
      isDefault: false,
    },
    {
      name: "E-commerce Basic",
      description: "Basic e-commerce permissions",
      permissions: ["user.read", "product.read", "order.read", "customer.read", "inventory.read"],
      roles: ["store_admin", "manager"],
      businessTypes: ["ecommerce"],
      isDefault: false,
    },
  ],

  defaultRoles: [
    {
      name: "Super Admin",
      description: "Full system access",
      permissions: ["*"],
      priority: 1,
      isSystemRole: true,
      canBeModified: false,
    },
    {
      name: "Admin",
      description: "Administrative access",
      permissions: ["user.create", "user.read", "user.update", "user.delete", "role.manage"],
      priority: 2,
    },
    {
      name: "Manager",
      description: "Management access",
      permissions: ["user.read", "user.update", "role.read", "role.assign"],
      priority: 3,
    },
    {
      name: "User",
      description: "Standard user access",
      permissions: ["user.read", "profile.update"],
      priority: 4,
    },
    {
      name: "Healthcare Admin",
      description: "Healthcare administrator",
      permissions: ["user.create", "patient.read", "patient.update", "medical_records.read"],
      priority: 2,
    },
    {
      name: "Doctor",
      description: "Medical practitioner",
      permissions: [
        "patient.read",
        "patient.update",
        "medical_records.read",
        "medical_records.update",
      ],
      priority: 2,
    },
    {
      name: "Financial Admin",
      description: "Financial administrator",
      permissions: ["user.create", "transaction.read", "risk.assess", "compliance.manage"],
      priority: 2,
    },
    {
      name: "Store Admin",
      description: "E-commerce store administrator",
      permissions: [
        "user.create",
        "product.create",
        "order.read",
        "customer.manage",
        "inventory.manage",
      ],
      priority: 2,
    },
  ],
};

async function fetchJson(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error(`Cannot connect to server at ${BASE}. Make sure the server is running.`);
    }
    throw error;
  }
}

async function seedQuickData() {
  console.log(`🔗 Connecting to: ${BASE}`);
  console.log("🔑 Using authentication token...\n");

  // Test connection
  try {
    await fetchJson(`${BASE}/api/health`, { headers: { authorization: headers.authorization } });
    console.log("✅ Server connection successful\n");
  } catch (error) {
    console.error("❌ Server connection failed:", error.message);
    return;
  }

  // Seed Business Types
  console.log("🏢 Seeding Business Types...");
  try {
    const existingTypes = await fetchJson(`${BASE}/api/rbac-config/business-types`, { headers });

    for (const businessType of quickSeedData.businessTypes) {
      if (!existingTypes.find(t => t.name.toLowerCase() === businessType.name.toLowerCase())) {
        await fetchJson(`${BASE}/api/rbac-config/business-types`, {
          method: "POST",
          headers,
          body: JSON.stringify(businessType),
        });
        console.log(`  ✅ ${businessType.name} (${businessType.riskLevel} risk)`);
      } else {
        console.log(`  ⏭️ ${businessType.name} (exists)`);
      }
    }
  } catch (error) {
    console.error("❌ Business Types seeding failed:", error.message);
    return;
  }

  // Seed Permission Templates
  console.log("\n📋 Seeding Permission Templates...");
  try {
    const existingTemplates = await fetchJson(`${BASE}/api/rbac-config/permission-templates`, {
      headers,
    });

    for (const template of quickSeedData.permissionTemplates) {
      if (!existingTemplates.find(t => t.name.toLowerCase() === template.name.toLowerCase())) {
        await fetchJson(`${BASE}/api/rbac-config/permission-templates`, {
          method: "POST",
          headers,
          body: JSON.stringify(template),
        });
        console.log(`  ✅ ${template.name} (${template.permissions.length} permissions)`);
      } else {
        console.log(`  ⏭️ ${template.name} (exists)`);
      }
    }
  } catch (error) {
    console.error("❌ Permission Templates seeding failed:", error.message);
    return;
  }

  // Seed Default Roles
  console.log("\n👥 Seeding Default Roles...");
  try {
    const existingRoles = await fetchJson(`${BASE}/api/rbac-config/default-roles`, { headers });

    for (const role of quickSeedData.defaultRoles) {
      if (!existingRoles.find(r => r.name.toLowerCase() === role.name.toLowerCase())) {
        await fetchJson(`${BASE}/api/rbac-config/default-roles`, {
          method: "POST",
          headers,
          body: JSON.stringify(role),
        });
        console.log(`  ✅ ${role.name} (Priority ${role.priority})`);
      } else {
        console.log(`  ⏭️ ${role.name} (exists)`);
      }
    }
  } catch (error) {
    console.error("❌ Default Roles seeding failed:", error.message);
    return;
  }

  // Summary
  console.log("\n📊 Seeding Summary:");
  console.log(`  Business Types: ${quickSeedData.businessTypes.length}`);
  console.log(`  Permission Templates: ${quickSeedData.permissionTemplates.length}`);
  console.log(`  Default Roles: ${quickSeedData.defaultRoles.length}`);
  console.log("\n🎉 Quick seeding completed successfully!");

  console.log("\n💡 Next Steps:");
  console.log("  1. Use the Platform Admin UI to view and manage the seeded data");
  console.log("  2. Create tenants and assign business types");
  console.log("  3. Customize roles and permissions as needed");
}

seedQuickData().catch(error => {
  console.error("\n❌ Seeding failed:", error.message);
  process.exit(1);
});
