# ⚙️ Configuration Templates & Examples

## 🏗️ **Environment Configuration**

### **Production Environment (.env.production):**

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@prod-db.company.com:5432/saas_framework_prod
DB_POOL_SIZE=20
DB_SSL_MODE=require

# Security Configuration
JWT_SECRET=your-super-secure-jwt-secret-256-bits-minimum
SESSION_TIMEOUT=1440  # 24 hours in minutes
API_RATE_LIMIT=1000   # Requests per hour per IP

# Email Service Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=platform@yourcompany.com
SMTP_PASS=your-smtp-password
SMTP_FROM_NAME=Your SaaS Platform
SMTP_FROM_EMAIL=noreply@yourcompany.com

# Azure AD Platform Integration
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_REDIRECT_URI=https://yourplatform.com/auth/azure/callback

# Platform Configuration
BASE_URL=https://yourplatform.com
PLATFORM_NAME=Your SaaS Platform
SUPPORT_EMAIL=support@yourcompany.com
DOCUMENTATION_URL=https://docs.yourplatform.com

# Security Headers
CORS_ORIGIN=https://yourplatform.com
TRUST_PROXY=true

# Monitoring & Logging
LOG_LEVEL=info
ENABLE_AUDIT_LOGS=true
COMPLIANCE_FRAMEWORKS=gdpr,sox,hipaa

# File Storage
FILE_STORAGE_TYPE=s3
AWS_S3_BUCKET=your-saas-files
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1

# Cache Configuration
REDIS_URL=redis://prod-redis.company.com:6379
CACHE_TTL=3600  # 1 hour
```

### **Development Environment (.env.development):**

```bash
# Database Configuration
DATABASE_URL=postgresql://localhost:5432/saas_framework_dev
DB_POOL_SIZE=5

# Security Configuration (Relaxed for Development)
JWT_SECRET=dev-jwt-secret-not-for-production
SESSION_TIMEOUT=480  # 8 hours
API_RATE_LIMIT=10000  # Higher limit for development

# Email Service (MailTrap or similar)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-password
SMTP_FROM_NAME=SaaS Framework Dev
SMTP_FROM_EMAIL=dev@localhost

# Azure AD (Development App Registration)
AZURE_CLIENT_ID=dev-azure-client-id
AZURE_CLIENT_SECRET=dev-azure-client-secret
AZURE_TENANT_ID=dev-azure-tenant-id
AZURE_REDIRECT_URI=http://localhost:5000/auth/azure/callback

# Platform Configuration
BASE_URL=http://localhost:5000
PLATFORM_NAME=SaaS Framework (Dev)
SUPPORT_EMAIL=dev@localhost
DOCUMENTATION_URL=http://localhost:5000/docs

# Security Headers (Relaxed)
CORS_ORIGIN=http://localhost:5173
TRUST_PROXY=false

# Monitoring & Logging
LOG_LEVEL=debug
ENABLE_AUDIT_LOGS=true
COMPLIANCE_FRAMEWORKS=gdpr

# File Storage (Local Development)
FILE_STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads

