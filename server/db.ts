// Environment variables loaded by main server/index.ts

import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { newDb } from "pg-mem";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import * as schema from "../shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;
const USING_DEMO_CREDENTIALS = !DATABASE_URL || DATABASE_URL.includes("demo:demo@localhost");

if (USING_DEMO_CREDENTIALS) {
  console.warn(
    "[warn] DATABASE_URL not set or using demo credentials. Falling back to in-memory database for development/testing."
  );
  console.warn("   1. Create a PostgreSQL database (Neon, Supabase, local, etc.) when ready");
  console.warn("   2. Add DATABASE_URL=your_connection_string to your .env file");
  console.warn("   3. Restart the application");
}

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

function initializeDatabase(): void {
  if (DATABASE_URL && !USING_DEMO_CREDENTIALS) {
    try {
      const isLocal = /localhost|127\.0\.0\.1|@postgres(?::|\b)/i.test(DATABASE_URL);
      const connectionConfig = {
        connectionString: DATABASE_URL,
        ssl: isLocal
          ? false
          : {
              rejectUnauthorized: false,
            },
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 0,
      } as const;

      pool = new Pool(connectionConfig);
      db = drizzle(pool, { schema });
      console.log("[ok] Database connection established");
      return;
    } catch (error) {
      console.error("[error] Database connection failed:", error);
      pool = null;
      db = null;
    }
  }

  console.warn("[info] Using pg-mem in-memory database. Data will reset on restart.");
  const mem = newDb({ autoCreateForeignKeyIndices: true });

  mem.public.registerFunction({
    name: "gen_random_uuid",
    returns: "uuid",
    implementation: randomUUID,
  });
  mem.public.registerFunction({
    name: "uuid_generate_v4",
    returns: "uuid",
    implementation: randomUUID,
  });
  mem.public.registerFunction({
    name: "now",
    returns: "timestamp",
    implementation: () => new Date(),
  });

  const migrationsDir = path.resolve(process.cwd(), "migrations");

  try {
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const sqlRaw = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      const sanitized = sqlRaw.replace(/CREATE\s+EXTENSION[^;]+;/gi, "");

      const withoutProcedural = sanitized.replace(/DO\s+\$\$[\s\S]+?\$\$\s*;/gi, "");

      const statements = withoutProcedural
        .split(/;[\r\n]+/)
        .map(rawStatement => {
          const cleanedLines = rawStatement
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith("--"));
          return cleanedLines.join("\n").trim();
        })
        .filter(statement => statement.length > 0);

      for (const statement of statements) {
        try {
          mem.public.none(`${statement};`);
          console.log(`[pg-mem] Applied statement from ${file}: ${statement}`);
        } catch (statementError) {
          const message = statementError instanceof Error ? statementError.message : String(statementError);
          const missingRelation = /relation \".+\" does not exist/i.test(message);
          if (missingRelation) {
            console.warn(`[pg-mem] Skipping statement from ${file} due to missing relation: ${statement}`);
            continue;
          }

          const trimmedStatement = statement.trim().toUpperCase();
          const isDoBlock = trimmedStatement.startsWith("DO ");
          const invalidSyntax = /invalid syntax/i.test(message);
          if (isDoBlock && invalidSyntax) {
            console.warn(`[pg-mem] Skipping DO block from ${file}: ${statement}`);
            continue;
          }

          const parseFailure = /failed to parse|syntax error/i.test(message);
          if (parseFailure) {
            console.warn(`[pg-mem] Skipping unsupported statement from ${file}: ${statement}`);
            continue;
          }

          console.error(`[error] Failed to run migration statement from ${file}:`, statement);
          throw statementError;
        }
      }
    }
  } catch (error) {
    console.error("[error] Failed to apply migrations to pg-mem:", error);
    throw error;
  }

  const adapter = mem.adapters.createPg();
  pool = new adapter.Pool();
  db = drizzle(pool, { schema });
  console.log("[ok] In-memory pg-mem database initialised");
}

initializeDatabase();

export { pool };
export { db };
