// Test script to verify auth provider transformation logic
const testFormData = {
  name: "Test Company",
  orgId: "test-org",
  adminEmail: "admin@test.com",
  sendEmail: true,
  enabledModules: ["authentication", "rbac", "logging"],
  moduleConfigs: {
    authentication: {
      providers: ["azure-ad", "local"],
      azureAd: {
        tenantId: "test-tenant-id",
        clientId: "test-client-id",
      },
      local: {
        secretKey: "test-secret",
      },
    },
    rbac: {
      defaultRoles: ["admin", "user"],
    },
    logging: {
      levels: ["error", "warn", "info"],
    },
  },
  metadata: {
    adminName: "Test Admin",
    companyWebsite: "https://test.com",
  },
};

// Transformation logic (copied from onSubmit function)
const moduleNameMap = {
  authentication: "auth",
  rbac: "rbac",
  logging: "logging",
  notifications: "notifications",
  aiCopilot: "ai-copilot",
};

const transformedModules = testFormData.enabledModules.map(
  module => moduleNameMap[module] || module
);

// Transform moduleConfigs
const transformedModuleConfigs = {};
Object.entries(testFormData.moduleConfigs).forEach(([key, value]) => {
  const transformedKey = moduleNameMap[key] || key;

  // Special handling for authentication module
  if (transformedKey === "auth" && value && typeof value === "object") {
    const authConfig = value;
    const transformedAuth = { ...authConfig };

    // Transform providers from simple strings to complex objects
    if (authConfig.providers && Array.isArray(authConfig.providers)) {
      transformedAuth.providers = authConfig.providers.map((providerType, index) => {
        // Get provider-specific config
        let config = {};

        // Map provider keys to form field names
        const configKeyMap = {
          "azure-ad": "azureAd",
          auth0: "auth0",
          local: "local",
          saml: "saml",
        };

        const formConfigKey = configKeyMap[providerType];
        if (formConfigKey && authConfig[formConfigKey]) {
          config = authConfig[formConfigKey];
        }

        // Create provider object structure expected by backend
        return {
          type: providerType,
          name: providerType
            .split("-")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "), // "azure-ad" -> "Azure Ad"
          priority: index + 1,
          config: config,
          userMapping: {
            emailField: "email",
            nameField: "name",
          },
          enabled: true,
        };
      });

      // Remove the individual provider config objects
      delete transformedAuth.auth0;
      delete transformedAuth.azureAd;
      delete transformedAuth.local;
      delete transformedAuth.saml;
    }

    transformedModuleConfigs[transformedKey] = transformedAuth;
  } else {
    transformedModuleConfigs[transformedKey] = value;
  }
});

const finalData = {
  name: testFormData.name,
  orgId: testFormData.orgId,
  adminEmail: testFormData.adminEmail,
  sendEmail: testFormData.sendEmail,
  enabledModules: transformedModules,
  moduleConfigs: transformedModuleConfigs,
  metadata: testFormData.metadata,
};

console.log("=== TRANSFORMATION TEST ===");
console.log("\n🔸 Original Form Data:");
console.log(JSON.stringify(testFormData, null, 2));

console.log("\n🔸 Transformed Data:");
console.log(JSON.stringify(finalData, null, 2));

console.log("\n🔸 Auth Providers (Before):");
console.log(testFormData.moduleConfigs.authentication.providers);

console.log("\n🔸 Auth Providers (After):");
console.log(JSON.stringify(finalData.moduleConfigs.auth.providers, null, 2));

console.log("\n✅ Transformation completed successfully!");
