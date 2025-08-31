// Simple database test without complex imports
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

console.log("🧪 Starting Simple Database Test");
console.log("=====================================");

const supabaseUrl = process.env.DATABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[0];
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase configuration");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Present" : "Missing");
  console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "Present" : "Missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  try {
    console.log("📊 Testing database connection...");

    // Test basic query
    const { data: tenants, error } = await supabase.from("tenants").select("*").limit(10);

    if (error) {
      console.error("❌ Database query failed:", error);
      return;
    }

    console.log(`✅ Database connection successful`);
    console.log(`📋 Found ${tenants?.length || 0} tenants`);

    if (tenants && tenants.length > 0) {
      console.log("\n📋 Tenant Summary:");
      tenants.forEach((tenant, index) => {
        console.log(
          `   ${index + 1}. ${tenant.org_id} (${tenant.status}) - ${tenant.enabled_modules?.length || 0} modules`
        );
      });
    }

    // Test platform admins
    const { data: admins, error: adminError } = await supabase.from("platform_admins").select("*");

    if (adminError) {
      console.error("❌ Platform admin query failed:", adminError);
      return;
    }

    console.log(`\n👑 Found ${admins?.length || 0} platform admins`);

    if (admins && admins.length > 0) {
      console.log("\n👑 Admin Summary:");
      admins.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.name} (${admin.email}) - Active: ${admin.is_active}`);
      });
    }

    console.log("\n🎯 Database Test Results:");
    console.log(`   ✅ Connection: Working`);
    console.log(`   📊 Tenants: ${tenants?.length || 0}`);
    console.log(`   👑 Admins: ${admins?.length || 0}`);
    console.log(`   📈 Health: ${tenants?.length > 0 ? "Excellent" : "Needs Setup"}`);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testDatabase();
