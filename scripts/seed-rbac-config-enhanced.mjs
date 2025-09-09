#!/usr/bin/env node
// Enhanced RBAC configuration seeding with comprehensive permission templates, business types, and default roles

const BASE = process.env.BASE_URL || "http://localhost:5000";
const TOKEN = process.env.PLATFORM_ADMIN_TOKEN || process.env.ADMIN_TOKEN;

if (!TOKEN) {
  console.error("PLATFORM_ADMIN_TOKEN env var required");
  process.exit(1);
}

const headers = {
  "content-type": "application/json",
  authorization: `Bearer ${TOKEN}`,
};

// Enhanced Permission Templates
const permissionTemplates = [
  {
    name: "Standard",
    description: "Basic set of permissions for general use cases.",
    permissions: ["user.create", "user.read", "user.update", "user.delete", "role.manage"],
    roles: ["admin", "manager", "user"],
    businessTypes: ["standard"],
    isDefault: true,
  },
  {
    name: "Healthcare Compliance",
    description: "HIPAA-compliant permissions for healthcare organizations.",
    permissions: [
      "user.read",
      "user.update",
      "role.read",
      "audit.read",
      "audit.export",
      "patient.read",
      "patient.update",
      "medical.read",
      "compliance.manage",
      "phi.access",
      "medical_records.read",
      "medical_records.update",
    ],
    roles: ["healthcare_admin", "doctor", "nurse", "receptionist", "compliance_officer"],
    businessTypes: ["healthcare"],
    isDefault: false,
  },
  {
    name: "Financial Services",
    description: "SOX and PCI-DSS compliant permissions for financial institutions.",
    permissions: [
      "user.read",
      "user.update",
      "role.read",
      "audit.read",
      "audit.export",
      "transaction.read",
      "transaction.create",
      "financial.read",
      "compliance.manage",
      "risk.assess",
      "reporting.generate",
      "trading.execute",
      "kyc.verify",
    ],
    roles: ["financial_admin", "analyst", "compliance_officer", "trader", "risk_manager"],
    businessTypes: ["financial"],
    isDefault: false,
  },
  {
    name: "E-commerce",
    description: "Permissions optimized for online retail and e-commerce platforms.",
    permissions: [
      "user.create",
      "user.read",
      "user.update",
      "role.manage",
      "product.create",
      "product.read",
      "product.update",
      "product.delete",
      "order.read",
      "order.update",
      "order.fulfill",
      "inventory.manage",
      "customer.manage",
      "payment.process",
      "shipping.manage",
    ],
    roles: ["store_admin", "manager", "sales_rep", "customer_service", "warehouse"],
    businessTypes: ["ecommerce"],
    isDefault: false,
  },
  {
    name: "Education",
    description: "FERPA-compliant permissions for educational institutions.",
    permissions: [
      "user.read",
      "user.update",
      "role.read",
      "student.read",
      "student.update",
      "course.create",
      "course.read",
      "course.update",
      "grade.read",
      "grade.update",
      "enrollment.manage",
      "curriculum.manage",
      "assessment.create",
    ],
    roles: ["education_admin", "teacher", "principal", "student", "counselor"],
    businessTypes: ["education"],
    isDefault: false,
  },
  {
    name: "SaaS Platform",
    description: "Comprehensive permissions for SaaS platform management.",
    permissions: [
      "user.create",
      "user.read",
      "user.update",
      "user.delete",
      "role.create",
      "role.read",
      "role.update",
      "role.delete",
      "tenant.create",
      "tenant.read",
      "tenant.update",
      "tenant.delete",
      "billing.read",
      "billing.manage",
      "analytics.read",
      "api.manage",
      "subscription.manage",
      "feature.toggle",
      "integration.configure",
    ],
    roles: ["platform_admin", "tenant_admin", "developer", "support", "billing_admin"],
    businessTypes: ["saas"],
    isDefault: false,
  },
  {
    name: "Manufacturing",
    description: "Permissions for manufacturing and industrial operations.",
    permissions: [
      "user.read",
      "user.update",
      "role.read",
      "production.read",
      "production.manage",
      "inventory.read",
      "inventory.manage",
      "quality.read",
      "quality.manage",
      "maintenance.read",
      "maintenance.schedule",
      "equipment.monitor",
      "safety.audit",
    ],
    roles: [
      "manufacturing_admin",
      "production_manager",
      "operator",
      "quality_inspector",
      "maintenance",
    ],
    businessTypes: ["manufacturing"],
    isDefault: false,
  },
  {
    name: "Government",
    description: "FISMA-compliant permissions for government agencies.",
    permissions: [
      "user.read",
      "user.update",
      "role.read",
      "audit.read",
      "audit.export",
      "document.read",
      "document.create",
      "compliance.manage",
      "security.monitor",
      "public_records.read",
      "classification.manage",
      "clearance.verify",
    ],
    roles: ["gov_admin", "officer", "clerk", "security_officer", "compliance_manager"],
    businessTypes: ["government"],
    isDefault: false,
  },
  {
    name: "Nonprofit",
    description: "Permissions for nonprofit organizations and charities.",
    permissions: [
      "user.read",
      "user.update",
      "role.read",
      "donor.read",
      "donor.manage",
      "campaign.create",
      "campaign.read",
      "campaign.update",
      "volunteer.manage",
      "grant.read",
      "grant.apply",
      "fundraising.manage",
      "event.organize",
    ],
    roles: ["nonprofit_admin", "program_manager", "fundraiser", "volunteer_coordinator"],
    businessTypes: ["nonprofit"],
    isDefault: false,
  },
  {
    name: "Everything",
    description: "All permissions enabled for demo and testing purposes.",
    permissions: ["*"],
    roles: ["super_admin"],
    businessTypes: ["everything"],
    isDefault: false,
  },
];

