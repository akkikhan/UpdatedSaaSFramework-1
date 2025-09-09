#!/usr/bin/env node
// Comprehensive RBAC data seeding script with validation and relationship mapping

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { permissionTemplates, businessTypes, defaultRoles } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/saas_framework";
const sql = postgres(connectionString);
const db = drizzle(sql);

// Extended permission definitions
const PERMISSION_CATALOG = {
  // Core User Management
  "user.create": "Create new users",
  "user.read": "View user information",
  "user.update": "Update user details",
  "user.delete": "Delete users",
  "user.invite": "Send user invitations",
  "user.activate": "Activate/deactivate users",

  // Role Management
  "role.create": "Create new roles",
  "role.read": "View role information",
  "role.update": "Update role details",
  "role.delete": "Delete roles",
  "role.assign": "Assign roles to users",
  "role.manage": "Full role management",

  // Healthcare Specific
  "patient.create": "Register new patients",
  "patient.read": "View patient information",
  "patient.update": "Update patient records",
  "patient.delete": "Remove patient records",
  "medical_records.read": "Access medical records",
  "medical_records.update": "Update medical records",
  "medical_records.create": "Create medical records",
  "phi.access": "Access protected health information",
  "prescription.create": "Create prescriptions",
  "prescription.manage": "Manage prescriptions",
  "care_plan.read": "View care plans",
  "care_plan.update": "Update care plans",
  "care_plan.create": "Create care plans",

  // Financial Specific
  "transaction.create": "Create financial transactions",
  "transaction.read": "View transactions",
  "transaction.update": "Update transactions",
  "transaction.approve": "Approve transactions",
  "trading.execute": "Execute trades",
  "trading.view": "View trading data",
  "risk.assess": "Perform risk assessments",
  "risk.manage": "Manage risk parameters",
  "kyc.verify": "Perform KYC verification",
  "aml.monitor": "Monitor AML compliance",
  "financial.read": "View financial data",
  "reporting.generate": "Generate financial reports",

  // E-commerce Specific
  "product.create": "Create products",
  "product.read": "View products",
  "product.update": "Update product details",
  "product.delete": "Remove products",
  "inventory.read": "View inventory levels",
  "inventory.manage": "Manage inventory",
  "inventory.update": "Update inventory",
  "order.create": "Create orders",
  "order.read": "View orders",
  "order.update": "Update order status",
  "order.fulfill": "Fulfill orders",
  "order.cancel": "Cancel orders",
  "customer.create": "Create customer profiles",
  "customer.read": "View customer information",
  "customer.update": "Update customer details",
  "customer.manage": "Full customer management",
  "payment.process": "Process payments",
  "payment.refund": "Process refunds",
  "shipping.manage": "Manage shipping",

  // Education Specific
  "student.create": "Register students",
  "student.read": "View student information",
  "student.update": "Update student records",
  "course.create": "Create courses",
  "course.read": "View course information",
  "course.update": "Update course details",
  "course.delete": "Remove courses",
  "grade.read": "View grades",
  "grade.update": "Update grades",
  "grade.create": "Create grade entries",
  "enrollment.manage": "Manage student enrollment",
  "curriculum.manage": "Manage curriculum",
  "assessment.create": "Create assessments",
  "assessment.grade": "Grade assessments",

  // Manufacturing Specific
  "production.read": "View production data",
  "production.manage": "Manage production",
  "production.schedule": "Schedule production",
  "quality.read": "View quality metrics",
  "quality.manage": "Manage quality control",
  "maintenance.read": "View maintenance schedules",
  "maintenance.schedule": "Schedule maintenance",
  "equipment.monitor": "Monitor equipment",
  "safety.audit": "Conduct safety audits",

  // SaaS Platform Specific
  "tenant.create": "Create tenants",
  "tenant.read": "View tenant information",
  "tenant.update": "Update tenant settings",
  "tenant.delete": "Remove tenants",
  "billing.read": "View billing information",
  "billing.manage": "Manage billing",
  "subscription.manage": "Manage subscriptions",
  "api.manage": "Manage API access",
  "analytics.read": "View analytics",
  "feature.toggle": "Toggle feature flags",
  "integration.configure": "Configure integrations",

  // Government Specific
  "document.create": "Create documents",
  "document.read": "View documents",
  "document.update": "Update documents",
  "document.classify": "Classify documents",
  "public_records.read": "Access public records",
  "public_records.manage": "Manage public records",
  "classification.manage": "Manage security classifications",
  "clearance.verify": "Verify security clearances",
  "security.monitor": "Monitor security",

  // Nonprofit Specific
  "donor.create": "Register donors",
  "donor.read": "View donor information",
  "donor.update": "Update donor records",
  "donor.manage": "Full donor management",
  "campaign.create": "Create campaigns",
  "campaign.read": "View campaigns",
  "campaign.update": "Update campaigns",
  "campaign.manage": "Manage campaigns",
  "volunteer.create": "Register volunteers",
  "volunteer.read": "View volunteer information",
  "volunteer.manage": "Manage volunteers",
  "grant.read": "View grants",
  "grant.apply": "Apply for grants",
  "fundraising.manage": "Manage fundraising",
  "event.organize": "Organize events",

  // Universal System Permissions
  "audit.read": "View audit logs",
  "audit.export": "Export audit data",
  "compliance.read": "View compliance status",
  "compliance.manage": "Manage compliance",
  "settings.read": "View system settings",
  "settings.manage": "Manage system settings",
  "reports.read": "View reports",
  "reports.create": "Create reports",
  "profile.update": "Update own profile",
  "support.manage": "Manage support tickets",
  "*": "All permissions (super admin)",
};

