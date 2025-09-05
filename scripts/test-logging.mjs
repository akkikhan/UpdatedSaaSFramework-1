#!/usr/bin/env node
import fetch from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const KEY = process.env.LOGGING_API_KEY || process.env.X_API_KEY;

if (!KEY) {
  console.error('Set LOGGING_API_KEY in env.');
  process.exit(1);
}

async function postEvent() {
  const res = await fetch(`${BASE}/api/v2/logging/events`, {
    method: 'POST',
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'info',
      message: 'Quickstart test event',
      category: 'quickstart',
      metadata: { ts: new Date().toISOString() },
    }),
  });
  if (!res.ok) throw new Error(`Ingest failed: ${res.status}`);
  return res.json();
}

async function queryEvents() {
  const res = await fetch(`${BASE}/api/v2/logging/events?category=quickstart&limit=5`, {
    headers: { 'X-API-Key': KEY },
  });
  if (!res.ok) throw new Error(`Query failed: ${res.status}`);
  return res.json();
}

(async () => {
  try {
    await postEvent();
    const list = await queryEvents();
    console.log('Recent logging events:', list);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
})();
