import { z } from "zod";

// ==========================================
// COMPREHENSIVE TENANT ONBOARDING INTERFACE
// ==========================================

// Base module configuration interface
export interface BaseModuleConfig {
  enabled: boolean;
  priority?: number;
  customSettings?: Record<string, any>;
}

// ==========================================
// AUTHENTICATION MODULE CONFIGURATION
// ==========================================

export const AuthProviderConfigSchema = z.object({
  // Azure AD Configuration
  azureAd: z
    .object({
      tenantId: z.string().min(1, "Azure AD Tenant ID is required"),
      clientId: z.string().min(1, "Azure AD Client ID is required"),
      clientSecret: z.string().min(1, "Azure AD Client Secret is required"),
      redirectUri: z.string().url("Valid redirect URI required").optional(),
      scopes: z.array(z.string()).default(["User.Read"]),
      allowedDomains: z.array(z.string()).optional(), // Restrict to specific domains
    })
    .optional(),

  // Auth0 Configuration
  auth0: z
    .object({
      domain: z.string().min(1, "Auth0 Domain is required"),
      clientId: z.string().min(1, "Auth0 Client ID is required"),
      clientSecret: z.string().min(1, "Auth0 Client Secret is required"),
      audience: z.string().optional(),
      scope: z.string().default("openid profile email"),
      connectionName: z.string().optional(),
    })
    .optional(),

  // SAML Configuration
  saml: z
    .object({
      entryPoint: z.string().url("Valid SAML entry point URL required"),
      issuer: z.string().min(1, "SAML Issuer is required"),
      cert: z.string().min(1, "SAML Certificate is required"),
      identifierFormat: z.string().optional(),
      signatureAlgorithm: z.enum(["sha1", "sha256"]).default("sha256"),
      digestAlgorithm: z.enum(["sha1", "sha256"]).default("sha256"),
      authnContextClassRef: z.string().optional(),
    })
    .optional(),

  // Local Authentication Configuration
  local: z
    .object({
      jwtSecret: z.string().min(32, "JWT Secret must be at least 32 characters").optional(),
      jwtExpiresIn: z.string().default("24h"),
      passwordPolicy: z
        .object({
          minLength: z.number().min(8).default(8),
          requireUppercase: z.boolean().default(true),
          requireLowercase: z.boolean().default(true),
          requireNumbers: z.boolean().default(true),
          requireSpecialChars: z.boolean().default(true),
          maxAttempts: z.number().default(5),
          lockoutDuration: z.string().default("15m"),
        })
        .optional(),
      enableRegistration: z.boolean().default(true),
      requireEmailVerification: z.boolean().default(true),
      enablePasswordReset: z.boolean().default(true),
    })
    .optional(),
});

export const AuthModuleConfigSchema = z.object({
  enabled: z.boolean().default(true),
  providers: z
    .array(z.enum(["azure-ad", "auth0", "saml", "local"]))
    .min(1, "At least one auth provider required"),
  providerConfigs: AuthProviderConfigSchema,
  defaultProvider: z.enum(["azure-ad", "auth0", "saml", "local"]).optional(),
  allowFallback: z.boolean().default(true),
  userMapping: z
    .object({
      emailField: z.string().default("email"),
      nameField: z.string().default("name"),
      firstNameField: z.string().default("given_name"),
      lastNameField: z.string().default("family_name"),
      roleField: z.string().optional(),
      departmentField: z.string().optional(),
    })
    .optional(),
  sessionSettings: z
    .object({
      maxConcurrentSessions: z.number().default(5),
      sessionTimeout: z.string().default("8h"),
      refreshTokenExpiry: z.string().default("30d"),
      rememberMeExpiry: z.string().default("30d"),
    })
    .optional(),
});

export type AuthModuleConfig = z.infer<typeof AuthModuleConfigSchema>;

// ==========================================
// RBAC MODULE CONFIGURATION
// ==========================================

