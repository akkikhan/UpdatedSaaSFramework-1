const { SaaSRBAC } = require("./dist/index.js");

// Example usage of the SaaS RBAC SDK
async function exampleUsage() {
  try {
    // Initialize the RBAC client
    const rbac = new SaaSRBAC({
      apiKey: "rbac_pqr678stu901vwx234yz567", // Your tenant's RBAC API key
      baseUrl: "https://your-platform.replit.app/api/v2/rbac",
    });

    console.log("🛡️  SaaS RBAC SDK Example");
    console.log("=========================");

    // Example user ID (would come from your authentication system)
    const userId = "user123";

    // Example 1: Check single permission
    console.log("1. Single Permission Check:");
    try {
      const canEdit = await rbac.hasPermission(userId, "posts.edit");
      console.log("✅ Can edit posts:", canEdit);
    } catch (error) {
      console.log("❌ Permission check failed:", error.message);
    }

    // Example 2: Check multiple permissions
    console.log("\n2. Multiple Permission Check:");
    try {
      const permissions = await rbac.hasPermissions(userId, [
        "posts.create",
        "posts.edit",
        "posts.delete",
        "admin.panel",
      ]);
      console.log("✅ Permission results:", permissions);
    } catch (error) {
      console.log("❌ Permission check failed:", error.message);
    }

    // Example 3: Get user roles
    console.log("\n3. Get User Roles:");
    try {
      const roles = await rbac.getUserRoles(userId);
      console.log(
        "✅ User roles:",
        roles.map(r => ({ name: r.name, permissions: r.permissions.length }))
      );
    } catch (error) {
      console.log("❌ Failed to get roles:", error.message);
    }

    // Example 4: Get user permissions
    console.log("\n4. Get User Permissions:");
    try {
      const userPermissions = await rbac.getUserPermissions(userId);
      console.log("✅ User permissions:", userPermissions);
    } catch (error) {
      console.log("❌ Failed to get permissions:", error.message);
    }

    console.log("\n🎯 Example completed!");
    console.log("\nTo use this in your Express.js app:");
    console.log("// Require specific permission:");
    console.log('app.get("/admin", rbac.middleware(["admin.access"]), handler);');
    console.log("\n// Require specific role:");
    console.log('app.get("/admin", rbac.roleMiddleware(["admin"]), handler);');
  } catch (error) {
    console.error("Error in example:", error);
  }
}

// Run the example
if (require.main === module) {
  exampleUsage();
}

module.exports = { exampleUsage };