// Enhanced Business Types
const businessTypes = [
  {
    name: "Standard",
    description: "Standard business operations with basic compliance requirements",
    requiredCompliance: ["data_protection", "user_privacy"],
    defaultPermissions: ["user.read", "role.read"],
    riskLevel: "low",
    maxTenants: null,
  },
  {
    name: "Healthcare",
    description: "Healthcare organizations requiring HIPAA compliance",
    requiredCompliance: [
      "hipaa",
      "phi_protection",
      "audit_logging",
      "data_encryption",
      "access_controls",
    ],
    defaultPermissions: ["user.read", "audit.read", "patient.read"],
    riskLevel: "high",
    maxTenants: 100,
  },
  {
    name: "Financial",
    description: "Financial services requiring SOX and PCI-DSS compliance",
    requiredCompliance: [
      "sox",
      "pci_dss",
      "financial_reporting",
      "transaction_monitoring",
      "kyc_aml",
    ],
    defaultPermissions: ["user.read", "audit.read", "transaction.read", "compliance.read"],
    riskLevel: "critical",
    maxTenants: 50,
  },
  {
    name: "E-commerce",
    description: "Online retail and e-commerce platforms",
    requiredCompliance: ["pci_dss", "customer_data_protection", "payment_security", "gdpr"],
    defaultPermissions: ["user.read", "product.read", "order.read", "customer.read"],
    riskLevel: "medium",
    maxTenants: 500,
  },
  {
    name: "Education",
    description: "Educational institutions requiring FERPA compliance",
    requiredCompliance: ["ferpa", "student_privacy", "educational_records", "coppa"],
    defaultPermissions: ["user.read", "student.read", "course.read"],
    riskLevel: "medium",
    maxTenants: 200,
  },
  {
    name: "SaaS",
    description: "Software-as-a-Service platforms and applications",
    requiredCompliance: ["data_protection", "api_security", "multi_tenancy", "sla_monitoring"],
    defaultPermissions: ["user.read", "tenant.read", "api.read", "analytics.read"],
    riskLevel: "medium",
    maxTenants: 1000,
  },
  {
    name: "Manufacturing",
    description: "Manufacturing and industrial operations",
    requiredCompliance: ["iso_27001", "industrial_safety", "quality_standards", "environmental"],
    defaultPermissions: ["user.read", "production.read", "inventory.read", "quality.read"],
    riskLevel: "medium",
    maxTenants: 150,
  },
  {
    name: "Government",
    description: "Government agencies and public sector organizations",
    requiredCompliance: ["fisma", "nist", "public_records", "accessibility", "security_clearance"],
    defaultPermissions: ["user.read", "audit.read", "public_records.read"],
    riskLevel: "critical",
    maxTenants: 25,
  },
  {
    name: "Nonprofit",
    description: "Nonprofit organizations and charities",
    requiredCompliance: ["donor_privacy", "fundraising_compliance", "transparency", "tax_exempt"],
    defaultPermissions: ["user.read", "donor.read", "campaign.read"],
    riskLevel: "low",
    maxTenants: 300,
  },
  {
    name: "Everything",
    description: "Access to every module and permission for testing/demo",
    requiredCompliance: [],
    defaultPermissions: ["*"],
    riskLevel: "high",
    maxTenants: 10,
  },
];