const seedData = {
  permissionTemplates: [
    {
      name: "Standard Business",
      description: "Basic permissions for standard business operations",
      permissions: [
        "user.create",
        "user.read",
        "user.update",
        "user.delete",
        "role.read",
        "role.assign",
        "reports.read",
        "profile.update",
      ],
      roles: ["admin", "manager", "user"],
      businessTypes: ["standard"],
      isDefault: true,
      isActive: true,
    },
    {
      name: "Healthcare HIPAA",
      description: "HIPAA-compliant permission set for healthcare organizations",
      permissions: [
        "user.read",
        "user.update",
        "role.read",
        "patient.read",
        "patient.update",
        "patient.create",
        "medical_records.read",
        "medical_records.update",
        "medical_records.create",
        "phi.access",
        "prescription.create",
        "care_plan.read",
        "care_plan.update",
        "audit.read",
        "audit.export",
        "compliance.read",
      ],
      roles: ["healthcare_admin", "doctor", "nurse", "receptionist"],
      businessTypes: ["healthcare"],
      isDefault: false,
      isActive: true,
    },
    {
      name: "Financial SOX Compliant",
      description: "SOX and regulatory compliant permissions for financial services",
      permissions: [
        "user.read",
        "user.update",
        "role.read",
        "transaction.read",
        "transaction.create",
        "transaction.approve",
        "trading.execute",
        "trading.view",
        "risk.assess",
        "risk.manage",
        "kyc.verify",
        "aml.monitor",
        "financial.read",
        "reporting.generate",
        "audit.read",
        "audit.export",
        "compliance.manage",
      ],
      roles: ["financial_admin", "trader", "compliance_officer", "risk_manager"],
      businessTypes: ["financial"],
      isDefault: false,
      isActive: true,
    },
    {
      name: "E-commerce Complete",
      description: "Full e-commerce platform permissions",
      permissions: [
        "user.create",
        "user.read",
        "user.update",
        "role.manage",
        "product.create",
        "product.read",
        "product.update",
        "product.delete",
        "inventory.read",
        "inventory.manage",
        "inventory.update",
        "order.create",
        "order.read",
        "order.update",
        "order.fulfill",
        "customer.create",
        "customer.read",
        "customer.update",
        "customer.manage",
        "payment.process",
        "payment.refund",
        "shipping.manage",
      ],
      roles: ["store_admin", "manager", "sales_rep", "customer_service"],
      businessTypes: ["ecommerce"],
      isDefault: false,
      isActive: true,
    },
    {
      name: "Education FERPA",
      description: "FERPA-compliant permissions for educational institutions",
      permissions: [
        "user.read",
        "user.update",
        "role.read",
        "student.read",
        "student.update",
        "student.create",
        "course.create",
        "course.read",
        "course.update",
        "grade.read",
        "grade.update",
        "grade.create",
        "enrollment.manage",
        "curriculum.manage",
        "assessment.create",
        "assessment.grade",
      ],
      roles: ["education_admin", "teacher", "principal", "counselor"],
      businessTypes: ["education"],
      isDefault: false,
      isActive: true,
    },
  ],

  businessTypes: [
    {
      name: "Standard",
      description: "Standard business operations with basic compliance",
      requiredCompliance: ["data_protection", "user_privacy", "gdpr_basic"],
      defaultPermissions: ["user.read", "role.read", "profile.update"],
      riskLevel: "low",
      maxTenants: null,
      isActive: true,
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
        "breach_notification",
        "business_associate_agreements",
      ],
      defaultPermissions: ["user.read", "patient.read", "audit.read"],
      riskLevel: "high",
      maxTenants: 100,
      isActive: true,
    },
    {
      name: "Financial",
      description: "Financial services with SOX and regulatory compliance",
      requiredCompliance: [
        "sox",
        "pci_dss",
        "basel_iii",
        "mifid_ii",
        "dodd_frank",
        "kyc_aml",
        "transaction_monitoring",
        "risk_management",
      ],
      defaultPermissions: ["user.read", "transaction.read", "audit.read", "compliance.read"],
      riskLevel: "critical",
      maxTenants: 50,
      isActive: true,
    },
    {
      name: "E-commerce",
      description: "Online retail and e-commerce platforms",
      requiredCompliance: [
        "pci_dss",
        "gdpr",
        "ccpa",
        "customer_data_protection",
        "payment_security",
        "consumer_protection",
      ],
      defaultPermissions: ["user.read", "product.read", "order.read", "customer.read"],
      riskLevel: "medium",
      maxTenants: 500,
      isActive: true,
    },
    {
      name: "Education",
      description: "Educational institutions with FERPA compliance",
      requiredCompliance: [
        "ferpa",
        "coppa",
        "student_privacy",
        "educational_records",
        "accessibility",
        "title_ix",
      ],
      defaultPermissions: ["user.read", "student.read", "course.read"],
      riskLevel: "medium",
      maxTenants: 200,
      isActive: true,
    },
    {
      name: "Manufacturing",
      description: "Manufacturing and industrial operations",
      requiredCompliance: [
        "iso_27001",
        "iso_9001",
        "industrial_safety",
        "environmental_regulations",
        "quality_standards",
        "supply_chain_security",
      ],
      defaultPermissions: ["user.read", "production.read", "inventory.read", "quality.read"],
      riskLevel: "medium",
      maxTenants: 150,
      isActive: true,
    },
    {
      name: "Government",
      description: "Government agencies with FISMA compliance",
      requiredCompliance: [
        "fisma",
        "nist_800_53",
        "fedramp",
        "cjis",
        "itar",
        "security_clearance",
        "public_records",
        "accessibility",
      ],
      defaultPermissions: ["user.read", "document.read", "audit.read"],
      riskLevel: "critical",
      maxTenants: 25,
      isActive: true,
    },
    {
      name: "SaaS",
      description: "Software-as-a-Service platforms",
      requiredCompliance: [
        "soc2",
        "iso_27001",
        "gdpr",
        "api_security",
        "multi_tenancy",
        "sla_monitoring",
        "data_residency",
      ],
      defaultPermissions: ["user.read", "tenant.read", "api.read", "analytics.read"],
      riskLevel: "medium",
      maxTenants: 1000,
      isActive: true,
    },
    {
      name: "Nonprofit",
      description: "Nonprofit organizations and charities",
      requiredCompliance: [
        "donor_privacy",
        "fundraising_compliance",
        "transparency_requirements",
        "tax_exempt_compliance",
        "grant_compliance",
      ],
      defaultPermissions: ["user.read", "donor.read", "campaign.read"],
      riskLevel: "low",
      maxTenants: 300,
      isActive: true,
    },
  ],

  defaultRoles: [
    // Universal System Roles
    {
      name: "Super Admin",
      description: "System-wide administrator with all permissions",
      permissions: ["*"],
      roles: [],
      priority: 1,
      isSystemRole: true,
      canBeModified: false,
      isActive: true,
    },
    {
      name: "Tenant Admin",
      description: "Full tenant administration access",
      permissions: [
        "user.create",
        "user.read",
        "user.update",
        "user.delete",
        "role.create",
        "role.read",
        "role.update",
        "role.assign",
        "settings.read",
        "settings.manage",
        "reports.read",
        "reports.create",
      ],
      roles: [],
      priority: 2,
      isSystemRole: true,
      canBeModified: false,
      isActive: true,
    },
    {
      name: "Manager",
      description: "Management level with user oversight",
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
      isActive: true,
    },
    {
      name: "Standard User",
      description: "Basic user access",
      permissions: ["user.read", "profile.update"],
      roles: [],
      priority: 4,
      isSystemRole: false,
      canBeModified: true,
      isActive: true,
    },
    {
      name: "Read Only",
      description: "View-only access",
      permissions: ["user.read", "role.read"],
      roles: [],
      priority: 5,
      isSystemRole: false,
      canBeModified: true,
      isActive: true,
    },

    // Healthcare Roles
    {
      name: "Healthcare Administrator",
      description: "Healthcare facility administrator",
      permissions: [
        "user.create",
        "user.read",
        "user.update",
        "user.delete",
        "patient.create",
        "patient.read",
        "patient.update",
        "medical_records.read",
        "medical_records.update",
        "medical_records.create",
        "phi.access",
        "audit.read",
        "compliance.manage",
      ],
      roles: [],
      priority: 1,
      isSystemRole: false,
      canBeModified: true,
      isActive: true,
    },
    {
      name: "Physician",
      description: "Medical doctor with patient care access",
      permissions: [
        "patient.read",
        "patient.update",
        "patient.create",
        "medical_records.read",
        "medical_records.update",
        "medical_records.create",
        "phi.access",
        "prescription.create",
        "care_plan.read",
        "care_plan.update",
      ],
      roles: [],
      priority: 2,
      isSystemRole: false,
      canBeModified: true,
      isActive: true,
    },
    {
      name: "Registered Nurse",
      description: "Nursing staff with patient care coordination",
      permissions: [
        "patient.read",
        "patient.update",
        "medical_records.read",
        "care_plan.read",
        "care_plan.update",
      ],
      roles: [],
      priority: 3,
      isSystemRole: false,
      canBeModified: true,
      isActive: true,
    },

    // Financial Roles
    {
      name: "Financial Administrator",
      description: "Financial institution administrator",
      permissions: [
        "user.create",
        "user.read",
        "user.update",
        "user.delete",
        "transaction.read",
        "transaction.create",
        "transaction.approve",
        "risk.assess",
        "risk.manage",
        "compliance.manage",
        "audit.read",
      ],
      roles: [],
      priority: 1,
      isSystemRole: false,
      canBeModified: true,
      isActive: true,
    },
    {
      name: "Investment Advisor",
      description: "Investment and trading operations",
      permissions: [
        "transaction.read",
        "transaction.create",
        "trading.execute",
        "trading.view",
        "risk.assess",
      ],
      roles: [],
      priority: 2,
      isSystemRole: false,
      canBeModified: true,
      isActive: true,
    },

    // Additional role definitions for other business types...
    // (E-commerce, Education, Manufacturing, etc.)
  ],
};

