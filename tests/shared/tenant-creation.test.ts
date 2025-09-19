import { describe, expect, it } from "@jest/globals";
import { validateTenantCreation, MODULE_IDS } from "../../shared/types";

describe("Tenant creation schema", () => {
  const basePayload = {
    name: "Acme Corporation",
    orgId: "acme-co",
    adminEmail: "admin@acme.co",
    adminName: "Alice Admin",
    sendEmail: true,
    enabledModules: [MODULE_IDS.AUTH, MODULE_IDS.RBAC, MODULE_IDS.LOGGING, MODULE_IDS.NOTIFICATIONS],
    moduleConfigs: {
      auth: {
        providers: [
          {
            type: "azure-ad",
            name: "Azure AD SSO",
            priority: 1,
            enabled: true,
            config: {
              tenantId: "00000000-0000-0000-0000-000000000000",
              clientId: "11111111-1111-1111-1111-111111111111",
              clientSecret: "super-secret",
              redirectUri: "https://example.com/auth/callback",
            },
            userMapping: {
              emailField: "mail",
              nameField: "displayName",
            },
          },
          {
            type: "local",
            name: "Username/Password",
            priority: 2,
            enabled: true,
            userMapping: {
              emailField: "email",
              nameField: "name",
            },
          },
        ],
        defaultProvider: "azure-ad",
        allowFallback: true,
      },
      rbac: {
        permissionTemplate: "standard",
        businessType: "general",
        customPermissions: ["claims.read", "claims.update"],
        defaultRoles: ["adjuster", "approver"],
      },
      logging: {
        levels: ["error", "warn", "info"],
        destinations: ["database"],
        retention: {
          error: "30d",
          audit: "90d",
        },
        alerting: {
          errorThreshold: 10,
          securityEvents: true,
        },
      },
      notifications: {
        channels: ["email", "sms"],
        emailProvider: "sendgrid",
        smsProvider: "twilio",
        templates: {
          welcome: true,
          payment_failed: true,
        },
      },
    },
    metadata: {
      adminName: "Alice Admin",
      companyWebsite: "https://acme.co",
    },
  } as const;

  it("accepts a fully configured tenant payload", () => {
    const result = validateTenantCreation(basePayload);
    expect(result.name).toBe(basePayload.name);
    expect(result.enabledModules).toContain(MODULE_IDS.AUTH);
    expect(result.moduleConfigs?.auth?.providers?.[0].type).toBe("azure-ad");
  });

  it("rejects RBAC without authentication", () => {
    const payload = {
      ...basePayload,
      enabledModules: [MODULE_IDS.RBAC],
    } as const;

    expect(() => validateTenantCreation(payload)).toThrow(/RBAC requires Authentication/);
  });

  it("validates administrator email format", () => {
    const payload = {
      ...basePayload,
      adminEmail: "not-an-email",
    } as const;

    expect(() => validateTenantCreation(payload)).toThrow(/Valid email address required/);
  });
});
