#!/usr/bin/env node
// Seed default RBAC configuration entries so onboarding and config UIs stay in sync

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const TOKEN = process.env.PLATFORM_ADMIN_TOKEN || process.env.ADMIN_TOKEN;

if (!TOKEN) {
  console.error('PLATFORM_ADMIN_TOKEN env var required');
  process.exit(1);
}

const headers = {
  'content-type': 'application/json',
  authorization: `Bearer ${TOKEN}`,
};

const permissionTemplates = [
  {
    name: 'Standard',
    description: 'Basic set of permissions for general use cases.',
    permissions: ['user.create', 'user.read', 'user.update', 'user.delete', 'role.read'],
    businessTypes: ['general'],
    isDefault: true,
  },
  {
    name: 'Enterprise',
    description: 'Expanded permissions including audit and system admin features.',
    permissions: ['user.*', 'role.*', 'audit.read', 'system.config'],
    businessTypes: ['general'],
    isDefault: false,
  },
];

const businessTypes = [
  {
    name: 'General',
    description: 'Standard business operations',
    requiredCompliance: [],
    defaultPermissions: [],
    riskLevel: 'low',
  },
  {
    name: 'Healthcare',
    description: 'Healthcare providers and medical facilities',
    requiredCompliance: ['hipaa'],
    defaultPermissions: [],
    riskLevel: 'high',
  },
  {
    name: 'Finance',
    description: 'Financial institutions and services',
    requiredCompliance: ['sox'],
    defaultPermissions: [],
    riskLevel: 'high',
  },
  {
    name: 'Education',
    description: 'Schools and educational institutions',
    requiredCompliance: ['ferpa'],
    defaultPermissions: [],
    riskLevel: 'medium',
  },
  {
    name: 'Government',
    description: 'Government agencies and public sector',
    requiredCompliance: [],
    defaultPermissions: [],
    riskLevel: 'critical',
  },
];

const defaultRoles = [
  {
    name: 'Admin',
    description: 'Full access to all features',
    permissions: ['*'],
    priority: 1,
    isSystemRole: true,
    canBeModified: false,
  },
  {
    name: 'Manager',
    description: 'Management-level access',
    permissions: ['user.read', 'role.read'],
    priority: 2,
  },
  {
    name: 'User',
    description: 'Basic user access',
    permissions: ['user.read'],
    priority: 3,
  },
];

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
}

async function seed() {
  const existingTemplates = await fetchJson(`${BASE}/api/rbac-config/permission-templates`, { headers });
  for (const tpl of permissionTemplates) {
    if (!existingTemplates.find(t => t.name.toLowerCase() === tpl.name.toLowerCase())) {
      await fetchJson(`${BASE}/api/rbac-config/permission-templates`, {
        method: 'POST',
        headers,
        body: JSON.stringify(tpl),
      });
      console.log(`Added template ${tpl.name}`);
    }
  }

  const existingTypes = await fetchJson(`${BASE}/api/rbac-config/business-types`, { headers });
  for (const bt of businessTypes) {
    if (!existingTypes.find(t => t.name.toLowerCase() === bt.name.toLowerCase())) {
      await fetchJson(`${BASE}/api/rbac-config/business-types`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bt),
      });
      console.log(`Added business type ${bt.name}`);
    }
  }

  const existingRoles = await fetchJson(`${BASE}/api/rbac-config/default-roles`, { headers });
  for (const role of defaultRoles) {
    if (!existingRoles.find(r => r.name.toLowerCase() === role.name.toLowerCase())) {
      await fetchJson(`${BASE}/api/rbac-config/default-roles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(role),
      });
      console.log(`Added default role ${role.name}`);
    }
  }

  console.log('RBAC configuration seed complete.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
