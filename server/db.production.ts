// Production Database Configuration
// Requires real PostgreSQL - no in-memory fallback

import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || "development";
const ALLOW_IN_MEMORY = process.env.ALLOW_IN_MEMORY_DB === "true";

// Validate DATABASE_URL exists
if (!DATABASE_URL) {
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("❌ FATAL: DATABASE_URL environment variable is required");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("");
  console.error("Please set DATABASE_URL in your .env file:");
  console.error("");
  console.error("For Azure PostgreSQL:");
  console.error(
    "  DATABASE_URL=postgresql://user:pass@server.postgres.database.azure.com:5432/db?sslmode=require"
  );
  console.error("");
  console.error("For Neon:");
  console.error(
    "  DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require"
  );
  console.error("");
  console.error("For local development:");
  console.error("  DATABASE_URL=postgresql://user:pass@localhost:5432/db");
  console.error("");
  process.exit(1);
}

// Warn about demo/insecure credentials
if (DATABASE_URL.includes("demo:demo") || DATABASE_URL.includes("localhost")) {
  if (NODE_ENV === "production") {
    console.error("❌ FATAL: Cannot use localhost/demo credentials in production");
    process.exit(1);
  }
  console.warn("⚠️  Warning: Using local development database");
}

let pool: Pool;
let db: NodePgDatabase<typeof schema>;

function initializeDatabase(): void {
  try {
    // Determine SSL requirements
    const isLocal = /localhost|127\.0\.0\.1/i.test(DATABASE_URL!);
    const isCosmos = DATABASE_URL!.includes("postgres.cosmos.azure.com");
    const requiresSsl = !isLocal;

    const connectionConfig = {
      connectionString: DATABASE_URL,
      ssl: requiresSsl
        ? {
            rejectUnauthorized: false, // Azure/Neon/Cosmos use self-signed certs
          }
        : false,
      // Connection pooling configuration
      // Cosmos DB coordinator supports up to 300 connections total
      // Adjust based on your deployment (multiple app instances)
      max: isCosmos ? 20 : 20, // Maximum pool size (reduce if using PgBouncer)
      min: 5, // Minimum pool size
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 10000, // Fail after 10s if can't connect
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      // Statement timeout
      statement_timeout: 30000, // 30 second query timeout
    };

    pool = new Pool(connectionConfig);
    db = drizzle(pool, { schema });

    // Test connection
    pool
      .query("SELECT 1")
      .then(() => {
        const dbType = isCosmos ? "Cosmos DB for PostgreSQL" : "PostgreSQL";
        console.log(`✅ Database connection established (${dbType})`);
        console.log(`   Environment: ${NODE_ENV}`);
        console.log(`   SSL: ${requiresSsl ? "enabled" : "disabled (local)"}`);
        console.log(`   Pool: ${connectionConfig.min}-${connectionConfig.max} connections`);

        // Log Citus info if using Cosmos
        if (isCosmos) {
          pool
            .query("SELECT count(*) as worker_count FROM pg_dist_node WHERE noderole = 'primary'")
            .then(result => {
              console.log(`   Worker nodes: ${result.rows[0].worker_count}`);
            })
            .catch(() => {
              // Ignore if Citus not available
            });
        }
      })
      .catch(error => {
        console.error("❌ Database connection test failed:", error.message);
        process.exit(1);
      });

    // Handle pool errors
    pool.on("error", err => {
      console.error("❌ Unexpected database pool error:", err);
      // Don't exit - let the app try to recover
    });
  } catch (error) {
    console.error("❌ Fatal database initialization error:", error);
    process.exit(1);
  }
}

initializeDatabase();

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("⏳ Closing database connections...");
  try {
    await pool.end();
    console.log("✅ Database connections closed");
  } catch (error) {
    console.error("❌ Error closing database:", error);
  }
});

export { pool, db };