# Cache Configuration (Optional)
# REDIS_URL=redis://localhost:6379
CACHE_TTL=300  # 5 minutes
```

---

## 🏢 **Tenant Configuration Templates**

### **Enterprise Tenant Configuration:**

```json
{
  "tenant": {
    "orgId": "enterprise-corp",
    "name": "Enterprise Corporation",
    "adminEmail": "admin@enterprise-corp.com",
    "status": "active",
    "enabledModules": ["auth", "rbac", "logging", "notifications"],
    "moduleConfigs": {
      "auth": {
        "providers": [
          {
            "type": "azure-ad",
            "name": "Corporate SSO",
            "priority": 1,
            "enabled": true,
            "config": {
              "tenantId": "enterprise-azure-tenant-id",
              "clientId": "enterprise-azure-client-id",
              "clientSecret": "enterprise-azure-secret",
              "domain": "enterprise-corp.com"
            }
          },
          {
            "type": "local",
            "name": "Local Backup Auth",
            "priority": 2,
            "enabled": true,
            "config": {
              "requireEmailVerification": true,
              "allowSelfRegistration": false
            }
          }
        ],
        "sessionTimeout": 480,
        "passwordPolicy": {
          "minLength": 12,
          "requireUppercase": true,
          "requireLowercase": true,
          "requireNumbers": true,
          "requireSpecialChars": true,
          "maxAge": 90
        },
        "mfaEnabled": true
      },
      "rbac": {
        "defaultRoles": ["employee"],
        "allowCustomRoles": true,
        "hierarchicalRoles": true,
        "permissionCategories": [
          "user_management",
          "financial_data",
          "reporting",
          "administration"
        ]
      },
      "logging": {
        "retentionDays": 2555,
        "logLevel": "info",
        "enableCompliance": true,
        "complianceFrameworks": ["sox", "gdpr", "iso27001"],
        "alertThresholds": [
          {
            "eventType": "failed_login",
            "count": 5,
            "timeWindow": 15,
            "severity": "warning"
          },
          {
            "eventType": "privilege_escalation",
            "count": 1,
            "timeWindow": 1,
            "severity": "critical"
          }
        ]
      },
      "notifications": {
        "emailProvider": "office365",
        "emailConfig": {
          "smtpHost": "smtp.office365.com",
          "smtpUser": "notifications@enterprise-corp.com",
          "fromName": "Enterprise Corp Platform"
        },
        "smsProvider": "twilio",
        "smsConfig": {
          "accountSid": "twilio-account-sid",
          "authToken": "twilio-auth-token",
          "fromNumber": "+1234567890"
        },
        "templates": {
          "welcome_email": {
            "subject": "Welcome to Enterprise Corp Platform",
            "template": "enterprise_welcome_template"
          },
          "password_reset": {
            "subject": "Password Reset Request",
            "template": "enterprise_password_reset_template"
          }
        }
      }
    }
  }
}
```

### **Startup/SMB Tenant Configuration:**

```json
{
  "tenant": {
    "orgId": "startup-inc",
    "name": "Startup Inc",
    "adminEmail": "founder@startup-inc.com",
    "status": "active",
    "enabledModules": ["auth", "rbac"],
    "moduleConfigs": {
      "auth": {
        "providers": [
          {
            "type": "local",
            "name": "Email/Password",
            "priority": 1,
            "enabled": true,
            "config": {
              "requireEmailVerification": true,
              "allowSelfRegistration": true
            }
          }
        ],
        "sessionTimeout": 1440,
        "passwordPolicy": {
          "minLength": 8,
          "requireUppercase": true,
          "requireLowercase": true,
          "requireNumbers": true,
          "requireSpecialChars": false,
          "maxAge": 365
        },
        "mfaEnabled": false
      },
      "rbac": {
        "defaultRoles": ["user"],
        "allowCustomRoles": true,
        "hierarchicalRoles": false,
        "permissionCategories": ["basic_access", "content_management"]
      }
    }
  }
}
```

### **Healthcare Tenant Configuration (HIPAA Compliant):**

```json
{
  "tenant": {
    "orgId": "healthtech-solutions",
    "name": "HealthTech Solutions",
    "adminEmail": "compliance@healthtech.com",
    "status": "active",
    "enabledModules": ["auth", "rbac", "logging", "notifications"],
    "moduleConfigs": {
      "auth": {
        "providers": [
          {
            "type": "azure-ad",
            "name": "Healthcare SSO",
            "priority": 1,
            "enabled": true,
            "config": {
              "tenantId": "healthcare-azure-tenant",
              "clientId": "healthcare-azure-client",
              "clientSecret": "healthcare-azure-secret"
            }
          }
        ],
        "sessionTimeout": 240,
        "passwordPolicy": {
          "minLength": 14,
          "requireUppercase": true,
          "requireLowercase": true,
          "requireNumbers": true,
          "requireSpecialChars": true,
          "maxAge": 60
        },
        "mfaEnabled": true,
        "sessionLockout": 30
      },
      "rbac": {
        "defaultRoles": ["healthcare_worker"],
        "allowCustomRoles": true,
        "hierarchicalRoles": true,
        "permissionCategories": [
          "patient_data_read",
          "patient_data_write",
          "medical_records",
          "phi_access",
          "administrative"
        ]
      },
      "logging": {
        "retentionDays": 2555,
        "logLevel": "debug",
        "enableCompliance": true,
        "complianceFrameworks": ["hipaa", "gdpr"],
        "auditAllAccess": true,
        "encryptLogs": true,
        "alertThresholds": [
          {
            "eventType": "phi_access",
            "count": 1,
            "timeWindow": 1,
            "severity": "info"
          },
          {
            "eventType": "unauthorized_access",
            "count": 1,
            "timeWindow": 1,
            "severity": "critical"
          }
        ]
      }
    }
  }
}
```

---

## 🔐 **Authentication Provider Templates**

### **Azure AD Configuration:**

```yaml
azure_ad_template:
  type: "azure-ad"
  name: "Corporate Azure AD"
  priority: 1
  enabled: true
  config:
    tenantId: "${AZURE_TENANT_ID}"
    clientId: "${AZURE_CLIENT_ID}"
    clientSecret: "${AZURE_CLIENT_SECRET}"
    redirectUri: "${BASE_URL}/auth/azure/callback"
    scopes:
      - "openid"
      - "profile"
      - "email"
      - "User.Read"
    responseType: "code"
    responseMode: "query"
    prompt: "select_account"
    maxAge: 3600
    claims:
      email: "email"
      name: "name"
      firstName: "given_name"
      lastName: "family_name"
      roles: "roles"
