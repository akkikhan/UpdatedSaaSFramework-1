import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  connectionString:
    process.env.DATABASE_URL || "postgresql://saasuser:devpassword123@localhost:5432/saasdb",
});

async function clearDatabase() {
  try {
    await client.connect();
    console.log("🔌 Connected to database");

    // Delete in order to respect foreign key constraints
    const tables = [
      "user_roles",
      "tenant_user_roles",
      "sessions",
      "roles",
      "tenant_roles",
      "users",
      "tenant_users",
      "tenants",
      "platform_admins",
    ];

    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`🗑️  Cleared ${result.rowCount} rows from ${table}`);
      } catch (error) {
        // Table might not exist or have data, that's ok
        console.log(`ℹ️  Skipped ${table}: ${error.message.split("\n")[0]}`);
      }
    }

    console.log("✅ Database cleared successfully");
  } catch (error) {
    console.error("❌ Error clearing database:", error.message);
  } finally {
    await client.end();
  }
}

clearDatabase();
