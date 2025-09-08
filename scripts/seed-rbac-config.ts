import { storage } from "../server/storage";

async function seed() {
  try {
    const templates = await storage.getPermissionTemplates();
    if (!templates.find((t) => t.name === "Standard")) {
      await storage.createPermissionTemplate({
        name: "Standard",
        description: "Default permission template with full user and role access",
        permissions: [
          "user.create",
          "user.read",
          "user.update",
          "user.delete",
          "role.manage",
        ],
        businessTypes: ["general"],
        isDefault: true,
        isActive: true,
      });
    }

    if (!templates.find((t) => t.name === "Read Only")) {
      await storage.createPermissionTemplate({
        name: "Read Only",
        description: "View-only access to users and roles",
        permissions: ["user.read", "role.read"],
        businessTypes: ["general"],
        isDefault: false,
        isActive: true,
      });
    }

    const businessTypes = await storage.getBusinessTypes();
    let general = businessTypes.find((b) => b.name === "General");
    if (!general) {
      general = await storage.createBusinessType({
        name: "General",
        description: "General business type",
        requiredCompliance: [],
        defaultPermissions: ["user.read", "role.read"],
        riskLevel: "low",
        isActive: true,
        maxTenants: null,
      });
    }

    const defaultRoles = await storage.getDefaultRoles();
    if (!defaultRoles.find((r) => r.name === "Admin")) {
      await storage.createDefaultRole({
        name: "Admin",
        description: "Full access to system",
        permissions: ["*"],
        businessTypeId: general.id,
        permissionTemplateId: null,
        isSystemRole: true,
        canBeModified: false,
        isActive: true,
        priority: 1,
      });
    }

    if (!defaultRoles.find((r) => r.name === "Manager")) {
      await storage.createDefaultRole({
        name: "Manager",
        description: "Manage users and roles",
        permissions: ["user.create", "user.read", "user.update", "role.manage"],
        businessTypeId: general.id,
        permissionTemplateId: null,
        isSystemRole: false,
        canBeModified: true,
        isActive: true,
        priority: 2,
      });
    }

    console.log("RBAC configuration seeded");
    process.exit(0);
  } catch (err) {
    console.error("RBAC config seeding failed", err);
    process.exit(1);
  }
}

seed();