export const RBACModuleConfigSchema = z.object({
  enabled: z.boolean().default(true),
  permissionTemplate: z.enum(["minimal", "standard", "enterprise", "custom"]).default("standard"),
  businessType: z
    .enum(["general", "healthcare", "finance", "education", "government", "enterprise"])
    .default("general"),

  defaultRoles: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        permissions: z.array(z.string()),
        isSystemRole: z.boolean().default(false),
        inheritFrom: z.string().optional(), // Role inheritance
      })
    )
    .optional(),

  customPermissions: z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        description: z.string(),
        category: z.string(),
        riskLevel: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      })
    )
    .optional(),

  permissionGroups: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        permissions: z.array(z.string()),
        color: z.string().optional(),
      })
    )
    .optional(),

  settings: z
    .object({
      enableRoleInheritance: z.boolean().default(true),
      enablePermissionDelegation: z.boolean().default(false),
      requireApprovalForHighRisk: z.boolean().default(true),
      maxRolesPerUser: z.number().default(10),
      roleExpirationEnabled: z.boolean().default(false),
      defaultRoleExpiry: z.string().default("1y"),
    })
    .optional(),

  complianceSettings: z
    .object({
      enableAuditLog: z.boolean().default(true),
      enableAccessReview: z.boolean().default(false),
      accessReviewFrequency: z.enum(["monthly", "quarterly", "yearly"]).default("quarterly"),
      enableSODControl: z.boolean().default(false), // Segregation of Duties
    })
    .optional(),
});

export type RBACModuleConfig = z.infer<typeof RBACModuleConfigSchema>;

// ==========================================
// LOGGING MODULE CONFIGURATION
// ==========================================

export const LoggingModuleConfigSchema = z.object({
  enabled: z.boolean().default(true),
  levels: z
    .array(z.enum(["error", "warn", "info", "debug", "trace"]))
    .default(["error", "warn", "info"]),

  destinations: z
    .object({
      database: z
        .object({
          enabled: z.boolean().default(true),
          tableName: z.string().default("application_logs"),
          maxRecords: z.number().default(100000),
        })
        .optional(),
      elasticsearch: z
        .object({
          enabled: z.boolean().default(false),
          endpoint: z.string().url().optional(),
          apiKey: z.string().optional(),
          indexPattern: z.string().default("tenant-logs-{date}"),
        })
        .optional(),
      cloudwatch: z
        .object({
          enabled: z.boolean().default(false),
          region: z.string().optional(),
          logGroupName: z.string().optional(),
          accessKeyId: z.string().optional(),
          secretAccessKey: z.string().optional(),
        })
        .optional(),
      datadog: z
        .object({
          enabled: z.boolean().default(false),
          apiKey: z.string().optional(),
          site: z.enum(["datadoghq.com", "datadoghq.eu"]).default("datadoghq.com"),
          service: z.string().optional(),
        })
        .optional(),
    })
    .optional(),

  retention: z
    .object({
      error: z.string().default("1y"), // 1 year
      security: z.string().default("7y"), // 7 years for compliance
      audit: z.string().default("7y"), // 7 years for compliance
      performance: z.string().default("90d"), // 90 days
      general: z.string().default("30d"), // 30 days
    })
    .optional(),

  alerting: z
    .object({
      enabled: z.boolean().default(true),
      errorThreshold: z.number().default(10), // Errors per minute
      securityEvents: z.boolean().default(true),
      performanceDegradation: z.boolean().default(true),
      alertChannels: z.array(z.enum(["email", "slack", "webhook"])).default(["email"]),
      emailRecipients: z.array(z.string().email()).optional(),
      slackWebhook: z.string().url().optional(),
      customWebhook: z.string().url().optional(),
    })
    .optional(),

  formatting: z
    .object({
      format: z.enum(["json", "text", "structured"]).default("json"),
      timezone: z.string().default("UTC"),
      includeStackTrace: z.boolean().default(true),
      includeMeta: z.boolean().default(true),
      sensitiveFields: z.array(z.string()).default(["password", "token", "apiKey"]),
    })
    .optional(),

  sampling: z
    .object({
      enabled: z.boolean().default(false),
      rate: z.number().min(0).max(1).default(1.0), // 100% by default
      rulesEnabled: z.boolean().default(false),
      rules: z
        .array(
          z.object({
            condition: z.string(),
            rate: z.number().min(0).max(1),
          })
        )
        .optional(),
    })
    .optional(),
});

export type LoggingModuleConfig = z.infer<typeof LoggingModuleConfigSchema>;

// ==========================================
// NOTIFICATIONS MODULE CONFIGURATION
// ==========================================

export const NotificationsModuleConfigSchema = z.object({
  enabled: z.boolean().default(true),
  channels: z
    .array(z.enum(["email", "sms", "push", "webhook", "slack"]))
    .min(1, "At least one notification channel required"),

  // Email Configuration
  email: z
    .object({
      enabled: z.boolean().default(true),
      provider: z.enum(["sendgrid", "mailgun", "ses", "smtp", "resend"]).default("smtp"),
      sendgridApiKey: z.string().optional(),
      mailgunApiKey: z.string().optional(),
      mailgunDomain: z.string().optional(),
      awsAccessKey: z.string().optional(),
      awsSecretKey: z.string().optional(),
      awsRegion: z.string().optional(),
      resendApiKey: z.string().optional(),
      smtpHost: z.string().optional(),
      smtpPort: z.number().optional(),
      smtpUser: z.string().optional(),
      smtpPassword: z.string().optional(),
      smtpSecure: z.boolean().default(true),
      fromEmail: z.string().email("Valid from email required"),
      fromName: z.string().default("System Notifications"),
      replyTo: z.string().email().optional(),
    })
    .optional(),

  // SMS Configuration
  sms: z
    .object({
      enabled: z.boolean().default(false),
      provider: z.enum(["twilio", "vonage", "aws-sns"]).default("twilio"),
      twilioAccountSid: z.string().optional(),
      twilioAuthToken: z.string().optional(),
      twilioFromNumber: z.string().optional(),
      vonageApiKey: z.string().optional(),
      vonageApiSecret: z.string().optional(),
      vonageFromNumber: z.string().optional(),
      awsAccessKey: z.string().optional(),
      awsSecretKey: z.string().optional(),
      awsRegion: z.string().optional(),
    })
    .optional(),

  // Push Notifications Configuration
  push: z
    .object({
      enabled: z.boolean().default(false),
      provider: z.enum(["firebase", "apn", "onesignal"]).default("firebase"),
      firebaseServerKey: z.string().optional(),
      firebaseProjectId: z.string().optional(),
      apnKeyId: z.string().optional(),
      apnTeamId: z.string().optional(),
      apnPrivateKey: z.string().optional(),
      apnProduction: z.boolean().default(false),
      oneSignalAppId: z.string().optional(),
      oneSignalApiKey: z.string().optional(),
    })
    .optional(),

  // Webhook Configuration
  webhook: z
    .object({
      enabled: z.boolean().default(false),
      endpoints: z
        .array(
          z.object({
            name: z.string(),
            url: z.string().url(),
            method: z.enum(["POST", "PUT"]).default("POST"),
            headers: z.record(z.string()).optional(),
            authentication: z
              .object({
                type: z.enum(["none", "bearer", "basic", "apikey"]).default("none"),
                token: z.string().optional(),
                username: z.string().optional(),
                password: z.string().optional(),
                apiKeyHeader: z.string().optional(),
                apiKeyValue: z.string().optional(),
              })
              .optional(),
            retryPolicy: z
              .object({
                maxRetries: z.number().default(3),
                retryDelay: z.number().default(1000), // milliseconds
              })
              .optional(),
          })
        )
        .optional(),
    })
    .optional(),

  // Slack Configuration
  slack: z
    .object({
      enabled: z.boolean().default(false),
      webhookUrl: z.string().url().optional(),
      botToken: z.string().optional(),
      defaultChannel: z.string().default("#notifications"),
      username: z.string().default("System Bot"),
      iconEmoji: z.string().default(":robot_face:"),
    })
    .optional(),

  // Templates Configuration
  templates: z
    .object({
      welcome: z.boolean().default(true),
      trial_ending: z.boolean().default(true),
      payment_failed: z.boolean().default(true),
      security_alert: z.boolean().default(true),
      password_reset: z.boolean().default(true),
      account_locked: z.boolean().default(true),
      custom: z
        .array(
          z.object({
            name: z.string(),
            subject: z.string(),
            body: z.string(),
            channels: z.array(z.string()),
          })
        )
        .optional(),
    })
    .optional(),

  // Rate Limiting & Delivery Settings
  settings: z
    .object({
      rateLimitPerMinute: z.number().default(60),
      batchSize: z.number().default(100),
      deliveryTimeout: z.number().default(30000), // 30 seconds
      enableDeliveryTracking: z.boolean().default(true),
      enableUnsubscribe: z.boolean().default(true),
      enableOptIn: z.boolean().default(false),
      quietHours: z
        .object({
          enabled: z.boolean().default(false),
          startTime: z.string().default("22:00"),
          endTime: z.string().default("08:00"),
          timezone: z.string().default("UTC"),
        })
        .optional(),
    })
    .optional(),
});

export type NotificationsModuleConfig = z.infer<typeof NotificationsModuleConfigSchema>;

// ==========================================
// AI COPILOT MODULE CONFIGURATION
// ==========================================

