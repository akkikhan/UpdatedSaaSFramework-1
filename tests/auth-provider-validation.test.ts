import { validateTenantOnboardingConfig } from "../shared/tenant-config-interface";

describe("Auth provider validation", () => {
  const getBase = () => ({
    name: "Test Org",
    orgId: "test-org",
    adminEmail: "admin@test.org",
    adminName: "Admin",
    modules: {
      auth: {
        providers: ["azure-ad"],
        providerConfigs: {},
      },
    },
  });

  it("requires config for selected providers", () => {
    const config = getBase();
    expect(() => validateTenantOnboardingConfig(config as any)).toThrow(
      /azure-ad configuration is required/
    );
  });

  it("requires default provider to be selected", () => {
    const config = {
      ...getBase(),
      modules: {
        auth: {
          providers: ["azure-ad"],
          defaultProvider: "auth0",
          providerConfigs: {
            azureAd: { tenantId: "t", clientId: "c", clientSecret: "s" },
            auth0: { domain: "d", clientId: "c", clientSecret: "s" },
          },
        },
      },
    };
    expect(() => validateTenantOnboardingConfig(config as any)).toThrow(
      /Default provider must be one of the selected providers/
    );
  });

  it("rejects configs for unselected providers", () => {
    const config = {
      ...getBase(),
      modules: {
        auth: {
          providers: ["azure-ad"],
          providerConfigs: {
            azureAd: { tenantId: "t", clientId: "c", clientSecret: "s" },
            auth0: { domain: "d", clientId: "c", clientSecret: "s" },
          },
        },
      },
    };
    expect(() => validateTenantOnboardingConfig(config as any)).toThrow(
      /auth0 configuration provided but provider is not enabled/
    );
  });

  it("passes with matching config and default provider", () => {
    const config = {
      ...getBase(),
      modules: {
        auth: {
          providers: ["azure-ad"],
          defaultProvider: "azure-ad",
          providerConfigs: {
            azureAd: { tenantId: "t", clientId: "c", clientSecret: "s" },
          },
        },
      },
    };
    const result = validateTenantOnboardingConfig(config as any);
    expect(result.modules?.auth?.providers).toContain("azure-ad");
  });
});
