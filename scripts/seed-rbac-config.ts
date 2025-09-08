import { storage } from "../server/storage";

async function seed() {
  try {
    const templates = await storage.getPermissionTemplates();
    if (templates.length === 0) {
      await storage.createPermissionTemplate({
        name: "Standard",
        description: "Default permission template",
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
    if (defaultRoles.length === 0) {

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


    console.log("RBAC configuration seeded");
    process.exit(0);
  } catch (err) {
    console.error("RBAC config seeding failed", err);
    process.exit(1);
  }
}

seed();
