// Script to migrate existing tenant users from users table to tenantUsers table
import { db } from "./server/db.js";
import { users, tenantUsers } from "./shared/schema.js";
import { eq } from "drizzle-orm";

async function migrateTenantUsers() {
  console.log("🔄 Starting tenant user migration...");

  try {
    // Get all users from the users table
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users in users table`);

    for (const user of allUsers) {
      // Check if user already exists in tenantUsers table
      const existingTenantUser = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.email, user.email))
        .limit(1);

      if (existingTenantUser.length > 0) {
        console.log(`✅ User ${user.email} already exists in tenantUsers table`);
        continue;
      }

      // Migrate user to tenantUsers table
      await db.insert(tenantUsers).values({
        tenantId: user.tenantId,
        email: user.email,
        name: user.email.split("@")[0], // Use email prefix as name
        passwordHash: user.passwordHash,
        status: user.isActive ? "active" : "inactive",
        isEmailVerified: true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt || new Date(),
      });

      console.log(`✅ Migrated user ${user.email} to tenantUsers table`);
    }

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

migrateTenantUsers();
