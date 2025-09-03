# 🔧 Tenant Onboarding Configuration Interface

## 📋 Overview

This comprehensive interface covers **all possible configurations** for tenant
onboarding across different modules. Each module has specific configuration
requirements that are dynamically shown in the UI based on user selections.

## 🎯 Module Configuration Requirements

### 🔐 **Authentication Module** (`auth`)

**Required when selected:**

- ✅ **Providers** (at least one): `["azure-ad", "auth0", "saml", "local"]`
- ✅ **Provider-specific configurations**

**Provider Configurations:**

#### Azure AD (`azure-ad`)

```typescript
{
  azureAd: {
    tenantId: string,          // Required: Azure AD Tenant ID
    clientId: string,          // Required: Application ID
    clientSecret: string,      // Required: Client Secret
    redirectUri?: string,      // Optional: Custom redirect URI
    scopes?: string[],         // Optional: Default ["User.Read"]
    allowedDomains?: string[]  // Optional: Restrict to specific domains
  }
}
```

#### Auth0 (`auth0`)

```typescript
{
  auth0: {
    domain: string,            // Required: Auth0 Domain
    clientId: string,          // Required: Auth0 Client ID
    clientSecret: string,      // Required: Auth0 Client Secret
    audience?: string,         // Optional: API Audience
    scope?: string,            // Optional: Default "openid profile email"
    connectionName?: string    // Optional: Specific connection
  }
}
```

#### SAML (`saml`)

```typescript
{
  saml: {
    entryPoint: string,        // Required: SAML SSO URL
    issuer: string,            // Required: Entity ID
    cert: string,              // Required: X.509 Certificate
    identifierFormat?: string, // Optional: Name ID format
    signatureAlgorithm?: "sha1" | "sha256", // Optional: Default "sha256"
    digestAlgorithm?: "sha1" | "sha256"     // Optional: Default "sha256"
  }
}
```

#### Local (`local`)

```typescript
{
  local: {
    passwordPolicy?: {
      minLength: number,          // Default: 8
      requireUppercase: boolean,  // Default: true
      requireLowercase: boolean,  // Default: true
      requireNumbers: boolean,    // Default: true
      requireSpecialChars: boolean, // Default: true
      maxAttempts: number,        // Default: 5
      lockoutDuration: string     // Default: "15m"
    },
    enableRegistration?: boolean,     // Default: true
    requireEmailVerification?: boolean, // Default: true
    enablePasswordReset?: boolean     // Default: true
  }
}
```

---

### 🛡️ **RBAC Module** (`rbac`)

**Always enabled with Authentication**

**Configuration Options:**

```typescript
{
  rbac: {
    permissionTemplate: "minimal" | "standard" | "enterprise" | "custom", // Default: "standard"
    businessType: "general" | "healthcare" | "finance" | "education" | "government", // Default: "general"
    defaultRoles?: Array<{
      name: string,
      description: string,
      permissions: string[],
      isSystemRole?: boolean,
      inheritFrom?: string
    }>,
    customPermissions?: Array<{
      key: string,
      name: string,
      description: string,
      category: string,
      riskLevel: "low" | "medium" | "high" | "critical"
    }>
  }
}
```

**Permission Templates:**

- **Minimal**: Basic read/write permissions
- **Standard**: Common business permissions
- **Enterprise**: Advanced permissions with approval workflows
- **Custom**: Define your own permission set

---

### 📊 **Logging Module** (`logging`)

**Configuration Required:**

```typescript
{
  logging: {
    levels: ("error" | "warn" | "info" | "debug" | "trace")[], // Default: ["error", "warn", "info"]
    destinations: {
      database?: {
        enabled: boolean,        // Default: true
        tableName?: string,      // Default: "application_logs"
        maxRecords?: number      // Default: 100000
      },
      elasticsearch?: {
        enabled: boolean,
        endpoint?: string,       // Required if enabled
        apiKey?: string,         // Required if enabled
        indexPattern?: string    // Default: "tenant-logs-{date}"
      },
      cloudwatch?: {
        enabled: boolean,
        region?: string,         // Required if enabled
        logGroupName?: string,   // Required if enabled
        accessKeyId?: string,    // Required if enabled
        secretAccessKey?: string // Required if enabled
      },
      datadog?: {
        enabled: boolean,
        apiKey?: string,         // Required if enabled
        site?: "datadoghq.com" | "datadoghq.eu",
        service?: string
      }
    }
  }
}
```

---

### 🔔 **Notifications Module** (`notifications`)

**Required when selected:**

- ✅ **Channels** (at least one): `["email", "sms", "push", "webhook", "slack"]`
- ✅ **Email configuration** (if email channel selected)

**Channel Configurations:**

#### Email (Required if email channel selected)

```typescript
{
  email: {
    enabled: true,
    provider: "sendgrid" | "mailgun" | "ses" | "smtp" | "resend",
    fromEmail: string,           // Required: Sender email
    fromName?: string,           // Default: "System Notifications"

    // Provider-specific (choose one):
    sendgridApiKey?: string,     // If provider = "sendgrid"
    mailgunApiKey?: string,      // If provider = "mailgun"
    mailgunDomain?: string,      // If provider = "mailgun"
    awsAccessKey?: string,       // If provider = "ses"
    awsSecretKey?: string,       // If provider = "ses"
    awsRegion?: string,          // If provider = "ses"
    resendApiKey?: string,       // If provider = "resend"
    smtpHost?: string,           // If provider = "smtp"
    smtpPort?: number,           // If provider = "smtp"
    smtpUser?: string,           // If provider = "smtp"
    smtpPassword?: string        // If provider = "smtp"
  }
}
```

