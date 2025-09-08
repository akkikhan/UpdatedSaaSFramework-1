import { storage } from "../server/storage";

async function seed() {
  try {
    const templates = await storage.getPermissionTemplates();
<<<<<<< HEAD
    if (!templates.find((t) => t.name === "Standard")) {
      await storage.createPermissionTemplate({
        name: "Standard",
        description: "Default permission template with full user and role access",
=======
    if (templates.length === 0) {
      await storage.createPermissionTemplate({
        name: "Standard",
        description: "Default permission template",
>>>>>>> a1f0de9624468052f111c2ab44bfa46077f4fe33
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

<<<<<<< HEAD
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

=======
>>>>>>> a1f0de9624468052f111c2ab44bfa46077f4fe33
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
<<<<<<< HEAD
    if (!defaultRoles.find((r) => r.name === "Admin")) {
=======
    if (defaultRoles.length === 0) {
>>>>>>> a1f0de9624468052f111c2ab44bfa46077f4fe33
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

<<<<<<< HEAD
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

=======
>>>>>>> a1f0de9624468052f111c2ab44bfa46077f4fe33
    console.log("RBAC configuration seeded");
    process.exit(0);
  } catch (err) {
    console.error("RBAC config seeding failed", err);
    process.exit(1);
  }
}

seed();
