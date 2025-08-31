import { db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function setupPlatformAdmins() {
  try {
    console.log("Setting up platform_admins table...");

    // Create the platform_admins table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS platform_admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      );
    `);

    console.log("✅ platform_admins table created successfully");

    // Create indexes
    try {
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);`
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS idx_platform_admins_active ON platform_admins(is_active);`
      );
      console.log("✅ Indexes created successfully");
    } catch (indexError) {
      console.log("ℹ️ Indexes already exist or creation skipped");
    }

    // Check if any platform admins exist
    const existingAdmins = await db.execute(sql`SELECT COUNT(*) FROM platform_admins;`);
    const adminCount = existingAdmins[0]?.count || 0;

    if (Number(adminCount) > 0) {
      console.log(`ℹ️ ${adminCount} platform admin(s) already exist`);

      // Show existing admins
      const admins = await db.execute(sql`
        SELECT email, name, role, is_active, created_at 
        FROM platform_admins 
        ORDER BY created_at;
      `);

      console.log("Existing platform admins:");
      admins.forEach((admin: any) => {
        console.log(
          `- ${admin.email} (${admin.name}) - Role: ${admin.role} - Active: ${admin.is_active}`
        );
      });

      return;
    }

    // Create first super admin
    const email = process.env.PLATFORM_ADMIN_EMAIL || "admin@yourcompany.com";
    const password = process.env.PLATFORM_ADMIN_PASSWORD || "admin123";
    const name = process.env.PLATFORM_ADMIN_NAME || "Platform Administrator";

    console.log("Creating first platform admin...");

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert the admin
    await db.execute(sql`
      INSERT INTO platform_admins (email, password_hash, name, role) 
      VALUES (${email}, ${passwordHash}, ${name}, 'super_admin');
    `);

    console.log("");
    console.log("🎉 SUCCESS! First platform admin created successfully!");
    console.log("");
    console.log("📧 Email: " + email);
    console.log("👤 Name: " + name);
    console.log("🔑 Role: super_admin");
    console.log("🔒 Password: " + password);
    console.log("");
    console.log("⚠️  IMPORTANT: Change the default password immediately!");
    console.log("");
    console.log("🔗 You can now access:");
    console.log("   • Platform Admin API: http://localhost:3000/api/platform/auth/login");
    console.log("   • Azure AD Test Page: http://localhost:3000/azure-ad-test.html");
    console.log("");
    console.log("🚀 Next steps:");
    console.log("   1. Start the dev server: npm run dev");
    console.log("   2. Open the Azure AD test page");
    console.log("   3. Login as platform admin");
    console.log("   4. Configure Azure AD for a tenant");
    console.log("   5. Test the OAuth flow");
    console.log("");
  } catch (error) {
    console.error("❌ Error setting up platform admins:", error);
    process.exit(1);
  }
}

// Auto-execute
setupPlatformAdmins()
  .then(() => {
    console.log("Platform admin setup completed successfully.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
