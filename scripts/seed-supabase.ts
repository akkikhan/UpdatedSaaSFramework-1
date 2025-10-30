import "dotenv/config";
import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { tenants, tenantUsers, systemLogs, type Tenant } from "../shared/schema";
import { MODULE_IDS, type ModuleConfigs } from "../shared/types";

const allowInsecureTls =
  (process.env.ALLOW_INSECURE_TLS || "").toLowerCase() === "true" ||
  (process.env.NODE_ENV || "").toLowerCase() === "development";
if (allowInsecureTls && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn(
    "[seed] Allowing self-signed TLS certificates for Supabase connectivity (NODE_TLS_REJECT_UNAUTHORIZED=0)."
  );
}

const { db, pool } = await import("../server/db");
const { storage } = await import("../server/storage");

interface SampleTenant {
  name: string;
  orgId: string;
  adminEmail: string;
  adminName: string;
  status: "active" | "pending" | "suspended";
  createdAt: Date;
  enabledModules: string[];
  moduleConfigs: ModuleConfigs;
  users?: Array<{ email: string; firstName: string; lastName: string }>;
}

interface SampleModuleRequest {
  tenantOrgId: string;
  moduleId: string;
  requestedBy: string;
  justification: string;
  status: "pending" | "approved" | "dismissed";
  requestedAt: Date;
}

interface SampleProviderRequest {
  tenantOrgId: string;
  provider: "azure-ad" | "auth0" | "saml";
  requestedBy: string;
  summary: string;
  status: "pending" | "approved" | "dismissed";
  requestedAt: Date;
}

const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const sampleTenants: SampleTenant[] = [
  {
    name: "Acme Industries",
    orgId: "acme-industries",
    adminEmail: "admin@acme-industries.io",
    adminName: "Jordan Blake",
    status: "active",
    createdAt: daysAgo(1),
    enabledModules: [
      MODULE_IDS.AUTH,
      MODULE_IDS.RBAC,
      MODULE_IDS.LOGGING,
      MODULE_IDS.NOTIFICATIONS,
      MODULE_IDS.AZURE_AD,
    ],
    moduleConfigs: {
      auth: {
        defaultProvider: "azure-ad",
        allowFallback: false,
        providers: [
          {
            type: "azure-ad",
            name: "Corporate Azure AD",
            priority: 1,
            config: {
              tenantId: "acme-industries.onmicrosoft.com",
              clientId: "00000000-0000-0000-0000-00000000acme",
              clientSecret: "seeded-secret-value",
              redirectUri: "https://admin.acme-industries.io/auth/callback",
              logoutUrl: "https://admin.acme-industries.io/logout",
            },
            userMapping: {
              emailField: "mail",
              nameField: "displayName",
              roleField: "jobTitle",
            },
            enabled: true,
          },
        ],
      },
      rbac: {
        permissionTemplate: "enterprise",
        businessType: "general",
        defaultRoles: ["Operations Admin", "Site Manager", "Viewer"],
      },
      logging: {
        levels: ["error", "warn", "info"],
        destinations: ["database"],
        retention: { error: "120d", security: "365d", audit: "365d", performance: "60d" },
        alerting: { errorThreshold: 5, securityEvents: true, performanceDegradation: true },
      },
      notifications: {
        channels: ["email", "slack"],
        emailProvider: "sendgrid",
        templates: {
          welcome: true,
          security_alert: true,
          trial_ending: true,
        },
      },
    },
    users: [
      { email: "vp.it@acme-industries.io", firstName: "Morgan", lastName: "Chen" },
      { email: "ops.lead@acme-industries.io", firstName: "Priya", lastName: "Natarajan" },
    ],
  },
  {
    name: "Nova Financial",
    orgId: "nova-financial",
    adminEmail: "platform@nova-financial.com",
    adminName: "Taylor Quinn",
    status: "pending",
    createdAt: daysAgo(3),
    enabledModules: [MODULE_IDS.AUTH, MODULE_IDS.RBAC, MODULE_IDS.AUTH0],
    moduleConfigs: {
      auth: {
        defaultProvider: "local",
        providers: [
          {
            type: "local",
            name: "Email/Password",
            priority: 1,
            enabled: true,
          },
          {
            type: "auth0",
            name: "Auth0 Sandbox",
            priority: 2,
            config: {
              domain: "nova-financial.us.auth0.com",
              audience: "https://api.nova-financial.com",
              redirectUri: "https://admin.nova-financial.com/callback",
            },
            enabled: true,
          },
        ],
      },
      rbac: {
        permissionTemplate: "standard",
        businessType: "finance",
        defaultRoles: ["Finance Admin", "Analyst"],
      },
    },
    users: [
      { email: "security@nova-financial.com", firstName: "Alex", lastName: "Nguyen" },
    ],
  },
  {
    name: "GreenHealth Network",
    orgId: "greenhealth-network",
    adminEmail: "admin@greenhealthnetwork.org",
    adminName: "Leslie Park",
    status: "suspended",
    createdAt: daysAgo(6),
    enabledModules: [
      MODULE_IDS.AUTH,
      MODULE_IDS.RBAC,
      MODULE_IDS.SAML,
      MODULE_IDS.NOTIFICATIONS,
    ],
    moduleConfigs: {
      auth: {
        defaultProvider: "saml",
        providers: [
          {
            type: "saml",
            name: "Okta SAML",
            priority: 1,
            config: {
              entryPoint: "https://greenhealth.okta.com/app/sso/saml",
              issuer: "https://greenhealth.okta.com",
              callbackUrl: "https://admin.greenhealthnetwork.org/saml/callback",
            },
            enabled: true,
          },
        ],
        allowFallback: true,
      },
      rbac: {
        permissionTemplate: "enterprise",
        businessType: "healthcare",
        defaultRoles: ["Clinical Admin", "Provider Manager", "Compliance Reviewer"],
      },
      notifications: {
        channels: ["email", "sms"],
        emailProvider: "ses",
        smsProvider: "twilio",
        templates: {
          welcome: true,
          payment_failed: true,
          security_alert: true,
        },
      },
    },
    users: [
      { email: "it.support@greenhealthnetwork.org", firstName: "Riley", lastName: "Stone" },
      { email: "compliance@greenhealthnetwork.org", firstName: "Avery", lastName: "Lopez" },
    ],
  },
];

