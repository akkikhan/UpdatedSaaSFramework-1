import { config } from "dotenv";
config();

import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function testDbConnection() {
  console.log("🔍 Testing database connection...");

  try {
    if (!db) {
      throw new Error("Database connection is null");
    }

    // Simple query to test connection
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log("✅ Database connection successful:", result);
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

testDbConnection();
