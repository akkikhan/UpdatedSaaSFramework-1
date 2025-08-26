import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL || DATABASE_URL.includes('demo:demo@localhost')) {
  console.warn("⚠️  DATABASE_URL not set or using demo credentials. Database operations will fail.");
  console.warn("📝 To fix this:");
  console.warn("   1. Create a free PostgreSQL database at https://neon.tech or https://supabase.com");
  console.warn("   2. Add DATABASE_URL=your_connection_string to your .env file");
  console.warn("   3. Restart the application");
}

// Create a mock pool if no database URL is provided (for demo purposes)
let pool = null;
/**
 * Represents the global database connection instance.
 *
 * @remarks
 * This variable is initialized to `null` and is expected to be assigned an active
 * database connection object during the application's startup process.
 * All database interactions within the application should utilize this instance
 * once it has been established.
 *
 * @type {any | null}
 */
let db = null;

if (DATABASE_URL && !DATABASE_URL.includes('demo:demo@localhost')) {
  try {
    // Use standard PostgreSQL driver with SSL configuration
    const connectionConfig = {
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Handle certificate issues
      }
    };
    
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