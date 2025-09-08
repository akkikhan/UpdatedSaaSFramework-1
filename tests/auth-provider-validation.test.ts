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
            azureAd: {
              tenantId: "11111111-1111-1111-1111-111111111111",
              clientId: "22222222-2222-2222-2222-222222222222",
              clientSecret: "s",
            },
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
            azureAd: {
              tenantId: "11111111-1111-1111-1111-111111111111",
              clientId: "22222222-2222-2222-2222-222222222222",
              clientSecret: "s",
            },
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
            azureAd: {
              tenantId: "11111111-1111-1111-1111-111111111111",
              clientId: "22222222-2222-2222-2222-222222222222",
              clientSecret: "s",
            },
          },
        },
      },
    };
    const result = validateTenantOnboardingConfig(config as any);
    expect(result.modules?.auth?.providers).toContain("azure-ad");
  });

  it("requires GUID format for tenantId and clientId", () => {
    const config = {
      ...getBase(),
      modules: {
        auth: {
          providers: ["azure-ad"],
          providerConfigs: {
            azureAd: { tenantId: "not-a-guid", clientId: "1234", clientSecret: "s" },
          },
        },
      },
    };
    expect(() => validateTenantOnboardingConfig(config as any)).toThrow(/GUID/);
  });

  it("rejects invalid redirect URI", () => {
    const config = {
      ...getBase(),
      modules: {
        auth: {
          providers: ["azure-ad"],
          providerConfigs: {
            azureAd: {
              tenantId: "11111111-1111-1111-1111-111111111111",
              clientId: "22222222-2222-2222-2222-222222222222",
              clientSecret: "s",
              redirectUri: "not-a-url",
            },
          },
        },
      },
    };
    expect(() => validateTenantOnboardingConfig(config as any)).toThrow(/Valid redirect URI required/);
  });

  it("passes with valid azure ad config", () => {
    const config = {
      ...getBase(),
      modules: {
        auth: {
          providers: ["azure-ad"],
          providerConfigs: {
            azureAd: {
              tenantId: "11111111-1111-1111-1111-111111111111",
              clientId: "22222222-2222-2222-2222-222222222222",
              clientSecret: "s",
              redirectUri: "https://example.com/callback",
            },
          },
        },
      },
    };
    const result = validateTenantOnboardingConfig(config as any);
    expect(result.modules?.auth?.providerConfigs?.azureAd?.tenantId).toBe(
      "11111111-1111-1111-1111-111111111111"
    );
  });
});
