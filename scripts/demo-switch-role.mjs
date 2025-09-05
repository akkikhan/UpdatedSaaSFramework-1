#!/usr/bin/env node
// Assign a given role to a given user within a tenant
// Usage: BASE_URL=http://localhost:5000 ORG_ID=acme EMAIL=admin@acme.com PASSWORD=... TARGET_EMAIL=adjuster@example.com ROLE=Approver node scripts/demo-switch-role.mjs

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const ORG_ID = process.env.ORG_ID;
const ADMIN_EMAIL = process.env.EMAIL;
const ADMIN_PASSWORD = process.env.PASSWORD;
const TARGET_EMAIL = process.env.TARGET_EMAIL;
const ROLE = process.env.ROLE; // e.g., Adjuster or Approver

if (!ORG_ID || !ADMIN_EMAIL || !ADMIN_PASSWORD || !TARGET_EMAIL || !ROLE) {
  console.error('Missing env. Required: ORG_ID, EMAIL, PASSWORD, TARGET_EMAIL, ROLE');
  process.exit(1);
}

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${json?.message || res.statusText}`);
  return json;
};

const main = async () => {
  const tenant = await fetchJson(`${BASE}/api/tenants/by-org-id/${ORG_ID}`);
  const tenantId = tenant.id;
  const login = await fetchJson(`${BASE}/api/v2/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orgId: ORG_ID, email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  const headers = { authorization: `Bearer ${login.token}`, 'x-tenant-id': tenantId };

  const users = await fetchJson(`${BASE}/auth/users`, { headers: { 'x-tenant-id': tenantId } });
  const target = users.find(u => String(u.email).toLowerCase() === TARGET_EMAIL.toLowerCase());
  if (!target) throw new Error(`User not found: ${TARGET_EMAIL}`);

  const roles = await fetchJson(`${BASE}/api/v2/rbac/roles`, { headers });
  const role = roles.find(r => String(r.name).toLowerCase() === ROLE.toLowerCase());
  if (!role) throw new Error(`Role not found: ${ROLE}`);

  await fetchJson(`${BASE}/rbac/users/${target.id}/roles`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ roleId: role.id })
  });
  console.log(`✅ Assigned role ${role.name} to ${target.email}`);
};

main().catch(err => { console.error('❌', err.message || String(err)); process.exit(1); });

