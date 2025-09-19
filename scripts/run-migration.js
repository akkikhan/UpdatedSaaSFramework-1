const sql = require("mssql");
const path = require("path");
const fs = require("fs");

async function runMigration() {
  // Database configuration - UPDATE THESE VALUES
  const config = {
    server: "localhost", // Your SQL Server instance
    database: "UpdatedSaaSFramework", // Your database name
    authentication: {
      type: "default", // Use 'default' for Windows Authentication or 'sqlServer' for SQL auth
    },
    options: {
      encrypt: false, // Set to true for Azure SQL
      trustServerCertificate: true, // For local development
    },
    // For SQL Server authentication (username/password):
    // user: 'your_username',
    // password: 'your_password',
  };

  try {
    console.log("Connecting to database...");
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log("Connected successfully!");

    // Read and execute migration script
    const migrationPath = path.join(__dirname, "../migrations/002_normalize_admin_emails.sql");
    const sqlScript = fs.readFileSync(migrationPath, "utf8");

    console.log("Executing migration...");
    const result = await pool.request().query(sqlScript);
    console.log("Migration executed successfully!");
    console.log("Results:", result);

    // Verification query
    console.log("\nRunning verification...");
    const verifyQuery = `
      SELECT 
        'tenants' as table_name,
        count(*) as total,
        count(CASE WHEN admin_email IS NOT NULL THEN 1 END) as with_email,
        count(CASE WHEN admin_email != LOWER(TRIM(admin_email)) THEN 1 END) as still_mixed_case
      FROM tenants
      UNION ALL
      SELECT 
        'tenant_users' as table_name,
        count(*) as total,
        count(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
        count(CASE WHEN email != LOWER(TRIM(email)) THEN 1 END) as still_mixed_case
      FROM tenant_users;
    `;
    const verifyResult = await pool.request().query(verifyQuery);
    console.table(verifyResult.recordset);

    // Check audit log
    const auditQuery = "SELECT TOP 10 * FROM email_normalization_log ORDER BY normalized_at DESC;";
    const auditResult = await pool.request().query(auditQuery);
    console.log("\nRecent normalization audit entries:");
    console.table(auditResult.recordset);

    await pool.close();
    console.log("\nMigration completed successfully! Restart your server and test the login.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

// Run the migration
runMigration();