export const AICopilotModuleConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z
    .enum(["openai", "anthropic", "azure-openai", "aws-bedrock", "google-ai"])
    .default("openai"),

  // Provider Configurations
  openai: z
    .object({
      apiKey: z.string().optional(),
      organization: z.string().optional(),
      model: z.string().default("gpt-4"),
      maxTokens: z.number().default(4096),
      temperature: z.number().min(0).max(2).default(0.7),
    })
    .optional(),

  anthropic: z
    .object({
      apiKey: z.string().optional(),
      model: z.string().default("claude-3-sonnet-20240229"),
      maxTokens: z.number().default(4096),
    })
    .optional(),

  azureOpenai: z
    .object({
      endpoint: z.string().url().optional(),
      apiKey: z.string().optional(),
      deploymentName: z.string().optional(),
      apiVersion: z.string().default("2023-12-01-preview"),
    })
    .optional(),

  awsBedrock: z
    .object({
      region: z.string().optional(),
      accessKeyId: z.string().optional(),
      secretAccessKey: z.string().optional(),
      modelId: z.string().default("anthropic.claude-3-sonnet-20240229-v1:0"),
    })
    .optional(),

  // Capabilities
  capabilities: z
    .object({
      chatSupport: z.boolean().default(true),
      codeAssistance: z.boolean().default(false),
      documentAnalysis: z.boolean().default(false),
      workflowAutomation: z.boolean().default(false),
      dataInsights: z.boolean().default(false),
      contentGeneration: z.boolean().default(false),
    })
    .optional(),

  // Safety & Security Settings
  safety: z
    .object({
      contentFiltering: z.boolean().default(true),
      piiDetection: z.boolean().default(true),
      rateLimiting: z.boolean().default(true),
      auditLogging: z.boolean().default(true),
      userConsent: z.boolean().default(true),
      dataRetention: z.string().default("30d"),
      allowedDomains: z.array(z.string()).optional(),
      blockedTopics: z.array(z.string()).optional(),
    })
    .optional(),

  // Usage Controls
  usage: z
    .object({
      maxRequestsPerUser: z.number().default(100), // per day
      maxRequestsPerTenant: z.number().default(1000), // per day
      costLimit: z.number().optional(), // USD per month
      enableUsageAlerts: z.boolean().default(true),
      alertThreshold: z.number().default(0.8), // 80% of limit
    })
    .optional(),

  // UI Configuration
  ui: z
    .object({
      enabled: z.boolean().default(true),
      position: z.enum(["bottom-right", "bottom-left", "sidebar"]).default("bottom-right"),
      theme: z.enum(["light", "dark", "auto"]).default("auto"),
      welcomeMessage: z.string().default("Hi! I'm your AI assistant. How can I help you today?"),
      placeholder: z.string().default("Ask me anything..."),
      showSuggestions: z.boolean().default(true),
      suggestions: z.array(z.string()).optional(),
    })
    .optional(),
});

export type AICopilotModuleConfig = z.infer<typeof AICopilotModuleConfigSchema>;

// ==========================================
// COMPREHENSIVE TENANT ONBOARDING INTERFACE
// ==========================================

