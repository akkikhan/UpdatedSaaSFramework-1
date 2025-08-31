import { config } from "dotenv";
import { Pool } from "pg";

// Load environment variables
config();

async function testDatabaseConnection() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in environment variables");
    return false;
  }

  console.log("🔗 Testing database connection...");
  console.log("📍 Database URL:", DATABASE_URL.replace(/:[^:]*@/, ":***@")); // Hide password

  try {
    // Create connection pool
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    // Test connection
    const client = await pool.connect();
    console.log("✅ Database connection established successfully");

    // Test basic query
    const result = await client.query("SELECT NOW() as current_time, version() as pg_version");
    console.log("⏰ Database time:", result.rows[0].current_time);
    console.log(
      "🗄️  PostgreSQL version:",
      result.rows[0].pg_version.split(" ")[0] + " " + result.rows[0].pg_version.split(" ")[1]
    );

    // Test if we can see our tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log("📋 Tables in database:", tablesResult.rows.length);
    if (tablesResult.rows.length > 0) {
      console.log("   Tables found:", tablesResult.rows.map(row => row.table_name).join(", "));
    } else {
      console.log("   No tables found (database might be empty)");
    }

    // Check if our specific tables exist
    const ourTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('platform_admins', 'tenants', 'users')
      ORDER BY table_name
    `);

    if (ourTablesResult.rows.length > 0) {
      console.log(
        "🏗️  Our SaaS tables found:",
        ourTablesResult.rows.map(row => row.table_name).join(", ")
      );
    } else {
      console.log("⚠️  Our SaaS tables not found - database may need migration");
    }

    client.release();
    await pool.end();

    return true;
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error("   Error type:", error.name);
    console.error("   Error message:", error.message);
    if (error.code) {
      console.error("   Error code:", error.code);
    }
    return false;
  }
}

// Run the test
testDatabaseConnection()
  .then(success => {
    console.log("\n" + "=".repeat(50));
    if (success) {
      console.log("🎉 Database connection verification PASSED");
    } else {
      console.log("💥 Database connection verification FAILED");
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });
