import { z } from "zod";

// ==========================================
// SHARED MODULE TYPES - Used by both frontend and backend
// ==========================================

// Supported modules enum - single source of truth
export const MODULE_IDS = {
  AUTH: "auth",
  RBAC: "rbac",
  LOGGING: "logging",
  NOTIFICATIONS: "notifications",
  AI_COPILOT: "ai-copilot",
  AZURE_AD: "azure-ad",
  AUTH0: "auth0",
  SAML: "saml",
} as const;

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS];

// Provider type definitions
export const AUTH_PROVIDER_SCHEMA = z.object({
  type: z.enum(["azure-ad", "auth0", "saml", "local"]),
  name: z.string(),
  priority: z.number().default(1),
  config: z
    .object({
      // Azure AD config
      tenantId: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      // Auth0 config
      domain: z.string().optional(),
      audience: z.string().optional(),
      // SAML config
      entryPoint: z.string().optional(),
      issuer: z.string().optional(),
      cert: z.string().optional(),
      // Common settings
      callbackUrl: z.string().optional(),
      logoutUrl: z.string().optional(),
    })
    .optional(),
  userMapping: z
    .object({
      emailField: z.string().default("email"),
      nameField: z.string().default("name"),
      roleField: z.string().optional(),
    })
    .optional(),
  enabled: z.boolean().default(true),
});

export type AuthProvider = z.infer<typeof AUTH_PROVIDER_SCHEMA>;

// Module configuration schemas
export const MODULE_CONFIGS_SCHEMA = z
  .object({
    auth: z
      .object({
        providers: z.array(AUTH_PROVIDER_SCHEMA).optional(),
        defaultProvider: z.string().optional(),
        allowFallback: z.boolean().default(true),
      })
      .optional(),
    rbac: z
      .object({
        // Use flexible strings so RBAC templates and business types come from DB
        permissionTemplate: z.string().default("standard"),
        businessType: z.string().default("general"),
        customPermissions: z.array(z.string()).optional(),
        defaultRoles: z.array(z.string()).optional(),
      })
      .optional(),
    logging: z
      .object({
        levels: z.array(z.enum(["error", "warn", "info", "debug", "trace"])).optional(),
        destinations: z
          .array(z.enum(["database", "elasticsearch", "cloudwatch", "datadog"]))
          .optional(),
        retention: z
          .object({
            error: z.string().optional(),
            security: z.string().optional(),
            audit: z.string().optional(),
            performance: z.string().optional(),
          })
          .optional(),
        alerting: z
          .object({
            errorThreshold: z.number().optional(),
            securityEvents: z.boolean().optional(),
            performanceDegradation: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
    notifications: z
      .object({
        channels: z.array(z.enum(["email", "sms", "push", "webhook", "slack"])).optional(),
        emailProvider: z.enum(["sendgrid", "mailgun", "ses", "smtp"]).optional(),
        smsProvider: z.enum(["twilio", "vonage", "aws-sns"]).optional(),
        pushProvider: z.enum(["firebase", "apn", "onesignal"]).optional(),
        templates: z
          .object({
            welcome: z.boolean().optional(),
            trial_ending: z.boolean().optional(),
            payment_failed: z.boolean().optional(),
            security_alert: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
    "ai-copilot": z
      .object({
        provider: z.enum(["openai", "anthropic", "azure-openai", "aws-bedrock"]).optional(),
        model: z.string().optional(),
        capabilities: z
          .object({
            chatSupport: z.boolean().optional(),
            codeAssistance: z.boolean().optional(),
            documentAnalysis: z.boolean().optional(),
            workflowAutomation: z.boolean().optional(),
          })
          .optional(),
        safety: z
          .object({
            contentFiltering: z.boolean().optional(),
            piiDetection: z.boolean().optional(),
            rateLimiting: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .optional();

export type ModuleConfigs = z.infer<typeof MODULE_CONFIGS_SCHEMA>;

// Tenant creation schema - shared between frontend and backend
export const TENANT_CREATION_SCHEMA = z
  .object({
    name: z.string().min(1, "Organization name is required"),
    orgId: z
      .string()
      .min(1, "Organization ID is required")
      .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
    adminEmail: z.string().email("Valid email address required"),
    adminName: z.string().min(1, "Admin name is required"),
    sendEmail: z.boolean().default(true),
    enabledModules: z
      .array(
        z.enum([
          MODULE_IDS.AUTH,
          MODULE_IDS.RBAC,
          MODULE_IDS.AZURE_AD,
          MODULE_IDS.AUTH0,
          MODULE_IDS.SAML,
          MODULE_IDS.LOGGING,
          MODULE_IDS.NOTIFICATIONS,
          MODULE_IDS.AI_COPILOT,
        ])
      )
      .default([MODULE_IDS.AUTH, MODULE_IDS.RBAC]),
    moduleConfigs: MODULE_CONFIGS_SCHEMA,
    metadata: z
      .object({
        adminName: z.string().optional(),
        companyWebsite: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Enforce: if RBAC selected, Auth must be selected
    const mods = data.enabledModules || [];
    if (mods.includes(MODULE_IDS.RBAC) && !mods.includes(MODULE_IDS.AUTH)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["enabledModules"],
        message: "RBAC requires Authentication to be enabled",
      });
    }
  });

export type TenantCreationData = z.infer<typeof TENANT_CREATION_SCHEMA>;

// Frontend display data for modules
export interface ModuleInfo {
  id: ModuleId;
  name: string;
  description: string;
  icon: string;
  color: string;
  providers?: string[];
  isCore?: boolean;
  requiresConfig?: boolean;
}

// Module display data - used by frontend
export const MODULES_INFO: Record<string, ModuleInfo> = {
  [MODULE_IDS.AUTH]: {
    id: MODULE_IDS.AUTH,
    name: "Authentication",
    description: "User authentication and session management with multiple provider support",
    icon: "Lock",
    color: "bg-blue-500",
    providers: ["Local", "Azure AD", "Auth0", "SAML"],
    isCore: true,
    requiresConfig: true,
  },
  [MODULE_IDS.RBAC]: {
    id: MODULE_IDS.RBAC,
    name: "RBAC",
    description: "Role-based access control with permissions and user management",
    icon: "Shield",
    color: "bg-green-500",
    isCore: true,
    requiresConfig: false,
  },
  [MODULE_IDS.LOGGING]: {
    id: MODULE_IDS.LOGGING,
    name: "Logging",
    description: "Application logging, monitoring, and audit trails",
    icon: "FileText",
    color: "bg-purple-500",
    requiresConfig: true,
  },
  [MODULE_IDS.NOTIFICATIONS]: {
    id: MODULE_IDS.NOTIFICATIONS,
    name: "Notifications",
    description: "Multi-channel notifications via email, SMS, push, and webhooks",
    icon: "Bell",
    color: "bg-orange-500",
    requiresConfig: true,
  },
  [MODULE_IDS.AI_COPILOT]: {
    id: MODULE_IDS.AI_COPILOT,
    name: "AI Copilot",
    description: "AI-powered assistance and automation capabilities",
    icon: "Bot",
    color: "bg-indigo-500",
    requiresConfig: true,
  },
};

// Validation utilities
export const validateTenantCreation = (data: unknown): TenantCreationData => {
  return TENANT_CREATION_SCHEMA.parse(data);
};

export const validateModuleConfigs = (configs: unknown): ModuleConfigs => {
  return MODULE_CONFIGS_SCHEMA.parse(configs);
};

// Helper functions for transforming data
export const createAuthProviderObject = (
  type: "azure-ad" | "auth0" | "saml" | "local",
  config: Record<string, any> = {}
): AuthProvider => {
  const baseProvider: AuthProvider = {
    type,
    name: getProviderDisplayName(type),
    priority: 1,
    enabled: true,
    config: {},
    userMapping: {
      emailField: "email",
      nameField: "name",
    },
  };

  // Add provider-specific config
  if (type === "azure-ad" && config.tenantId && config.clientId) {
    baseProvider.config = {
      tenantId: config.tenantId,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      callbackUrl: config.callbackUrl,
    };
  } else if (type === "auth0" && config.domain) {
    baseProvider.config = {
      domain: config.domain,
      audience: config.audience,
      callbackUrl: config.callbackUrl,
    };
  }

  return baseProvider;
};

export const getProviderDisplayName = (type: string): string => {
  const names: Record<string, string> = {
    "azure-ad": "Azure AD SSO",
    auth0: "Auth0",
    saml: "SAML SSO",
    local: "Username/Password",
  };
  return names[type] || type;
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{
    path: (string | number)[];
    message: string;
    code?: string;
  }>;
}

export interface TenantResponse {
  id: string;
  name: string;
  orgId: string;
  status: string;
  adminEmail: string;
  enabledModules: ModuleId[];
  moduleConfigs?: ModuleConfigs;
  authApiKey?: string;
  rbacApiKey?: string;
  loggingApiKey?: string;
  notificationsApiKey?: string;
  createdAt: string;
  updatedAt: string;
}
