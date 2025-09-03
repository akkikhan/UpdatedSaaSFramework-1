// Practical update to your existing routes.ts - replacing the problematic tenant creation endpoint
// This shows exactly how to update your current code with minimal changes

// Add these imports at the top of your routes.ts file
import {
  TenantOnboardingConfig,
  validateTenantOnboardingConfig,
  getRequiredConfigFields,
} from "../shared/tenant-config-interface";

// REPLACE your existing "/api/tenants" POST route with this enhanced version:
export function updateExistingTenantRoute(app: Express) {
  // Enhanced tenant creation (replace your existing one)
  app.post("/api/tenants", platformAdminMiddleware, async (req, res) => {
    try {
      console.log("🚀 Enhanced tenant creation request:", req.body);

      // STEP 1: Validate using comprehensive schema (replaces insertTenantSchema.parse)
      const validatedConfig = validateTenantOnboardingConfig(req.body);
      console.log("✅ Comprehensive validation passed");

      // STEP 2: Check for orgId conflicts (keep your existing logic)
      const existingTenant = await storage.getTenantByOrgId(validatedConfig.orgId);
      if (existingTenant) {
        return res.status(400).json({
          success: false,
          message: "Organization ID already exists",
          field: "orgId",
        });
      }

      // STEP 3: Transform config to your existing storage format
      const tenantData = {
        name: validatedConfig.name,
        orgId: validatedConfig.orgId,
        adminEmail: validatedConfig.adminEmail,
        status: "active" as const,

        // Convert modules object to enabledModules array (your current format)
        enabledModules: Object.keys(validatedConfig.modules || {}),

        // Store comprehensive config in moduleConfigs (enhanced)
        moduleConfigs: validatedConfig.modules || {},

        // Store additional metadata
        metadata: {
          ...validatedConfig.metadata,
          industry: validatedConfig.industry,
          size: validatedConfig.size,
          website: validatedConfig.website,
          timezone: validatedConfig.timezone,
          onboardingVersion: "v2.0",
          createdVia: "comprehensive-ui",
        },
      };

      // STEP 4: Create tenant (keep your existing storage call)
      const tenant = await storage.createTenant(tenantData);
      console.log(`✅ Tenant created: ${tenant.name} (${tenant.orgId})`);

      // STEP 5: Enhanced module initialization
      await initializeSelectedModules(tenant.id, validatedConfig);

      // STEP 6: Send enhanced onboarding email (replace your existing email logic)
      const shouldSendEmail = validatedConfig.onboarding?.sendWelcomeEmail !== false;
      if (shouldSendEmail) {
        const emailSent = await sendEnhancedOnboardingEmail(tenant, validatedConfig);
        if (!emailSent) {
          console.warn(`Failed to send onboarding email to ${tenant.adminEmail}`);
        } else {
          console.log(`📧 Enhanced onboarding email sent to ${tenant.adminEmail}`);
        }
      }

      // STEP 7: Enhanced response with configuration summary
      res.status(201).json({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          orgId: tenant.orgId,
          status: tenant.status,
          adminEmail: tenant.adminEmail,
          enabledModules: Object.keys(validatedConfig.modules || {}),
          configuredProviders: getConfiguredProviders(validatedConfig),
          createdAt: tenant.createdAt,
        },
        configuration: {
          modulesEnabled: Object.keys(validatedConfig.modules || {}).length,
          authProviders: validatedConfig.modules?.auth?.providers?.length || 0,
          notificationChannels: validatedConfig.modules?.notifications?.channels?.length || 0,
          aiEnabled: validatedConfig.modules?.aiCopilot?.enabled || false,
        },
        nextSteps: generatePostCreationSteps(validatedConfig),
        message: "Tenant created successfully with comprehensive configuration",
      });
    } catch (error: any) {
      console.error("❌ Enhanced tenant creation failed:", error);

      // Enhanced error handling (replace your existing catch block)
      if (error.errors) {
        // Detailed validation errors from comprehensive schema
        return res.status(400).json({
          success: false,
          message: "Configuration validation failed",
          errors: error.errors.map((err: any) => ({
            field: err.path?.join?.(".") || "unknown",
            message: err.message,
            code: err.code,
            received: err.received,
            expected: err.expected || err.options,
          })),
          hint: "Please check the required configuration for selected modules",
        });
      }

      // Handle other errors
      const statusCode = error.message?.includes("already exists") ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to create tenant",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  });
}

// Enhanced module initialization functions
async function initializeSelectedModules(tenantId: string, config: TenantOnboardingConfig) {
  const initResults: Record<string, boolean> = {};

  try {
    // Initialize Authentication
    if (config.modules?.auth?.enabled) {
      await initializeAuthenticationModule(tenantId, config.modules.auth);
      initResults.auth = true;
      console.log("✅ Authentication module initialized");
    }

    // Initialize RBAC (usually auto-enabled with auth)
    if (config.modules?.rbac?.enabled) {
      await initializeRBACModule(tenantId, config.modules.rbac);
      initResults.rbac = true;
      console.log("✅ RBAC module initialized");
    }

    // Initialize Logging
    if (config.modules?.logging?.enabled) {
      await initializeLoggingModule(tenantId, config.modules.logging);
      initResults.logging = true;
      console.log("✅ Logging module initialized");
    }

    // Initialize Notifications
    if (config.modules?.notifications?.enabled) {
      await initializeNotificationsModule(tenantId, config.modules.notifications);
      initResults.notifications = true;
      console.log("✅ Notifications module initialized");
    }

    // Initialize AI Copilot
    if (config.modules?.aiCopilot?.enabled) {
      await initializeAICopilotModule(tenantId, config.modules.aiCopilot);
      initResults.aiCopilot = true;
      console.log("✅ AI Copilot module initialized");
    }

    console.log("🎉 All selected modules initialized successfully:", initResults);
  } catch (error) {
    console.error("⚠️ Some modules failed to initialize:", error);
    // Don't fail tenant creation if module init fails
  }
}

async function initializeAuthenticationModule(tenantId: string, authConfig: any) {
  // Create authentication providers based on configuration
  const providers = authConfig.providers || ["local"];
  const providerConfigs = authConfig.providerConfigs || {};

  for (const providerType of providers) {
    const config = providerConfigs[providerType] || {};

    // Store provider configuration in your database
    await storage.createTenantAuthProvider(tenantId, {
      type: providerType,
      name: getProviderDisplayName(providerType),
      config: config,
      enabled: true,
      priority: providers.indexOf(providerType) + 1,
    });
  }

  // Set default provider
  if (authConfig.defaultProvider) {
    await storage.setDefaultAuthProvider(tenantId, authConfig.defaultProvider);
  }
}

async function initializeNotificationsModule(tenantId: string, notifConfig: any) {
  // Setup notification channels
  const channels = notifConfig.channels || ["email"];

  for (const channel of channels) {
    const channelConfig = notifConfig[channel];

    if (channelConfig?.enabled) {
      await storage.createNotificationChannel(tenantId, {
        type: channel,
        config: channelConfig,
        enabled: true,
      });
    }
  }

  // Setup default templates
  if (notifConfig.templates) {
    await storage.createDefaultNotificationTemplates(tenantId, notifConfig.templates);
  }
}

function getProviderDisplayName(type: string): string {
  const names: Record<string, string> = {
    "azure-ad": "Azure AD SSO",
    auth0: "Auth0",
    saml: "SAML SSO",
    local: "Username/Password",
  };
  return names[type] || type;
}

function getConfiguredProviders(config: TenantOnboardingConfig): string[] {
  return config.modules?.auth?.providers || [];
}

function generatePostCreationSteps(config: TenantOnboardingConfig): string[] {
  const steps: string[] = [];

  // Authentication steps
  if (config.modules?.auth?.providers?.includes("azure-ad")) {
    steps.push("Complete Azure AD application setup in Azure Portal");
    steps.push("Test Azure AD SSO integration");
  }

  if (config.modules?.auth?.providers?.includes("auth0")) {
    steps.push("Configure Auth0 application settings");
    steps.push("Set up Auth0 branding and login flow");
  }

  // Notification steps
  if (config.modules?.notifications?.enabled) {
    steps.push("Configure notification templates");
    if (config.modules.notifications.email?.provider !== "smtp") {
      steps.push(`Set up ${config.modules.notifications.email?.provider} API credentials`);
    }
  }

  // AI Copilot steps
  if (config.modules?.aiCopilot?.enabled) {
    steps.push(`Configure ${config.modules.aiCopilot.provider} API keys securely`);
    steps.push("Set up AI usage monitoring and limits");
  }

  // General steps
  steps.push("Review tenant configuration in admin portal");
  steps.push("Create initial user accounts");
  steps.push("Test all enabled module functionality");

  return steps;
}

async function sendEnhancedOnboardingEmail(tenant: any, config: TenantOnboardingConfig) {
  const emailData = {
    to: tenant.adminEmail,
    template: "comprehensive-onboarding",
    data: {
      tenantName: tenant.name,
      orgId: tenant.orgId,
      adminName: config.adminName,
      enabledModules: Object.keys(config.modules || {}),
      authProviders: config.modules?.auth?.providers || [],
      dashboardUrl: `${process.env.CLIENT_URL}/tenant/${tenant.orgId}/dashboard`,
      apiKeys: {
        auth: tenant.authApiKey,
        rbac: tenant.rbacApiKey,
        logging: tenant.loggingApiKey,
        notifications: tenant.notificationsApiKey,
      },
      nextSteps: generatePostCreationSteps(config),
      supportEmail: process.env.SUPPORT_EMAIL || "support@yourapp.com",
    },
  };

  return await storage.sendTemplatedEmail(emailData);
}

export { updateExistingTenantRoute };
