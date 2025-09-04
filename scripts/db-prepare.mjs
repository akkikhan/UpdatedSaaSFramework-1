#!/usr/bin/env node
import { Pool } from 'pg';

const urlLine = (process.env.DATABASE_URL || '').trim();
if (!urlLine) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1|@postgres(?::|\b)/i.test(urlLine);
const pool = new Pool({
  connectionString: urlLine,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await client.query(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='platform_admins') AND
         NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='platform_admins_email_unique') THEN
        ALTER TABLE platform_admins ADD CONSTRAINT platform_admins_email_unique UNIQUE (email);
      END IF;
    END$$;`);
    console.log('DB prepare completed');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error('DB prepare failed:', e); process.exit(1); });