const moduleRequests: SampleModuleRequest[] = [
  {
    tenantOrgId: "acme-industries",
    moduleId: MODULE_IDS.AI_COPILOT,
    requestedBy: "Jordan Blake",
    justification: "Looking to pilot AI-generated SOPs for plant operations.",
    status: "pending",
    requestedAt: daysAgo(0),
  },
  {
    tenantOrgId: "nova-financial",
    moduleId: MODULE_IDS.LOGGING,
    requestedBy: "Taylor Quinn",
    justification: "Need advanced audit trails prior to launch.",
    status: "approved",
    requestedAt: daysAgo(2),
  },
  {
    tenantOrgId: "greenhealth-network",
    moduleId: MODULE_IDS.NOTIFICATIONS,
    requestedBy: "Leslie Park",
    justification: "Reactivating patient messaging after suspension is lifted.",
    status: "dismissed",
    requestedAt: daysAgo(5),
  },
];

const providerRequests: SampleProviderRequest[] = [
  {
    tenantOrgId: "acme-industries",
    provider: "auth0",
    requestedBy: "Morgan Chen",
    summary: "Fallback Auth0 connection for contractors.",
    status: "pending",
    requestedAt: daysAgo(1),
  },
  {
    tenantOrgId: "nova-financial",
    provider: "saml",
    requestedBy: "Taylor Quinn",
    summary: "SAML federation with corporate identity provider.",
    status: "approved",
    requestedAt: daysAgo(3),
  },
];

async function upsertTenant(sample: SampleTenant): Promise<Tenant> {
  const existing = await storage.getTenantByOrgId(sample.orgId);
  if (existing) {
    await db
      .update(tenants)
      .set({
        name: sample.name,
        adminEmail: sample.adminEmail,
        status: sample.status,
        enabledModules: sample.enabledModules as any,
        moduleConfigs: sample.moduleConfigs as any,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, existing.id));

    await db
      .update(tenants)
      .set({
        createdAt: sample.createdAt,
      })
      .where(eq(tenants.id, existing.id));

    return {
      ...existing,
      name: sample.name,
      adminEmail: sample.adminEmail,
      status: sample.status,
      enabledModules: sample.enabledModules as any,
      moduleConfigs: sample.moduleConfigs as any,
      createdAt: sample.createdAt,
    };
  }

  const tenant = await storage.createTenant({
    name: sample.name,
    orgId: sample.orgId,
    adminEmail: sample.adminEmail,
    adminName: sample.adminName,
    sendEmail: false,
    enabledModules: sample.enabledModules,
    moduleConfigs: sample.moduleConfigs,
    metadata: { adminName: sample.adminName },
  });

  await db
    .update(tenants)
    .set({
      status: sample.status,
      createdAt: sample.createdAt,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenant.id));

  return {
    ...tenant,
    status: sample.status,
    createdAt: sample.createdAt,
  } as Tenant;
}

