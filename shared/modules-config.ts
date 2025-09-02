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
}

export interface AuthProvider {
  id: string;
  name: string;
  type: "oauth" | "saml" | "local" | "jwt";
  description: string;
}

/**
 * Available authentication providers
 */
export const AUTH_PROVIDERS: AuthProvider[] = [
  {
    id: "azure-ad",
    name: "Azure Active Directory",
    type: "oauth",
    description: "Microsoft Azure AD OAuth 2.0 / OpenID Connect",
  },
  {
    id: "auth0",
    name: "Auth0",
    type: "oauth",
    description: "Auth0 universal identity platform",
  },
  {
    id: "jwt",
    name: "JWT Token",
    type: "jwt",
    description: "JSON Web Token based authentication",
  },
  {
    id: "saml",
    name: "SAML SSO",
    type: "saml",
    description: "Security Assertion Markup Language",
  },
  {
    id: "local",
    name: "Local Credentials",
    type: "local",
    description: "Email/password authentication",
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
  },
  {
    id: "rbac",
    name: "Role-Based Access Control",
    description: "Advanced permission management with hierarchical roles and dynamic policies",
    category: "core",
    dependencies: ["authentication"],
    isRequired: true,
  },
  {
    id: "logging",
    name: "Logging and Monitoring",
    description: "Comprehensive audit trails, system monitoring, and performance analytics",
    category: "monitoring",
  },
  {
    id: "notifications",
    name: "Notifications System",
    description:
      "Multi-channel notification system supporting email, SMS, push notifications, and webhooks",
    category: "communication",
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
