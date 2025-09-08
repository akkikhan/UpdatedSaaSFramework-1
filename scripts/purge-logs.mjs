#!/usr/bin/env node
import { config } from 'dotenv';
config();

// Use ESM imports from server
import { db } from '../server/db.ts';
import { storage } from '../server/storage.ts';

async function main() {
  try {
    // Fetch all tenants and purge based on per-tenant retentionDays (default 30)
    const tenants = await storage.getAllTenants();
    let total = 0;
    for (const t of tenants) {
      const days = Number(((t.moduleConfigs || {})?.logging?.retentionDays) || 30);
      await storage.purgeOldLogs(t.id, days);
      total++;
    }
    console.log(`Purge complete for ${total} tenants.`);
    process.exit(0);
  } catch (e) {
    console.error('Purge failed:', e?.message || e);
    process.exit(1);
  }
}

main();

