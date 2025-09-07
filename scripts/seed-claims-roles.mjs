#!/usr/bin/env node
// Seed three RBAC roles and demo users for the Claims app
// Requires: tenant orgId, an admin or any tenant user credentials to authorize RBAC role creation

import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const ORG_ID = process.env.ORG_ID || process.env.TENANT_ORG_ID;
const ADMIN_EMAIL = process.env.EMAIL || process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PASSWORD || process.env.ADMIN_PASSWORD;

if (!ORG_ID) {
  console.error('ORG_ID is required (env ORG_ID=acme)');
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('EMAIL and PASSWORD env vars are required to create roles.');
  console.error('Set EMAIL and PASSWORD for a tenant user (e.g., the admin).');
  process.exit(1);
}

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const msg = json?.message || json?.error || res.statusText;
    throw new Error(`${res.status} ${msg}`);
  }
  return json;
};

const main = async () => {
  console.log(`➡️  Using base: ${BASE}, orgId: ${ORG_ID}`);
  // 1) Resolve tenantId from orgId
  const tenant = await fetchJson(`${BASE}/api/tenants/by-org-id/${ORG_ID}`);
  const tenantId = tenant.id;
  console.log(`🏢 Tenant: ${tenant.name} (${tenantId})`);

  // 2) Login to get JWT
  const login = await fetchJson(`${BASE}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orgId: ORG_ID, email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  const token = login.token;
  const authHeaders = { 'authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };
  console.log(`✅ Authenticated as ${login.user?.email}`);

  // 3) Create roles if missing
  const desired = [
    { name: 'Viewer', description: 'Can view claims', permissions: ['claims.read'] },
    { name: 'Adjuster', description: 'Can view and update claims', permissions: ['claims.read','claims.update'] },
    { name: 'Approver', description: 'Can approve claims', permissions: ['claims.read','claims.update','claims.approve'] },
  ];
  const existing = await fetchJson(`${BASE}/api/v2/rbac/roles`, { headers: authHeaders });
  const byName = new Map(existing.map(r => [String(r.name).toLowerCase(), r]));
  const created = [];
  for (const role of desired) {
    if (byName.has(role.name.toLowerCase())) {
      console.log(`• Role exists: ${role.name}`);
      created.push(byName.get(role.name.toLowerCase()));
      continue;
    }
    const r = await fetchJson(`${BASE}/api/v2/rbac/roles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify(role)
    });
    console.log(`➕ Created role: ${r.name}`);
    created.push(r);
  }

  // 4) Ensure three demo users exist
  const users = await fetchJson(`${BASE}/auth/users`, { headers: { 'x-tenant-id': tenantId } });
  const needUsers = [
    { email: 'viewer@example.com', firstName: 'Violet', lastName: 'Viewer', password: 'Passw0rd!' },
    { email: 'adjuster@example.com', firstName: 'Alex', lastName: 'Adjuster', password: 'Passw0rd!' },
    { email: 'approver@example.com', firstName: 'Riley', lastName: 'Approver', password: 'Passw0rd!' },
  ];

  const ensureUser = async (u) => {
    let existingUser = users.find(x => String(x.email).toLowerCase() === u.email.toLowerCase());
    if (existingUser) {
      console.log(`• User exists: ${u.email}`);
      return existingUser;
    }
    const createdUser = await fetchJson(`${BASE}/auth/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify(u)
    });
    console.log(`👤 Created user: ${createdUser.email}`);
    return createdUser;
  };

  const uViewer = await ensureUser(needUsers[0]);
  const uAdjuster = await ensureUser(needUsers[1]);
  const uApprover = await ensureUser(needUsers[2]);

  // 5) Assign roles to users
  const roleByName = new Map(created.concat(existing).map(r => [String(r.name).toLowerCase(), r]));
  const viewerRole = roleByName.get('viewer');
  const adjusterRole = roleByName.get('adjuster');
  const approverRole = roleByName.get('approver');

  const assign = async (userId, roleId) => {
    await fetchJson(`${BASE}/rbac/users/${userId}/roles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify({ roleId })
    });
  };

  await assign(uViewer.id, viewerRole.id);
  console.log(`🔗 Assigned Viewer -> ${uViewer.email}`);
  await assign(uAdjuster.id, adjusterRole.id);
  console.log(`🔗 Assigned Adjuster -> ${uAdjuster.email}`);
  await assign(uApprover.id, approverRole.id);
  console.log(`🔗 Assigned Approver -> ${uApprover.email}`);

  console.log('\n✅ RBAC seed complete. Demo accounts:');
  console.log('   - viewer@example.com / Passw0rd! (Viewer)');
  console.log('   - adjuster@example.com / Passw0rd! (Adjuster)');
  console.log('   - approver@example.com / Passw0rd! (Approver)');
  console.log('\nUse orgId:', ORG_ID);
};

main().catch(err => {
  console.error('❌ Seed failed:', err?.message || err);
  process.exit(1);
});

