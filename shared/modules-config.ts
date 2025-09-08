/**
 * Central Modules Configuration
 * Single source of truth for all SaaS framework modules
 */

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: "core" | "authentication" | "monitoring" | "communication";
  providers?: string[];
  dependencies?: string[];
  isRequired?: boolean;
  configFields?: ProviderConfigField[];
}

export interface AuthProvider {
  id: string;
  name: string;
  type: "oauth" | "saml" | "local" | "jwt";
  description: string;
  configFields?: ProviderConfigField[];
}

export interface ProviderConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "select";
  required: boolean;
  description?: string;
  options?: string[]; // For select type
  placeholder?: string;
}

export interface ModuleConfig {
  [key: string]: any;
  // Authentication module configs
  selectedProvider?: string;
  providerSettings?: {
    azureAD?: {
      tenantId: string;
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    auth0?: {
      domain: string;
      clientId: string;
      clientSecret: string;
      audience?: string;
    };
    saml?: {
      entryPoint: string;
      issuer: string;
      cert: string;
    };
  };
  // Notifications module configs
  emailProvider?: string;
  smsProvider?: string;
  pushProvider?: string;
  // Logging module configs
  retentionDays?: number;
  logLevel?: "debug" | "info" | "warn" | "error";
  enableCompliance?: boolean;
}

/**
 * Available authentication providers with configuration fields
 */
export const AUTH_PROVIDERS: AuthProvider[] = [
  {
    id: "azure-ad",
    name: "Azure Active Directory",
    type: "oauth",
    description: "Microsoft Azure AD OAuth 2.0 / OpenID Connect",
    configFields: [
      {
        key: "tenantId",
        label: "Azure AD Tenant ID",
        type: "text",
        required: true,
        description: "Your Azure AD tenant ID (directory ID)",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      },
      {
        key: "clientId",
        label: "Application (Client) ID",
        type: "text",
        required: true,
        description: "Application ID from Azure AD app registration",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        type: "password",
        required: true,
        description: "Client secret from Azure AD app registration",
      },
      {
        key: "redirectUri",
        label: "Redirect URI",
        type: "url",
        required: true,
        description: "Callback URL for OAuth flow",
        placeholder: "https://yourapp.com/auth/callback",
      },
    ],
  },
  {
    id: "auth0",
    name: "Auth0",
    type: "oauth",
    description: "Auth0 universal identity platform",
    configFields: [
      {
        key: "domain",
        label: "Auth0 Domain",
        type: "text",
        required: true,
        description: "Your Auth0 domain",
        placeholder: "your-tenant.auth0.com",
      },
      {
        key: "clientId",
        label: "Client ID",
        type: "text",
        required: true,
        description: "Application Client ID from Auth0 dashboard",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        type: "password",
        required: true,
        description: "Application Client Secret from Auth0 dashboard",
      },
      {
        key: "audience",
        label: "API Audience",
        type: "text",
        required: false,
        description: "API identifier for Auth0",
        placeholder: "https://your-api.com",
      },
    ],
  },
  {
    id: "jwt",
    name: "JWT Token",
    type: "jwt",
    description: "JSON Web Token based authentication",
    configFields: [
      {
        key: "jwtSecret",
        label: "JWT Secret",
        type: "password",
        required: true,
        description: "Secret key for JWT token signing",
      },
      {
        key: "tokenExpiry",
        label: "Token Expiry",
        type: "select",
        required: true,
        description: "Token expiration time",
        options: ["1h", "24h", "7d", "30d"],
      },
    ],
  },
  {
    id: "saml",
    name: "SAML SSO",
    type: "saml",
    description: "Security Assertion Markup Language",
    configFields: [
      {
        key: "entryPoint",
        label: "SAML Entry Point",
        type: "url",
        required: true,
        description: "Identity Provider SSO URL",
      },
      {
        key: "issuer",
        label: "Issuer",
        type: "text",
        required: true,
        description: "SAML issuer identifier",
      },
      {
        key: "cert",
        label: "Certificate",
        type: "text",
        required: true,
        description: "X.509 Certificate for signature verification",
      },
    ],
  },
  {
    id: "local",
    name: "Local Credentials",
    type: "local",
    description: "Email/password authentication",
    configFields: [
      {
        key: "passwordPolicy",
        label: "Password Policy",
        type: "select",
        required: true,
        description: "Password strength requirements",
        options: ["basic", "medium", "strong"],
      },
      {
        key: "enableMFA",
        label: "Enable MFA",
        type: "select",
        required: true,
        description: "Multi-factor authentication",
        options: ["disabled", "optional", "required"],
      },
    ],
  },
];

/**
 * Core module definitions
 */
export const MODULES: ModuleDefinition[] = [
  {
    id: "authentication",
    name: "Authentication Module",
    description:
      "Multi-provider authentication system with support for OAuth, SAML, and local credentials",
    category: "authentication",
    providers: AUTH_PROVIDERS.map(p => p.name),
    isRequired: true,
    configFields: [
      {
        key: "selectedProvider",
        label: "Authentication Provider",
        type: "select",
        required: true,
        description: "Choose your authentication provider",
        options: AUTH_PROVIDERS.map(p => p.id),
      },
    ],
  },
  {
    id: "rbac",
    name: "Role-Based Access Control",
    description: "Advanced permission management with hierarchical roles and dynamic policies",
    category: "core",
    dependencies: ["authentication"],
    isRequired: true,
    configFields: [
      {
        key: "defaultRole",
        label: "Default User Role",
        type: "select",
        required: true,
        description: "Default role assigned to new users",
        options: ["user", "editor", "admin"],
      },
      {
        key: "enableHierarchy",
        label: "Enable Role Hierarchy",
        type: "select",
        required: true,
        description: "Allow nested roles with inheritance",
        options: ["enabled", "disabled"],
      },
    ],
  },
  {
    id: "logging",
    name: "Logging and Monitoring",
    description: "Comprehensive audit trails, system monitoring, and performance analytics",
    category: "monitoring",
    configFields: [
      {
        key: "logLevel",
        label: "Log Level",
        type: "select",
        required: true,
        description: "Minimum log level to capture",
        options: ["debug", "info", "warn", "error"],
      },
      {
        key: "retentionDays",
        label: "Log Retention (Days)",
        type: "select",
        required: true,
        description: "How long to keep logs",
        options: ["30", "90", "180", "365"],
      },
      {
        key: "enableCompliance",
        label: "Compliance Mode",
        type: "select",
        required: true,
        description: "Enable compliance features (GDPR, SOX, etc.)",
        options: ["enabled", "disabled"],
      },
    ],
  },
  {
    id: "notifications",
    name: "Notifications System",
    description:
      "Multi-channel notification system supporting email, SMS, push notifications, and webhooks",
    category: "communication",
    configFields: [
      {
        key: "emailProvider",
        label: "Email Provider",
        type: "select",
        required: true,
        description: "Email service provider",
        options: ["smtp", "sendgrid", "mailgun", "ses"],
      },
      {
        key: "smsProvider",
        label: "SMS Provider",
        type: "select",
        required: false,
        description: "SMS service provider",
        options: ["twilio", "nexmo", "aws-sns"],
      },
      {
        key: "pushProvider",
        label: "Push Notification Provider",
        type: "select",
        required: false,
        description: "Push notification service",
        options: ["firebase", "apns", "custom"],
      },
      {
        key: "enableWebhooks",
        label: "Enable Webhooks",
        type: "select",
        required: true,
        description: "Allow webhook notifications",
        options: ["enabled", "disabled"],
      },
    ],
  },
];

/**
 * Default modules for new tenants
 */
export const DEFAULT_MODULES = ["authentication", "rbac"];

/**
 * Get module by ID
 */
export function getModuleById(id: string): ModuleDefinition | undefined {
  return MODULES.find(module => module.id === id);
}

/**
 * Get auth provider by ID
 */
export function getAuthProviderById(id: string): AuthProvider | undefined {
  return AUTH_PROVIDERS.find(provider => provider.id === id);
}

/**
 * Validate module configuration
 */
export function validateModules(enabledModules: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required modules
  const requiredModules = MODULES.filter(m => m.isRequired).map(m => m.id);
  for (const required of requiredModules) {
    if (!enabledModules.includes(required)) {
      errors.push(`Required module '${required}' is missing`);
    }
  }

  // Check dependencies
  for (const moduleId of enabledModules) {
    const module = getModuleById(moduleId);
    if (module?.dependencies) {
      for (const dep of module.dependencies) {
        if (!enabledModules.includes(dep)) {
          errors.push(`Module '${moduleId}' requires dependency '${dep}'`);
        }
      }
    }
  }

  // Check for unknown modules
  for (const moduleId of enabledModules) {
    if (!getModuleById(moduleId)) {
      errors.push(`Unknown module '${moduleId}'`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Legacy field name mappings for backward compatibility
 */
export const FIELD_MAPPINGS = {
  modules: "enabledModules",
  enabled_modules: "enabledModules",
} as const;

/**
 * Normalize field names to standard 'enabledModules'
 */
export function normalizeModuleField(data: any): any {
  const normalized = { ...data };

  for (const [oldField, newField] of Object.entries(FIELD_MAPPINGS)) {
    if (oldField in normalized) {
      normalized[newField] = normalized[oldField];
      delete normalized[oldField];
    }
  }

  return normalized;
}
