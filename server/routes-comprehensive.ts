// Backend API updates to handle comprehensive tenant configuration
import type { Express } from "express";
import {
  TenantOnboardingConfig,
  TenantOnboardingConfigSchema,
  validateTenantOnboardingConfig,
  getRequiredConfigFields,
} from "../shared/tenant-config-interface";
import { storage } from "./storage";
import { platformAdminMiddleware } from "./middleware/platform-admin";

// BACKEND INTEGRATION: Update your existing tenant creation endpoint
export function registerComprehensiveTenantRoutes(app: Express) {
  // Enhanced tenant creation with comprehensive configuration
  app.post("/api/tenants", platformAdminMiddleware, async (req, res) => {
    try {
      console.log("🚀 Comprehensive tenant creation request:", req.body);

      // STEP 1: Validate configuration against comprehensive schema
      const validatedConfig = validateTenantOnboardingConfig(req.body);
      console.log("✅ Configuration validated successfully");

      // STEP 2: Check required fields based on selected modules
      const enabledModules = Object.keys(validatedConfig.modules || {});
      const requiredFields = getRequiredConfigFields(enabledModules);
      console.log("📋 Required fields for selected modules:", requiredFields);

      // STEP 3: Validate module-specific requirements
      await validateModuleConfigurations(validatedConfig);

      // STEP 4: Create tenant with enhanced configuration
      const tenant = await createComprehensiveTenant(validatedConfig);

      // STEP 5: Initialize selected modules
      await initializeModulesForTenant(tenant.id, validatedConfig);

      // STEP 6: Send enhanced onboarding email
      await sendComprehensiveOnboardingEmail(tenant, validatedConfig);

      console.log(`✅ Tenant created successfully: ${tenant.name} (${tenant.orgId})`);

      res.status(201).json({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          orgId: tenant.orgId,
          status: tenant.status,
          enabledModules: enabledModules,
          configuredProviders: getConfiguredProviders(validatedConfig),
          createdAt: tenant.createdAt,
        },
        message: "Tenant created successfully with comprehensive configuration",
      });
    } catch (error: any) {
      console.error("❌ Comprehensive tenant creation failed:", error);

      // Enhanced error response
      if (error.errors) {
        // Zod validation errors
        return res.status(400).json({
          success: false,
          message: "Configuration validation failed",
          errors: error.errors.map((err: any) => ({
            field: err.path?.join?.(".") || "unknown",
            message: err.message,
            code: err.code,
          })),
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Failed to create tenant",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  });

  // Get tenant configuration details
  app.get("/api/tenants/:id/config", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await storage.getTenant(id);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const config = await getComprehensiveTenantConfig(tenant);
      res.json(config);
    } catch (error) {
      console.error("Error fetching tenant config:", error);
      res.status(500).json({ message: "Failed to fetch tenant configuration" });
    }
  });

  // Update tenant configuration
  app.put("/api/tenants/:id/config", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const configUpdates = validateTenantOnboardingConfig(req.body);

      const updatedTenant = await updateComprehensiveTenantConfig(id, configUpdates);

      res.json({
        success: true,
        tenant: updatedTenant,
        message: "Configuration updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating tenant config:", error);
      res.status(400).json({
        success: false,
        message: "Configuration update failed",
        errors: error.errors || [{ message: error.message }],
      });
    }
  });
}

// Helper function to validate module-specific configurations
async function validateModuleConfigurations(config: TenantOnboardingConfig): Promise<void> {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate Authentication module
  if (config.modules?.auth?.enabled) {
    const authConfig = config.modules.auth;

    if (!authConfig.providers || authConfig.providers.length === 0) {
      errors.push({
        field: "modules.auth.providers",
        message: "At least one authentication provider is required",
      });
    }

    // Validate provider-specific configurations
    if (authConfig.providers?.includes("azure-ad")) {
      const azureConfig = authConfig.providerConfigs?.azureAd;
      if (!azureConfig?.tenantId) {
        errors.push({
          field: "modules.auth.providerConfigs.azureAd.tenantId",
          message: "Azure AD Tenant ID is required",
        });
      }
      if (!azureConfig?.clientId) {
        errors.push({
          field: "modules.auth.providerConfigs.azureAd.clientId",
          message: "Azure AD Client ID is required",
        });
      }
      if (!azureConfig?.clientSecret) {
        errors.push({
          field: "modules.auth.providerConfigs.azureAd.clientSecret",
          message: "Azure AD Client Secret is required",
        });
      }
    }

    if (authConfig.providers?.includes("auth0")) {
      const auth0Config = authConfig.providerConfigs?.auth0;
      if (!auth0Config?.domain) {
        errors.push({
          field: "modules.auth.providerConfigs.auth0.domain",
          message: "Auth0 Domain is required",
        });
      }
      if (!auth0Config?.clientId) {
        errors.push({
          field: "modules.auth.providerConfigs.auth0.clientId",
          message: "Auth0 Client ID is required",
        });
      }
    }
  }

  // Validate Notifications module
  if (config.modules?.notifications?.enabled) {
    const notifConfig = config.modules.notifications;

    if (!notifConfig.channels || notifConfig.channels.length === 0) {
      errors.push({
        field: "modules.notifications.channels",
        message: "At least one notification channel is required",
      });
    }

    if (notifConfig.channels?.includes("email")) {
      if (!notifConfig.email?.fromEmail) {
        errors.push({
          field: "modules.notifications.email.fromEmail",
          message: "From email address is required for email notifications",
        });
      }
    }
  }

  // Validate AI Copilot module
  if (config.modules?.aiCopilot?.enabled) {
    const aiConfig = config.modules.aiCopilot;
    if (!aiConfig.provider) {
      errors.push({
        field: "modules.aiCopilot.provider",
        message: "AI provider selection is required",
      });
    }
  }

  if (errors.length > 0) {
    const error = new Error("Module configuration validation failed");
    (error as any).errors = errors;
    throw error;
  }
}

// Helper function to create tenant with comprehensive configuration
async function createComprehensiveTenant(config: TenantOnboardingConfig) {
  // Transform config to storage format
  const tenantData = {
    name: config.name,
    orgId: config.orgId,
    adminEmail: config.adminEmail,
    status: "active" as const,

    // Convert modules object to enabledModules array for storage
    enabledModules: Object.keys(config.modules || {}),

    // Store complete configuration in moduleConfigs
    moduleConfigs: config.modules || {},

    // Additional metadata
    metadata: {
      ...config.metadata,
      industry: config.industry,
      size: config.size,
      timezone: config.timezone,
      onboardingCompleted: true,
      configVersion: "v2.0", // Track config schema version
    },
  };

  return await storage.createTenant(tenantData);
}

// Helper function to initialize modules based on configuration
async function initializeModulesForTenant(tenantId: string, config: TenantOnboardingConfig) {
  const modules = config.modules || {};

  // Initialize Authentication module
  if (modules.auth?.enabled) {
    await initializeAuthModule(tenantId, modules.auth);
  }

  // Initialize RBAC module
  if (modules.rbac?.enabled) {
    await initializeRBACModule(tenantId, modules.rbac);
  }

  // Initialize Logging module
  if (modules.logging?.enabled) {
    await initializeLoggingModule(tenantId, modules.logging);
  }

  // Initialize Notifications module
  if (modules.notifications?.enabled) {
    await initializeNotificationsModule(tenantId, modules.notifications);
  }

  // Initialize AI Copilot module
  if (modules.aiCopilot?.enabled) {
    await initializeAICopilotModule(tenantId, modules.aiCopilot);
  }
}

async function initializeAuthModule(tenantId: string, authConfig: any) {
  console.log(`🔐 Initializing auth module for tenant ${tenantId}`);

  // Create authentication providers
  for (const providerType of authConfig.providers || []) {
    const providerConfig = authConfig.providerConfigs?.[providerType];

    if (providerConfig) {
      await storage.createAuthProvider(tenantId, {
        type: providerType,
        config: providerConfig,
        enabled: true,
      });
      console.log(`✅ ${providerType} provider configured`);
    }
  }
}

async function initializeRBACModule(tenantId: string, rbacConfig: any) {
  console.log(`🛡️ Initializing RBAC module for tenant ${tenantId}`);

  // Create default roles based on template
  const template = rbacConfig.permissionTemplate || "standard";
  const businessType = rbacConfig.businessType || "general";

  await storage.createDefaultRolesForTenant(tenantId, template, businessType);
  console.log(`✅ RBAC initialized with ${template} template for ${businessType} business`);
}

async function initializeNotificationsModule(tenantId: string, notifConfig: any) {
  console.log(`🔔 Initializing notifications module for tenant ${tenantId}`);

  // Setup email provider if configured
  if (notifConfig.email?.enabled) {
    await storage.createNotificationProvider(tenantId, {
      type: "email",
      config: notifConfig.email,
    });
    console.log(`✅ Email notifications configured with ${notifConfig.email.provider}`);
  }
}

async function initializeLoggingModule(tenantId: string, loggingConfig: any) {
  console.log(`📊 Initializing logging module for tenant ${tenantId}`);

  // Setup logging destinations
  const destinations = loggingConfig.destinations || { database: { enabled: true } };

  await storage.createLoggingConfig(tenantId, {
    levels: loggingConfig.levels || ["error", "warn", "info"],
    destinations: destinations,
  });
  console.log(`✅ Logging configured with destinations: ${Object.keys(destinations).join(", ")}`);
}

async function initializeAICopilotModule(tenantId: string, aiConfig: any) {
  console.log(`🤖 Initializing AI Copilot module for tenant ${tenantId}`);

  // Store AI configuration (API keys stored securely)
  await storage.createAIConfig(tenantId, {
    provider: aiConfig.provider,
    capabilities: aiConfig.capabilities || { chatSupport: true },
    safety: aiConfig.safety || { contentFiltering: true },
  });
  console.log(`✅ AI Copilot configured with ${aiConfig.provider} provider`);
}

// Helper function to get configured providers for response
function getConfiguredProviders(config: TenantOnboardingConfig): string[] {
  const providers: string[] = [];

  if (config.modules?.auth?.providers) {
    providers.push(...config.modules.auth.providers);
  }

  return providers;
}

// Helper function to send comprehensive onboarding email
async function sendComprehensiveOnboardingEmail(tenant: any, config: TenantOnboardingConfig) {
  const emailContent = {
    tenantInfo: {
      name: tenant.name,
      orgId: tenant.orgId,
      adminEmail: tenant.adminEmail,
    },
    enabledModules: Object.keys(config.modules || {}),
    authProviders: config.modules?.auth?.providers || [],
    nextSteps: generateNextSteps(config),
    apiKeys: {
      auth: tenant.authApiKey,
      rbac: tenant.rbacApiKey,
      logging: tenant.loggingApiKey,
      notifications: tenant.notificationsApiKey,
    },
  };

  return await storage.sendEnhancedOnboardingEmail(emailContent);
}

// Helper function to generate next steps based on configuration
function generateNextSteps(config: TenantOnboardingConfig): string[] {
  const steps: string[] = [];

  if (config.modules?.auth?.providers?.includes("azure-ad")) {
    steps.push("Configure Azure AD application permissions");
    steps.push("Test Azure AD SSO integration");
  }

  if (config.modules?.notifications?.enabled) {
    steps.push("Set up notification templates");
    steps.push("Configure email delivery settings");
  }

  if (config.modules?.aiCopilot?.enabled) {
    steps.push("Complete AI provider API key setup");
    steps.push("Configure AI safety settings");
  }

  steps.push("Review and test your tenant configuration");
  steps.push("Invite users to your organization");

  return steps;
}

// Helper function to get comprehensive tenant configuration
async function getComprehensiveTenantConfig(tenant: any): Promise<TenantOnboardingConfig> {
  const storedConfig = tenant.moduleConfigs || {};
  const metadata = tenant.metadata || {};

  return {
    name: tenant.name,
    orgId: tenant.orgId,
    adminEmail: tenant.adminEmail,
    adminName: metadata.adminName || tenant.adminEmail,
    description: metadata.description,
    website: metadata.website,
    industry: metadata.industry || "technology",
    size: metadata.size || "startup",
    timezone: metadata.timezone || "UTC",
    locale: metadata.locale || "en-US",
    modules: storedConfig,
    deployment: metadata.deployment,
    billing: metadata.billing,
    limits: metadata.limits,
    compliance: metadata.compliance,
    integrations: metadata.integrations,
    onboarding: metadata.onboarding,
    metadata: {
      source: metadata.source || "api",
      configVersion: metadata.configVersion || "v2.0",
    },
  };
}

// Helper function to update comprehensive tenant configuration
async function updateComprehensiveTenantConfig(
  tenantId: string,
  configUpdates: TenantOnboardingConfig
) {
  // Get current tenant
  const currentTenant = await storage.getTenant(tenantId);
  if (!currentTenant) {
    throw new Error("Tenant not found");
  }

  // Merge configurations
  const currentConfig = await getComprehensiveTenantConfig(currentTenant);
  const mergedConfig = {
    ...currentConfig,
    ...configUpdates,
    modules: {
      ...currentConfig.modules,
      ...configUpdates.modules,
    },
  };

  // Validate merged configuration
  const validatedConfig = validateTenantOnboardingConfig(mergedConfig);

  // Update tenant in storage
  const updatedTenant = await storage.updateTenant(tenantId, {
    moduleConfigs: validatedConfig.modules,
    metadata: {
      ...currentTenant.metadata,
      ...validatedConfig.metadata,
      lastConfigUpdate: new Date().toISOString(),
      configVersion: "v2.0",
    },
  });

  // Re-initialize modules if needed
  await initializeModulesForTenant(tenantId, validatedConfig);

  return updatedTenant;
}

export {
  registerComprehensiveTenantRoutes,
  validateModuleConfigurations,
  createComprehensiveTenant,
  initializeModulesForTenant,
};