async function validateData() {
  console.log("🔍 Validating seed data...");

  // Validate permission references
  for (const template of seedData.permissionTemplates) {
    for (const permission of template.permissions) {
      if (permission !== "*" && !PERMISSION_CATALOG[permission]) {
        console.warn(`⚠️ Unknown permission: ${permission} in template ${template.name}`);
      }
    }
  }

  // Validate business type references
  const businessTypeNames = seedData.businessTypes.map(bt => bt.name.toLowerCase());
  for (const template of seedData.permissionTemplates) {
    for (const businessType of template.businessTypes) {
      if (!businessTypeNames.includes(businessType.toLowerCase())) {
        console.warn(`⚠️ Unknown business type: ${businessType} in template ${template.name}`);
      }
    }
  }

  console.log("✅ Data validation complete");
}

async function seedPermissionTemplates() {
  console.log("\n📋 Seeding Permission Templates...");

  for (const template of seedData.permissionTemplates) {
    try {
      const existing = await db
        .select()
        .from(permissionTemplates)
        .where(eq(permissionTemplates.name, template.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(permissionTemplates).values(template);
        console.log(`  ✅ Added: ${template.name}`);
      } else {
        console.log(`  ⏭️ Exists: ${template.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to add ${template.name}:`, error.message);
    }
  }
}

async function seedBusinessTypes() {
  console.log("\n🏢 Seeding Business Types...");

  for (const businessType of seedData.businessTypes) {
    try {
      const existing = await db
        .select()
        .from(businessTypes)
        .where(eq(businessTypes.name, businessType.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(businessTypes).values(businessType);
        console.log(`  ✅ Added: ${businessType.name} (Risk: ${businessType.riskLevel})`);
      } else {
        console.log(`  ⏭️ Exists: ${businessType.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to add ${businessType.name}:`, error.message);
    }
  }
}

async function seedDefaultRoles() {
  console.log("\n👥 Seeding Default Roles...");

  for (const role of seedData.defaultRoles) {
    try {
      const existing = await db
        .select()
        .from(defaultRoles)
        .where(eq(defaultRoles.name, role.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(defaultRoles).values(role);
        console.log(`  ✅ Added: ${role.name} (Priority: ${role.priority})`);
      } else {
        console.log(`  ⏭️ Exists: ${role.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to add ${role.name}:`, error.message);
    }
  }
}

async function generateReport() {
  console.log("\n📊 Generating Seed Report...");

  const templateCount = await db.select().from(permissionTemplates);
  const businessTypeCount = await db.select().from(businessTypes);
  const roleCount = await db.select().from(defaultRoles);

  console.log("\n📈 Database Summary:");
  console.log(`  Permission Templates: ${templateCount.length}`);
  console.log(`  Business Types: ${businessTypeCount.length}`);
  console.log(`  Default Roles: ${roleCount.length}`);
  console.log(`  Total Permissions Defined: ${Object.keys(PERMISSION_CATALOG).length}`);
}

async function main() {
  try {
    console.log("🌱 Starting Comprehensive RBAC Seeding...");

    await validateData();
    await seedBusinessTypes();
    await seedPermissionTemplates();
    await seedDefaultRoles();
    await generateReport();

    console.log("\n🎉 Comprehensive RBAC seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