#### SMS (Optional)

```typescript
{
  sms: {
    enabled: boolean,
    provider: "twilio" | "vonage" | "aws-sns",
    // Provider-specific (choose one):
    twilioAccountSid?: string,
    twilioAuthToken?: string,
    twilioFromNumber?: string,
    vonageApiKey?: string,
    vonageApiSecret?: string,
    awsAccessKey?: string,
    awsSecretKey?: string
  }
}
```

#### Push Notifications (Optional)

```typescript
{
  push: {
    enabled: boolean,
    provider: "firebase" | "apn" | "onesignal",
    firebaseServerKey?: string,     // If provider = "firebase"
    firebaseProjectId?: string,     // If provider = "firebase"
    oneSignalAppId?: string,        // If provider = "onesignal"
    oneSignalApiKey?: string        // If provider = "onesignal"
  }
}
```

---

### 🤖 **AI Copilot Module** (`aiCopilot`)

**Configuration Required:**

```typescript
{
  aiCopilot: {
    enabled: boolean,
    provider: "openai" | "anthropic" | "azure-openai" | "aws-bedrock",

    // Provider-specific (choose one):
    openai?: {
      apiKey: string,            // Required
      organization?: string,     // Optional
      model?: string            // Default: "gpt-4"
    },
    anthropic?: {
      apiKey: string,           // Required
      model?: string           // Default: "claude-3-sonnet-20240229"
    },
    azureOpenai?: {
      endpoint: string,         // Required: Azure OpenAI endpoint
      apiKey: string,          // Required
      deploymentName: string   // Required
    },

    capabilities?: {
      chatSupport: boolean,        // Default: true
      codeAssistance: boolean,     // Default: false
      documentAnalysis: boolean,   // Default: false
      workflowAutomation: boolean  // Default: false
    }
  }
}
```

---

## 🎨 UI Configuration Flow

### Step 1: Basic Information

```typescript
{
  name: string,           // Organization name
  orgId: string,          // URL-friendly identifier
  adminEmail: string,     // Admin email address
  adminName: string,      // Admin full name
  website?: string,       // Company website
  industry?: string,      // Business industry
  size?: string          // Company size
}
```

### Step 2: Module Selection

```typescript
{
  modules: {
    auth?: AuthModuleConfig,         // Always required
    rbac?: RBACModuleConfig,         // Auto-enabled with auth
    logging?: LoggingModuleConfig,   // Optional
    notifications?: NotificationsModuleConfig, // Optional
    aiCopilot?: AICopilotModuleConfig // Optional
  }
}
```

### Step 3: Module Configuration

Dynamic forms based on selected modules, showing only relevant fields.

### Step 4: Review & Deploy

Summary of all configurations before tenant creation.

---

## 🔧 Frontend Implementation Helper

### Dynamic Form Generation

```typescript
import {
  TenantOnboardingConfigSchema,
  getRequiredConfigFields,
  getModuleConfigSchema,
  getDefaultModuleConfig,
} from "../shared/tenant-config-interface";

// Get required fields based on selections
const requiredFields = getRequiredConfigFields(["auth", "notifications"]);
// Returns: ['modules.auth.providers', 'modules.notifications.channels', 'modules.notifications.email.fromEmail']

// Get schema for specific module
const authSchema = getModuleConfigSchema("auth");

// Get default configuration
const defaultConfig = getDefaultModuleConfig("auth");
```

### Validation Examples

```typescript
// Valid minimal configuration
const minimalConfig = {
  name: "Acme Corp",
  orgId: "acme-corp",
  adminEmail: "admin@acme.com",
  adminName: "John Doe",
  modules: {
    auth: {
      enabled: true,
      providers: ["local"],
      providerConfigs: {
        local: {}, // Uses defaults
      },
    },
  },
};

// Valid enterprise configuration
const enterpriseConfig = {
  name: "Enterprise Corp",
  orgId: "enterprise-corp",
  adminEmail: "admin@enterprise.com",
  adminName: "Jane Smith",
  modules: {
    auth: {
      enabled: true,
      providers: ["azure-ad", "local"],
      providerConfigs: {
        azureAd: {
          tenantId: "azure-tenant-id",
          clientId: "azure-client-id",
          clientSecret: "azure-client-secret",
        },
      },
    },
    notifications: {
      enabled: true,
      channels: ["email", "slack"],
      email: {
        enabled: true,
        provider: "sendgrid",
        fromEmail: "noreply@enterprise.com",
        sendgridApiKey: "sg.xxx",
      },
    },
    aiCopilot: {
      enabled: true,
      provider: "openai",
      openai: {
        apiKey: "sk-xxx",
      },
    },
  },
};
```

## 🚀 API Integration

### Backend Validation

```typescript
import { validateTenantOnboardingConfig } from "../shared/tenant-config-interface";

app.post("/api/tenants", async (req, res) => {
  try {
    // Validate the configuration
    const validConfig = validateTenantOnboardingConfig(req.body);

    // Create tenant with validated config
    const tenant = await createTenant(validConfig);

    res.json({ success: true, tenant });
  } catch (error) {
    // Detailed validation errors
    res.status(400).json({
      success: false,
      errors: error.errors,
    });
  }
});
```

This comprehensive interface ensures **perfect alignment** between frontend and
backend configurations, eliminating validation errors and providing a smooth
onboarding experience! 🎯