export const TenantOnboardingConfigSchema = z.object({
  // Basic Information
  name: z.string().min(1, "Organization name is required"),
  orgId: z
    .string()
    .min(1, "Organization ID is required")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  adminEmail: z.string().email("Valid admin email required"),
  adminName: z.string().min(1, "Admin name is required"),

  // Optional Basic Info
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  industry: z
    .enum([
      "technology",
      "healthcare",
      "finance",
      "education",
      "government",
      "retail",
      "manufacturing",
      "other",
    ])
    .optional(),
  size: z.enum(["startup", "small", "medium", "large", "enterprise"]).optional(),
  timezone: z.string().default("UTC"),
  locale: z.string().default("en-US"),

  // Module Selection & Configuration
  modules: z.object({
    auth: AuthModuleConfigSchema.optional(),
    rbac: RBACModuleConfigSchema.optional(),
    logging: LoggingModuleConfigSchema.optional(),
    notifications: NotificationsModuleConfigSchema.optional(),
    aiCopilot: AICopilotModuleConfigSchema.optional(),
  }),

  // Deployment Settings
  deployment: z
    .object({
      environment: z.enum(["development", "staging", "production"]).default("development"),
      region: z.string().default("us-east-1"),
      subdomain: z.string().optional(), // tenant.yourapp.com
      customDomain: z.string().optional(), // app.tenant.com
      ssl: z.boolean().default(true),
      cdn: z.boolean().default(false),
    })
    .optional(),

  // Billing & Limits
  billing: z
    .object({
      plan: z.enum(["free", "starter", "professional", "enterprise"]).default("starter"),
      billingEmail: z.string().email().optional(),
      paymentMethod: z.enum(["invoice", "card", "bank"]).optional(),
      currency: z.string().default("USD"),
      taxId: z.string().optional(),
    })
    .optional(),

  limits: z
    .object({
      maxUsers: z.number().default(100),
      maxStorage: z.string().default("10GB"), // e.g., "10GB", "1TB"
      maxApiCalls: z.number().default(10000), // per month
      maxBandwidth: z.string().default("100GB"), // per month
    })
    .optional(),

  // Compliance & Security
  compliance: z
    .object({
      frameworks: z.array(z.enum(["gdpr", "hipaa", "sox", "pci", "iso27001"])).default([]),
      dataResidency: z.string().optional(), // "EU", "US", "APAC"
      encryptionAtRest: z.boolean().default(true),
      encryptionInTransit: z.boolean().default(true),
      backupFrequency: z.enum(["daily", "weekly", "monthly"]).default("daily"),
      auditLogging: z.boolean().default(true),
    })
    .optional(),

  // Integration Settings
  integrations: z
    .object({
      webhooks: z
        .array(
          z.object({
            name: z.string(),
            url: z.string().url(),
            events: z.array(z.string()),
            enabled: z.boolean().default(true),
          })
        )
        .optional(),
      apiKeys: z
        .object({
          allowGeneration: z.boolean().default(true),
          maxKeys: z.number().default(5),
          defaultExpiry: z.string().default("1y"),
        })
        .optional(),
    })
    .optional(),

  // Onboarding Settings
  onboarding: z
    .object({
      sendWelcomeEmail: z.boolean().default(true),
      enableTutorial: z.boolean().default(true),
      autoProvisionUsers: z.boolean().default(false),
      requireSetup: z.boolean().default(true),
    })
    .optional(),

  // Metadata for tracking
  metadata: z
    .object({
      source: z.string().optional(), // "api", "ui", "import"
      referrer: z.string().optional(),
      utm: z.record(z.string()).optional(),
      customFields: z.record(z.any()).optional(),
    })
    .optional(),
});

export type TenantOnboardingConfig = z.infer<typeof TenantOnboardingConfigSchema>;

// ==========================================
// HELPER FUNCTIONS AND VALIDATORS
// ==========================================

export const validateTenantOnboardingConfig = (config: unknown): TenantOnboardingConfig => {
  return TenantOnboardingConfigSchema.parse(config);
};

export const getRequiredConfigFields = (enabledModules: string[]): string[] => {
  const requiredFields: string[] = [];

  if (enabledModules.includes("auth")) {
    requiredFields.push("modules.auth.providers");
  }

  if (enabledModules.includes("notifications")) {
    requiredFields.push("modules.notifications.channels");
    requiredFields.push("modules.notifications.email.fromEmail");
  }

  if (enabledModules.includes("aiCopilot")) {
    requiredFields.push("modules.aiCopilot.provider");
  }

  return requiredFields;
};

export const getModuleConfigSchema = (moduleName: string) => {
  const schemas = {
    auth: AuthModuleConfigSchema,
    rbac: RBACModuleConfigSchema,
    logging: LoggingModuleConfigSchema,
    notifications: NotificationsModuleConfigSchema,
    aiCopilot: AICopilotModuleConfigSchema,
  };

  return schemas[moduleName as keyof typeof schemas];
};

// Default configurations for each module
export const getDefaultModuleConfig = (moduleName: string) => {
  const defaults = {
    auth: {
      enabled: true,
      providers: ["local"],
      providerConfigs: {
        local: {
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireNumbers: true,
          },
        },
      },
    },
    rbac: {
      enabled: true,
      permissionTemplate: "standard",
      businessType: "general",
    },
    logging: {
      enabled: true,
      levels: ["error", "warn", "info"],
      destinations: {
        database: { enabled: true },
      },
    },
    notifications: {
      enabled: true,
      channels: ["email"],
      email: {
        enabled: true,
        provider: "smtp",
        fromEmail: "noreply@yourapp.com",
      },
    },
    aiCopilot: {
      enabled: false,
      provider: "openai",
      capabilities: {
        chatSupport: true,
      },
    },
  };

  return defaults[moduleName as keyof typeof defaults];
};

export { TenantOnboardingConfigSchema as TenantConfigSchema };
