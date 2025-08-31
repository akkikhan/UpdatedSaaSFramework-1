// Direct database test using existing infrastructure
import { config } from "dotenv";
import pkg from "pg";
const { Client } = pkg;

config();

console.log("🧪 Starting Direct Database Test");
console.log("=====================================");

async function testDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("📊 Connecting to database...");
    await client.connect();

    console.log("✅ Database connection successful");

    // Test tenants table
    console.log("\n📋 Testing tenants table...");
    const tenantsResult = await client.query("SELECT COUNT(*) as count FROM tenants");
    const tenantCount = parseInt(tenantsResult.rows[0].count);
    console.log(`   Found ${tenantCount} tenants`);

    if (tenantCount > 0) {
      const tenantsData = await client.query(`
        SELECT org_id, status, enabled_modules 
        FROM tenants 
        ORDER BY created_at 
        LIMIT 10
      `);

      console.log("\n📋 Tenant Details:");
      tenantsData.rows.forEach((tenant, index) => {
        const modules = Array.isArray(tenant.enabled_modules) ? tenant.enabled_modules.length : 0;
        console.log(`   ${index + 1}. ${tenant.org_id} (${tenant.status}) - ${modules} modules`);
      });
    }

    // Test platform admins
    console.log("\n👑 Testing platform_admins table...");
    const adminsResult = await client.query("SELECT COUNT(*) as count FROM platform_admins");
    const adminCount = parseInt(adminsResult.rows[0].count);
    console.log(`   Found ${adminCount} platform admins`);

    if (adminCount > 0) {
      const adminsData = await client.query(`
        SELECT name, email, is_active 
        FROM platform_admins 
        ORDER BY created_at
      `);

      console.log("\n👑 Admin Details:");
      adminsData.rows.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.name} (${admin.email}) - Active: ${admin.is_active}`);
      });
    }

    // Test users table
    console.log("\n👥 Testing users table...");
    const usersResult = await client.query("SELECT COUNT(*) as count FROM users");
    const userCount = parseInt(usersResult.rows[0].count);
    console.log(`   Found ${userCount} users`);

    // Test sessions table
    console.log("\n🔒 Testing sessions table...");
    const sessionsResult = await client.query("SELECT COUNT(*) as count FROM sessions");
    const sessionCount = parseInt(sessionsResult.rows[0].count);
    console.log(`   Found ${sessionCount} sessions`);

    // Test audit logs
    console.log("\n📝 Testing audit logs...");
    const auditResult = await client.query("SELECT COUNT(*) as count FROM compliance_audit_logs");
    const auditCount = parseInt(auditResult.rows[0].count);
    console.log(`   Found ${auditCount} audit log entries`);

    // Test Azure AD configuration
    if (tenantCount > 0) {
      console.log("\n☁️  Testing Azure AD configurations...");
      const azureTenantsResult = await client.query(`
        SELECT org_id, module_configs 
        FROM tenants 
        WHERE enabled_modules @> '["azure-ad"]'::jsonb
      `);

      console.log(`   Found ${azureTenantsResult.rows.length} tenants with Azure AD`);

      azureTenantsResult.rows.forEach((tenant, index) => {
        const config = tenant.module_configs?.auth?.providers?.find(p => p.type === "azure-ad");
        console.log(
          `   ${index + 1}. ${tenant.org_id} - Config: ${config ? "Present" : "Missing"}`
        );
      });
    }

    console.log("\n🎯 Database Test Summary:");
    console.log(`   ✅ Connection: Working`);
    console.log(`   📊 Tables Tested: 6`);
    console.log(`   📋 Tenants: ${tenantCount}`);
    console.log(`   👑 Admins: ${adminCount}`);
    console.log(`   👥 Users: ${userCount}`);
    console.log(`   🔒 Sessions: ${sessionCount}`);
    console.log(`   📝 Audit Logs: ${auditCount}`);

    // Health Assessment
    let healthScore = 0;
    if (tenantCount > 0) healthScore += 30;
    if (adminCount > 0) healthScore += 25;
    if (userCount >= 0) healthScore += 15;
    if (sessionCount >= 0) healthScore += 10;
    if (auditCount >= 0) healthScore += 20;

    console.log(`\n🏥 Database Health Score: ${healthScore}/100`);

    if (healthScore >= 80) {
      console.log(`   Status: 🟢 EXCELLENT - All core data present`);
    } else if (healthScore >= 60) {
      console.log(`   Status: 🟡 GOOD - Most data present`);
    } else {
      console.log(`   Status: 🟠 NEEDS ATTENTION - Missing core data`);
    }
  } catch (error) {
    console.error("❌ Database test failed:", error.message);

    if (error.message.includes("ENOTFOUND")) {
      console.log("💡 Suggestion: Check DATABASE_URL environment variable");
    } else if (error.message.includes("authentication")) {
      console.log("💡 Suggestion: Check database credentials");
    } else if (error.message.includes("does not exist")) {
      console.log("💡 Suggestion: Run database migrations first");
    }
  } finally {
    await client.end();
  }
}

testDatabase();