```

### **Auth0 Configuration:**

```yaml
auth0_template:
  type: "auth0"
  name: "Auth0 Universal Login"
  priority: 1
  enabled: true
  config:
    domain: "your-tenant.auth0.com"
    clientId: "${AUTH0_CLIENT_ID}"
    clientSecret: "${AUTH0_CLIENT_SECRET}"
    redirectUri: "${BASE_URL}/auth/auth0/callback"
    audience: "https://your-api.com"
    scope: "openid profile email"
    responseType: "code"
    grantType: "authorization_code"
    claims:
      email: "email"
      name: "name"
      picture: "picture"
      roles: "https://yourapp.com/roles"
```

### **SAML Configuration:**

```yaml
saml_template:
  type: "saml"
  name: "Enterprise SAML SSO"
  priority: 1
  enabled: true
  config:
    entryPoint: "https://saml.company.com/sso"
    issuer: "urn:your-platform:saml"
    cert: |
      -----BEGIN CERTIFICATE-----
      MIIDXTCCAkWgAwIBAgIJAKZ...
      -----END CERTIFICATE-----
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
    signatureAlgorithm: "sha256"
    digestAlgorithm: "sha256"
    authnRequestBinding: "HTTP-Redirect"
    assertionConsumerServiceURL: "${BASE_URL}/auth/saml/callback"
    claims:
      email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
      name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      firstName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
      lastName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
      department: "http://schemas.company.com/identity/claims/department"
```

---

## 📧 **Email Template Configurations**

### **Onboarding Email Template:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Welcome to {{platformName}}</title>
    <style>
      .container {
        max-width: 600px;
        margin: 0 auto;
        font-family: "Segoe UI", Arial, sans-serif;
        background: #ffffff;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px 30px;
        text-align: center;
      }
      .content {
        padding: 30px;
        line-height: 1.6;
      }
      .api-key-section {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      .api-key {
        font-family: "Courier New", monospace;
        background: #343a40;
        color: #f8f9fa;
        padding: 10px;
        border-radius: 4px;
        word-break: break-all;
      }
      .button {
        display: inline-block;
        background: #667eea;
        color: white;
        padding: 12px 30px;
        text-decoration: none;
        border-radius: 6px;
        margin: 10px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎉 Welcome to {{platformName}}!</h1>
        <p>Your multi-tenant SaaS platform is ready</p>
      </div>

      <div class="content">
        <h2>Hello {{tenantName}} Team!</h2>

        <p>
          Your SaaS platform has been successfully set up. Here are your access
          details:
        </p>

        <div class="api-key-section">
          <h3>📍 Tenant Portal Access</h3>
          <p><strong>Organization ID:</strong> {{orgId}}</p>
          <p>
            <strong>Portal URL:</strong>
            <a href="{{portalUrl}}">{{portalUrl}}</a>
          </p>
          <a href="{{portalUrl}}" class="button">Access Your Portal</a>
        </div>

        {{#if apiKeys}}
        <div class="api-key-section">
          <h3>🔑 API Keys for Enabled Modules</h3>
          <p>Use these API keys to integrate with your applications:</p>

          {{#each apiKeys}}
          <div style="margin-bottom: 15px;">
            <h4>{{module}} Module</h4>
            <p><small>{{description}}</small></p>
            <div class="api-key">{{key}}</div>
          </div>
          {{/each}}

          <p>
            <strong>⚠️ Security Notice:</strong> Keep these API keys secure and
            never expose them in client-side code.
          </p>
        </div>
        {{/if}}

        <div class="api-key-section">
          <h3>🚀 Next Steps</h3>
          <ol>
            <li>Access your tenant portal using the link above</li>
            <li>Configure your authentication providers</li>
            <li>Set up user roles and permissions</li>
            <li>Integrate the API keys in your application</li>
            <li>Review our documentation for implementation guides</li>
          </ol>
        </div>

        <div class="api-key-section">
          <h3>📚 Resources</h3>
          <ul>
            <li><a href="{{documentationUrl}}">Documentation</a></li>
            <li><a href="{{documentationUrl}}/api">API Reference</a></li>
            <li>
              <a href="{{documentationUrl}}/integration">Integration Guide</a>
            </li>
            <li><a href="mailto:{{supportEmail}}">Support Email</a></li>
          </ul>
        </div>

        <p>
          If you have any questions, don't hesitate to reach out to our support
          team at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.
        </p>

        <p>Welcome aboard!</p>
        <p><strong>The {{platformName}} Team</strong></p>
      </div>
    </div>
  </body>
</html>
```

