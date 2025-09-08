# 🏗️ System Architecture Overview

## 🎯 **High-Level Architecture**

```mermaid
graph TB
    subgraph "Client Layer"
        AdminUI[Admin Portal]
        TenantUI[Tenant Portals]
        SDK[NPM SDKs]
    end

    subgraph "API Gateway Layer"
        API[Express.js API Server]
        Auth[Authentication Middleware]
        RateLimit[Rate Limiting]
    end

    subgraph "Service Layer"
        AuthSvc[Auth Service]
        TenantSvc[Tenant Service]
        EmailSvc[Email Service]
        AzureAD[Azure AD Service]
        NotificationSvc[Notification Service]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL)]
        Sessions[Session Store]
        Files[File Storage]
    end

    AdminUI --> API
    TenantUI --> API
    SDK --> API
    API --> Auth
    API --> RateLimit
    Auth --> AuthSvc
    API --> TenantSvc
    API --> EmailSvc
    API --> AzureAD
    API --> NotificationSvc
    AuthSvc --> DB
    TenantSvc --> DB
    EmailSvc --> DB
    AzureAD --> DB
    NotificationSvc --> DB
    AuthSvc --> Sessions
```

---

## 🏢 **Multi-Tenant Architecture Pattern**

### **Tenant Isolation Strategy:**

```typescript
// Every database operation includes tenantId
const users = await db
  .select()
  .from(tenantUsers)
  .where(eq(tenantUsers.tenantId, currentTenantId));

// API middleware ensures tenant context
app.get("/api/tenants/:tenantId/users", tenantMiddleware, (req, res) => {
  // req.tenant is automatically populated and validated
});
```

### **Database Isolation:**

- **Shared Database, Shared Schema**: All tenants share tables with `tenantId`
  partition key
- **Row-Level Security**: Every query includes tenant context
- **API Key Scoping**: Module-specific API keys prevent cross-tenant access

---

## 🔄 **Request Flow Architecture**

### **Typical API Request Flow:**

```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant A as Auth Middleware
    participant S as Service Layer
    participant D as Database

    C->>G: API Request with Bearer Token
    G->>A: Validate JWT & Extract Tenant
    A->>D: Verify Session & Permissions
    D-->>A: Session Valid + Tenant Context
    A->>S: Execute Business Logic
    S->>D: Query with tenantId Filter
    D-->>S: Tenant-Scoped Results
    S-->>G: Business Response
    G-->>C: JSON Response
```

### **Security Layers:**

1. **Rate Limiting**: Prevent abuse at network level
2. **JWT Validation**: Verify token authenticity and expiration
3. **Session Verification**: Check active session in database
4. **Tenant Context**: Ensure user belongs to requested tenant
5. **Permission Check**: Verify RBAC permissions for operation
6. **Data Filtering**: Apply tenant-scoped database queries

---

## 🎛️ **Module Architecture**

### **Module Registration Pattern:**

```typescript
interface ModuleDefinition {
  id: string; // "auth", "rbac", "logging"
  name: string; // "Authentication"
  dependencies: string[]; // ["auth"] for rbac
  isRequired: boolean; // true for auth/rbac
  configSchema: ZodSchema; // Validation for module config
  apiRoutes: RouteDefinition[]; // Module-specific endpoints
}
```

### **Module Lifecycle:**

1. **Registration**: Module defines its capabilities and dependencies
2. **Tenant Enablement**: Tenant selects modules during onboarding
3. **API Key Generation**: Unique keys generated per module per tenant
4. **Configuration**: Module-specific settings stored in `moduleConfigs`
5. **Runtime**: Middleware validates API keys and loads module context

---

## 📊 **Database Schema Architecture**

### **Core Entity Relationships:**

```mermaid
erDiagram
    PLATFORM_ADMINS ||--o{ SYSTEM_LOGS : creates
    TENANTS ||--o{ TENANT_USERS : contains
    TENANTS ||--o{ TENANT_ROLES : defines
    TENANTS ||--o{ EMAIL_LOGS : receives
    TENANT_USERS ||--o{ TENANT_USER_ROLES : assigned
    TENANT_ROLES ||--o{ TENANT_USER_ROLES : grants
    TENANTS ||--o{ COMPLIANCE_AUDIT_LOGS : generates
    TENANTS ||--o{ SECURITY_EVENTS : triggers

    TENANTS {
        uuid id PK
        varchar orgId UK "URL slug"
        varchar name
        varchar adminEmail
        varchar status "pending|active|suspended"
        varchar authApiKey "module API keys"
        varchar rbacApiKey
        varchar loggingApiKey
        varchar notificationsApiKey
        jsonb enabledModules "array of module IDs"
        jsonb moduleConfigs "per-module settings"
    }

    TENANT_USERS {
        uuid id PK
        uuid tenantId FK
        varchar email
        varchar passwordHash
        varchar status
        jsonb metadata
    }

    TENANT_ROLES {
        uuid id PK
        uuid tenantId FK
        varchar name
        text[] permissions
        boolean isSystem
    }
```

### **Key Schema Design Principles:**

