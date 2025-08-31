import { platformAdminAuthService } from "./services/platform-admin-auth";

async function createFirstPlatformAdmin() {
  try {
    console.log("Creating first platform admin...");

    // Check if any platform admins exist
    const existingAdmins = await platformAdminAuthService.getAllAdmins();

    if (existingAdmins.length > 0) {
      console.log("Platform admins already exist:");
      existingAdmins.forEach(admin => {
        console.log(`- ${admin.email} (${admin.role}) - Active: ${admin.isActive}`);
      });
      return;
    }

    // Create first super admin
    const email = process.env.PLATFORM_ADMIN_EMAIL || "admin@yourcompany.com";
    const password = process.env.PLATFORM_ADMIN_PASSWORD || "admin123";
    const name = process.env.PLATFORM_ADMIN_NAME || "Platform Administrator";

    const admin = await platformAdminAuthService.createPlatformAdmin({
      email,
      password,
      name,
      role: "super_admin",
    });

    console.log("✅ First platform admin created successfully!");
    console.log(`📧 Email: ${admin.email}`);
    console.log(`👤 Name: ${admin.name}`);
    console.log(`🔑 Role: ${admin.role}`);
    console.log("");
    console.log("⚠️  IMPORTANT: Change the default password immediately!");
    console.log("");
    console.log("🔗 Platform admin login: http://localhost:3000/admin/login");
    console.log("");
  } catch (error) {
    console.error("❌ Error creating platform admin:", error);
    process.exit(1);
  }
}

// Auto-execute if this is the main module
createFirstPlatformAdmin()
  .then(() => {
    console.log("Platform admin setup completed.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Setup failed:", error);
    process.exit(1);
  });

export { createFirstPlatformAdmin };
