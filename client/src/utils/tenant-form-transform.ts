// Validation fix for tenant creation form
// This file provides the correct payload structure to fix the 400 validation error

import {
  MODULE_IDS,
  createAuthProviderObject,
  type TenantCreationData,
} from "../../../shared/types";

// Helper function to convert frontend form data to backend-compatible format
export const transformTenantFormData = (formData: any): TenantCreationData => {
  console.log("🔄 Transforming form data:", formData);

  // Fix 1: Convert module names from frontend display names to backend IDs
  const moduleNameMapping: Record<string, string> = {
    authentication: MODULE_IDS.AUTH,
    rbac: MODULE_IDS.RBAC,
    logging: MODULE_IDS.LOGGING,
    notifications: MODULE_IDS.NOTIFICATIONS,
    aiCopilot: MODULE_IDS.AI_COPILOT,
    "ai-copilot": MODULE_IDS.AI_COPILOT,
  };

  const correctedModules =
    formData.enabledModules?.map((module: string) => {
      return moduleNameMapping[module] || module;
    }) || [];

  // Fix 2: Transform provider arrays to proper objects
  const correctedModuleConfigs: any = {};

  if (formData.moduleConfigs) {
    Object.entries(formData.moduleConfigs).forEach(([key, config]: [string, any]) => {
      const correctedKey = moduleNameMapping[key] || key;

      if (correctedKey === "auth" && config?.providers) {
        // Convert provider strings to provider objects
        const correctedProviders = config.providers.map((provider: string | object) => {
          if (typeof provider === "string") {
            // Get any existing config for this provider
            const providerConfig: any = {};
            if (provider === "azure-ad" && config.azureAd) {
              providerConfig.tenantId = config.azureAd.tenantId;
              providerConfig.clientId = config.azureAd.clientId;
              providerConfig.clientSecret = config.azureAd.clientSecret;
            } else if (provider === "auth0" && config.auth0) {
              providerConfig.domain = config.auth0.domain;
              providerConfig.clientId = config.auth0.clientId;
              providerConfig.clientSecret = config.auth0.clientSecret;
              providerConfig.audience = config.auth0.audience;
            }

            return createAuthProviderObject(provider as any, providerConfig);
          }
          return provider; // Already an object
        });

        correctedModuleConfigs[correctedKey] = {
          ...config,
          providers: correctedProviders,
        };
      } else {
        correctedModuleConfigs[correctedKey] = config;
      }
    });
  }

  // Fix 3: Ensure metadata structure is correct
  const correctedMetadata = {
    adminName: formData.adminName || formData.metadata?.adminName || "",
    companyWebsite: formData.companyWebsite || formData.metadata?.companyWebsite || "",
  };

  const transformedData: TenantCreationData = {
    name: formData.name,
    orgId: formData.orgId,
    adminEmail: formData.adminEmail,
    adminName: formData.adminName,
    sendEmail: formData.sendEmail ?? true,
    enabledModules: correctedModules as any,
    moduleConfigs: correctedModuleConfigs,
    metadata: correctedMetadata,
  };

  console.log("✅ Transformed data:", transformedData);
  return transformedData;
};

// Test function to validate the transformation works
export const testTransformation = () => {
  const originalPayload = {
    name: "Mohd Aakib",
    orgId: "mohd-aakib",
    adminEmail: "akki@primussoft.com",
    adminName: "akki",
    sendEmail: true,
    enabledModules: ["auth", "rbac", "logging", "notifications"],
    moduleConfigs: {
      authentication: {
        providers: ["azure-ad", "local"],
        azureAd: { tenantId: "qq", clientId: "qq" },
      },
    },
    companyWebsite: "",
  };

  try {
    const transformed = transformTenantFormData(originalPayload);
    console.log("🎉 Transformation successful!");
    return transformed;
  } catch (error) {
    console.error("❌ Transformation failed:", error);
    throw error;
  }
};