1. **Tenant Partitioning**: Every multi-tenant table has `tenantId` foreign key
2. **Module Flexibility**: `enabledModules` array and `moduleConfigs` JSONB for
   dynamic configuration
3. **Audit Trail**: Comprehensive logging tables for compliance
4. **Security Events**: Real-time threat detection and monitoring
5. **Type Safety**: Drizzle ORM provides full TypeScript integration

---

## 🔐 **Authentication & Authorization Architecture**

### **Multi-Provider Authentication Flow:**

```mermaid
graph TD
    Login[User Login Request]
    Router{Auth Provider?}

    Login --> Router
    Router -->|Azure AD| AzureFlow[Azure OAuth Flow]
    Router -->|Auth0| Auth0Flow[Auth0 Universal Login]
    Router -->|SAML| SAMLFlow[SAML SSO Flow]
    Router -->|Local| LocalFlow[Database Auth]

    AzureFlow --> ValidateToken[Validate Provider Token]
    Auth0Flow --> ValidateToken
    SAMLFlow --> ValidateToken
    LocalFlow --> ValidatePassword[Validate Password Hash]

    ValidateToken --> CreateSession[Create Session]
    ValidatePassword --> CreateSession
    CreateSession --> GenerateJWT[Generate JWT Token]
    GenerateJWT --> ClientResponse[Return to Client]
```

### **RBAC Permission System:**

```typescript
// Hierarchical permission structure
interface Permission {
  id: string; // "users.create"
  resource: string; // "users"
  action: string; // "create"
  scope: string; // "tenant" | "global"
  conditions?: object; // Dynamic conditions
}

// Role-based access control
interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  inheritFrom?: string[]; // Role hierarchy
}

// Runtime permission check
const hasPermission = await rbac.check(userId, "users.create", {
  tenantId: currentTenant.id,
  resourceId: targetUserId,
});
```

---

## 📧 **Email & Notification Architecture**

### **Multi-Channel Notification System:**

```mermaid
graph LR
    Trigger[Event Trigger]
    Router[Notification Router]

    Trigger --> Router
    Router --> Email[Email Service]
    Router --> SMS[SMS Service]
    Router --> Push[Push Notification]
    Router --> Webhook[Webhook Service]

    Email --> SMTP[SMTP Provider]
    SMS --> Twilio[SMS Provider]
    Push --> FCM[Push Provider]
    Webhook --> External[External Systems]
```

### **Template System:**

- **Dynamic Templates**: Jinja-style templating with tenant data
- **Multi-Channel**: Same template rendered for email, SMS, push
- **Localization**: Support for multiple languages per tenant
- **A/B Testing**: Template variants for optimization

---

## 🔍 **Monitoring & Logging Architecture**

### **Observability Stack:**

```mermaid
graph TB
    subgraph "Application Layer"
        API[API Server]
        Services[Business Services]
    end

    subgraph "Logging Layer"
        AppLogs[Application Logs]
        AuditLogs[Audit Logs]
        SecurityLogs[Security Events]
        ComplianceLogs[Compliance Logs]
    end

    subgraph "Storage Layer"
        DB[(PostgreSQL)]
        LogStore[(Log Storage)]
    end

    subgraph "Analytics Layer"
        Metrics[Metrics Dashboard]
        Alerts[Alert Manager]
        Reports[Compliance Reports]
    end

    API --> AppLogs
    Services --> AuditLogs
    Services --> SecurityLogs
    Services --> ComplianceLogs
    AppLogs --> LogStore
    AuditLogs --> DB
    SecurityLogs --> DB
    ComplianceLogs --> DB
    LogStore --> Metrics
    DB --> Reports
    DB --> Alerts
```

### **Compliance Logging:**

- **GDPR**: Data access, modification, deletion tracking
- **SOX**: Financial data access and modification audits
- **HIPAA**: Healthcare data access and privacy controls
- **PCI**: Payment card data handling and access logs

---

## 🚀 **Deployment Architecture**

### **Production Deployment Stack:**

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx/Cloudflare]
    end

    subgraph "Application Tier"
        App1[App Server 1]
        App2[App Server 2]
        App3[App Server 3]
    end

    subgraph "Database Tier"
        Primary[(Primary DB)]
        Replica1[(Read Replica 1)]
        Replica2[(Read Replica 2)]
    end

    subgraph "Cache Layer"
        Redis[(Redis Session Store)]
    end

    subgraph "External Services"
        Email[Email Provider]
        SMS[SMS Provider]
        Storage[File Storage]
    end

    LB --> App1
    LB --> App2
    LB --> App3
    App1 --> Primary
    App2 --> Primary
    App3 --> Primary
    App1 --> Replica1
    App2 --> Replica1
    App3 --> Replica2
    App1 --> Redis
    App2 --> Redis
    App3 --> Redis
    App1 --> Email
    App2 --> SMS
    App3 --> Storage
```

### **Scalability Considerations:**

- **Horizontal Scaling**: Stateless application servers
- **Database Sharding**: Partition by tenant for massive scale
- **CDN Integration**: Static asset delivery and API caching
- **Container Ready**: Docker support for easy deployment
- **Health Checks**: Built-in monitoring and auto-recovery
