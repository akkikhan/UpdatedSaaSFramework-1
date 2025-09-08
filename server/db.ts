import { config } from "dotenv";

// Load environment variables first
config();

import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL || DATABASE_URL.includes("demo:demo@localhost")) {
  console.warn(
    "⚠️  DATABASE_URL not set or using demo credentials. Database operations will fail."
  );
  console.warn("📝 To fix this:");
  console.warn(
    "   1. Create a free PostgreSQL database at https://neon.tech or https://supabase.com"
  );
  console.warn("   2. Add DATABASE_URL=your_connection_string to your .env file");
  console.warn("   3. Restart the application");
}

// Create a mock pool if no database URL is provided (for demo purposes)
let pool: Pool | null = null;
/**
 * Represents the global database connection instance.
 *
 * @remarks
 * This variable is initialized to `null` and is expected to be assigned an active
 * database connection object during the application's startup process.
 * All database interactions within the application should utilize this instance
 * once it has been established.
 *
 * @type {NodePgDatabase<typeof schema> | null}
 */
let db: NodePgDatabase<typeof schema> | null = null;

if (DATABASE_URL && !DATABASE_URL.includes("demo:demo@localhost")) {
  try {
    // Use standard PostgreSQL driver with SSL configuration
    const isLocal = /localhost|127\.0\.0\.1|@postgres(?::|\b)/i.test(DATABASE_URL);
    const connectionConfig = {
      connectionString: DATABASE_URL,
      ssl: isLocal
        ? false
        : {
            rejectUnauthorized: false, // Handle certificate issues for cloud DBs
          },
      // Improve resilience and avoid slow IPv6 stalls
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 0,
    } as const;

    pool = new Pool(connectionConfig);
    db = drizzle(pool, { schema });
    console.log("✅ Database connection established");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    pool = null;
    db = null;
  }
} else {
  console.log("🚧 Running in demo mode without database connection");
}

export { pool };
export { db };