---

## 🎛️ **Module-Specific Configuration Templates**

### **RBAC Module Default Roles:**

```json
{
  "defaultRoles": [
    {
      "name": "Super Admin",
      "description": "Full access to all tenant resources",
      "permissions": ["*"],
      "isSystem": true,
      "canBeModified": false
    },
    {
      "name": "Admin",
      "description": "Administrative access with user management",
      "permissions": [
        "users.*",
        "roles.*",
        "settings.*",
        "reports.read",
        "audit.read"
      ],
      "isSystem": true,
      "canBeModified": true
    },
    {
      "name": "Manager",
      "description": "Management access with limited user control",
      "permissions": [
        "users.read",
        "users.create",
        "users.update",
        "reports.*",
        "dashboard.read"
      ],
      "isSystem": false,
      "canBeModified": true
    },
    {
      "name": "Employee",
      "description": "Standard employee access",
      "permissions": [
        "profile.read",
        "profile.update",
        "dashboard.read",
        "reports.read"
      ],
      "isSystem": false,
      "canBeModified": true
    },
    {
      "name": "Viewer",
      "description": "Read-only access",
      "permissions": ["dashboard.read", "reports.read", "profile.read"],
      "isSystem": false,
      "canBeModified": true
    }
  ]
}
```

### **Logging Module Compliance Templates:**

```json
{
  "complianceTemplates": {
    "gdpr": {
      "name": "GDPR Compliance",
      "description": "EU General Data Protection Regulation",
      "requiredEvents": [
        "data_access",
        "data_modification",
        "data_deletion",
        "consent_given",
        "consent_withdrawn",
        "data_export",
        "right_to_be_forgotten"
      ],
      "retentionPeriod": 2555,
      "dataClassifications": [
        "personal_data",
        "sensitive_personal_data",
        "pseudonymized_data"
      ],
      "alertThresholds": [
        {
          "eventType": "data_export",
          "count": 1,
          "timeWindow": 1,
          "severity": "info"
        }
      ]
    },
    "sox": {
      "name": "Sarbanes-Oxley Compliance",
      "description": "Financial data and access controls",
      "requiredEvents": [
        "financial_data_access",
        "financial_data_modification",
        "privilege_change",
        "system_configuration_change"
      ],
      "retentionPeriod": 2555,
      "dataClassifications": [
        "financial_data",
        "internal_controls",
        "audit_records"
      ],
      "alertThresholds": [
        {
          "eventType": "financial_data_modification",
          "count": 1,
          "timeWindow": 1,
          "severity": "warning"
        }
      ]
    },
    "hipaa": {
      "name": "HIPAA Compliance",
      "description": "Healthcare data protection",
      "requiredEvents": [
        "phi_access",
        "phi_modification",
        "phi_disclosure",
        "medical_record_access",
        "patient_lookup"
      ],
      "retentionPeriod": 2190,
      "dataClassifications": ["phi", "medical_records", "billing_information"],
      "alertThresholds": [
        {
          "eventType": "phi_access",
          "count": 1,
          "timeWindow": 1,
          "severity": "info"
        },
        {
          "eventType": "unauthorized_phi_access",
          "count": 1,
          "timeWindow": 1,
          "severity": "critical"
        }
      ]
    }
  }
}
```

---

## 🔧 **Docker Configuration Templates**

### **Production Docker Compose:**

```yaml
version: "3.8"

services:
  saas-app:
    image: your-registry/saas-framework:latest
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - SMTP_HOST=${SMTP_HOST}
      - AZURE_CLIENT_ID=${AZURE_CLIENT_ID}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=saas_framework
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - saas-app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

This configuration template provides comprehensive examples for setting up the
SaaS framework across different environments and tenant types, ensuring proper
security, compliance, and functionality for various use cases.