async function ensureTenantUsers(
  tenant: Tenant,
  adminName: string,
  adminEmail: string,
  users: SampleTenant["users"] = []
) {
  const nameParts = adminName.split(" ");
  const adminFirst = nameParts.shift() || "Admin";
  const adminLast = nameParts.join(" ") || "User";

  await db
    .update(tenantUsers)
    .set({
      firstName: adminFirst,
      lastName: adminLast,
      status: "active",
      metadata: { seeded: true },
      updatedAt: new Date(),
    })
    .where(
      and(eq(tenantUsers.tenantId, tenant.id), eq(tenantUsers.email, adminEmail.toLowerCase()))
    );

  for (const user of users) {
    const existing = await db
      .select({ id: tenantUsers.id })
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenant.id),
          eq(tenantUsers.email, user.email.toLowerCase())
        )
      )
      .limit(1);

    if (existing.length) continue;

    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash("Welcome1!", 10);
    await storage.createTenantUser({
      tenantId: tenant.id,
      email: user.email.toLowerCase(),
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash,
      status: "active",
      metadata: { seeded: true },
    });
  }
}

async function seedModuleRequests(tenantMap: Map<string, Tenant>) {
  for (const request of moduleRequests) {
    const tenant = tenantMap.get(request.tenantOrgId);
    if (!tenant) continue;

    const identifier = `${tenant.id}:${request.moduleId}:${request.status}`;
    const existing = await db
      .select({ id: systemLogs.id })
      .from(systemLogs)
      .where(eq(systemLogs.entityId, identifier))
      .limit(1);

    if (existing.length) continue;

    await db.insert(systemLogs).values({
      id: randomUUID(),
      tenantId: tenant.id,
      action: "module_change_request",
      entityType: "module",
      entityId: identifier,
      details: {
        moduleId: request.moduleId,
        requestedBy: request.requestedBy,
        justification: request.justification,
        status: request.status,
      },
      timestamp: request.requestedAt,
    });
  }
}

async function seedProviderRequests(tenantMap: Map<string, Tenant>) {
  for (const request of providerRequests) {
    const tenant = tenantMap.get(request.tenantOrgId);
    if (!tenant) continue;

    const identifier = `${tenant.id}:${request.provider}:${request.status}`;
    const existing = await db
      .select({ id: systemLogs.id })
      .from(systemLogs)
      .where(eq(systemLogs.entityId, identifier))
      .limit(1);

    if (existing.length) continue;

    await db.insert(systemLogs).values({
      id: randomUUID(),
      tenantId: tenant.id,
      action: "provider_change_request",
      entityType: "auth_provider",
      entityId: identifier,
      details: {
        provider: request.provider,
        requestedBy: request.requestedBy,
        summary: request.summary,
        status: request.status,
      },
      timestamp: request.requestedAt,
    });
  }
}

async function verifySeed() {
  const tenantsList = await storage.getAllTenants();
  const moduleRequestCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(systemLogs)
    .where(eq(systemLogs.action, "module_change_request"));
  const providerRequestCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(systemLogs)
    .where(eq(systemLogs.action, "provider_change_request"));

  console.log("");
  console.log("=== Supabase Seed Summary ===");
  console.log(`Tenants total: ${tenantsList.length}`);
  console.log(
    `Active/Pending/Suspended: ${tenantsList.filter(t => t.status === "active").length}/${
      tenantsList.filter(t => t.status === "pending").length
    }/${tenantsList.filter(t => t.status === "suspended").length}`
  );
  console.log(
    `Module requests logged: ${moduleRequestCount[0]?.count ?? 0}, Provider requests logged: ${
      providerRequestCount[0]?.count ?? 0
    }`
  );
  console.log("==============================");
  console.log("");
}

async function main() {
  try {
    const tenantMap = new Map<string, Tenant>();

    for (const sample of sampleTenants) {
      const tenant = await upsertTenant(sample);
      tenantMap.set(sample.orgId, tenant);
      await ensureTenantUsers(tenant, sample.adminName, sample.adminEmail, sample.users);
    }

    await seedModuleRequests(tenantMap);
    await seedProviderRequests(tenantMap);
    await verifySeed();
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