// Enhanced Default Roles
const defaultRoles = [
  // Universal Roles
  {
    name: "Super Admin",
    description: "Full system access with all permissions",
    permissions: ["*"],
    roles: [],
    priority: 1,
    isSystemRole: true,
    canBeModified: false,
  },
  {
    name: "Admin",
    description: "Full access to tenant features",
    permissions: [
      "user.create",
      "user.read",
      "user.update",
      "user.delete",
      "role.manage",
      "settings.manage",
    ],
    roles: [],
    priority: 2,
    isSystemRole: true,
    canBeModified: false,
  },
  {
    name: "Manager",
    description: "Management-level access with user and role management",
    permissions: [
      "user.create",
      "user.read",
      "user.update",
      "role.read",
      "role.assign",
      "reports.read",
    ],
    roles: [],
    priority: 3,
    isSystemRole: false,
    canBeModified: true,
  },
  {
    name: "User",
    description: "Standard user access",
    permissions: ["user.read", "profile.update"],
    roles: [],
    priority: 4,
    isSystemRole: false,
    canBeModified: true,
  },
  {
    name: "Viewer",
    description: "Read-only access",
    permissions: ["user.read", "role.read"],
    roles: [],
    priority: 5,
    isSystemRole: false,
    canBeModified: true,
  },

  // Healthcare Specific Roles
  {
    name: "Healthcare Admin",
    description: "Administrator for healthcare organizations",
    permissions: ["*"],
    roles: [],
    businessTypeId: null, // Will be set dynamically
    priority: 1,
    isSystemRole: false,
    canBeModified: true,
  },
  {
    name: "Doctor",
    description: "Medical doctor with patient care permissions",
    permissions: [
      "patient.read",
      "patient.update",
      "medical_records.read",
      "medical_records.update",
      "prescription.create",
    ],
    roles: [],
    priority: 2,
    isSystemRole: false,
    canBeModified: true,
  },
  {
    name: "Nurse",
    description: "Nursing staff with care coordination permissions",
    permissions: ["patient.read", "patient.update", "medical_records.read", "care_plan.update"],
    roles: [],
    priority: 3,
    isSystemRole: false,
    canBeModified: true,
  },

  // Financial Specific Roles
  {
    name: "Financial Admin",
    description: "Administrator for financial institutions",
    permissions: ["*"],
    roles: [],
    priority: 1,
    isSystemRole: false,
    canBeModified: true,
  },
  {
    name: "Compliance Officer",
    description: "Compliance and regulatory oversight",
    permissions: [
      "audit.read",
      "audit.export",
      "compliance.manage",
      "risk.assess",
      "reporting.generate",
    ],
    roles: [],
    priority: 2,
    isSystemRole: false,
    canBeModified: true,
  },
  {
    name: "Trader",
    description: "Trading operations and market access",
    permissions: ["transaction.read", "transaction.create", "trading.execute", "market.read"],
    roles: [],
    priority: 3,
    isSystemRole: false,
    canBeModified: true,
  },

  // E-commerce Specific Roles
  {
    name: "Store Admin",
    description: "E-commerce store administrator",
    permissions: ["*"],
    roles: [],
    priority: 1,
    isSystemRole: false,
    canBeModified: true,
  },
  {
    name: "Sales Representative",
    description: "Sales team member with customer management",
    permissions: ["customer.read", "customer.update", "order.read", "order.update", "product.read"],
    roles: [],
    priority: 2,
    isSystemRole: false,
    canBeModified: true,
  },
  {
    name: "Customer Service",
    description: "Customer support and service",
    permissions: ["customer.read", "order.read", "product.read", "support.manage"],
    roles: [],
    priority: 3,
    isSystemRole: false,
    canBeModified: true,
  },

  // Education Specific Roles
  {
    name: "Education Admin",
    description: "Educational institution administrator",
    permissions: ["*"],
    roles: [],
    priority: 1,
    isSystemRole: false,
    canBeModified: true,
  },
  {
    name: "Teacher",
    description: "Teaching staff with curriculum and student management",
    permissions: [
      "student.read",
      "student.update",
      "course.read",
      "course.update",
      "grade.read",
      "grade.update",
    ],
    roles: [],
    priority: 2,
    isSystemRole: false,
    canBeModified: true,
  },
  {
    name: "Student",
    description: "Student access to courses and grades",
    permissions: ["course.read", "grade.read", "profile.update"],
    roles: [],
    priority: 4,
    isSystemRole: false,
    canBeModified: false,
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
  console.log("🌱 Starting enhanced RBAC configuration seeding...");

  // Seed Permission Templates
  console.log("\n📋 Seeding Permission Templates...");
  const existingTemplates = await fetchJson(`${BASE}/api/rbac-config/permission-templates`, {
    headers,
  });
  for (const tpl of permissionTemplates) {
    if (!existingTemplates.find(t => t.name.toLowerCase() === tpl.name.toLowerCase())) {
      await fetchJson(`${BASE}/api/rbac-config/permission-templates`, {
        method: "POST",
        headers,
        body: JSON.stringify(tpl),
      });
      console.log(`  ✅ Added permission template: ${tpl.name}`);
    } else {
      console.log(`  ⏭️ Permission template already exists: ${tpl.name}`);
    }
  }

  // Seed Business Types
  console.log("\n🏢 Seeding Business Types...");
  const existingTypes = await fetchJson(`${BASE}/api/rbac-config/business-types`, { headers });
  for (const bt of businessTypes) {
    if (!existingTypes.find(t => t.name.toLowerCase() === bt.name.toLowerCase())) {
      await fetchJson(`${BASE}/api/rbac-config/business-types`, {
        method: "POST",
        headers,
        body: JSON.stringify(bt),
      });
      console.log(`  ✅ Added business type: ${bt.name} (Risk: ${bt.riskLevel})`);
    } else {
      console.log(`  ⏭️ Business type already exists: ${bt.name}`);
    }
  }

  // Seed Default Roles
  console.log("\n👥 Seeding Default Roles...");
  const existingRoles = await fetchJson(`${BASE}/api/rbac-config/default-roles`, { headers });
  for (const role of defaultRoles) {
    if (!existingRoles.find(r => r.name.toLowerCase() === role.name.toLowerCase())) {
      await fetchJson(`${BASE}/api/rbac-config/default-roles`, {
        method: "POST",
        headers,
        body: JSON.stringify(role),
      });
      console.log(`  ✅ Added default role: ${role.name} (Priority: ${role.priority})`);
    } else {
      console.log(`  ⏭️ Default role already exists: ${role.name}`);
    }
  }

  console.log("\n🎉 Enhanced RBAC configuration seeding complete!");
  console.log("\n📊 Summary:");
  console.log(`  - Permission Templates: ${permissionTemplates.length}`);
  console.log(`  - Business Types: ${businessTypes.length}`);
  console.log(`  - Default Roles: ${defaultRoles.length}`);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
