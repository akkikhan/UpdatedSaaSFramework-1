# 🗃️ Core Data Models & Schema

## 🏢 **Tenant Model**

```typescript
interface Tenant {
  id: string; // UUID primary key
  orgId: string; // URL-safe organization identifier (e.g., "acme-corp")
  name: string; // Display name "Acme Corporation"
  adminEmail: string; // Primary admin contact
  status: "pending" | "active" | "suspended" | "cancelled";

  // Module-specific API keys (only generated for enabled modules)
  authApiKey?: string;
  rbacApiKey?: string;
  loggingApiKey?: string;
  notificationsApiKey?: string;

  // Dynamic module configuration
  enabledModules: ModuleId[]; // ["auth", "rbac", "logging"]
  moduleConfigs: ModuleConfigs; // Per-module settings

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

type ModuleId = "auth" | "rbac" | "logging" | "notifications" | "ai-copilot";

interface ModuleConfigs {
  auth?: AuthModuleConfig;
  rbac?: RBACModuleConfig;
  logging?: LoggingModuleConfig;
  notifications?: NotificationModuleConfig;
}
```

### **Key Design Principles:**

- **URL-Safe Identifier**: `orgId` used in tenant portal URLs
  (`/tenant/acme-corp/login`)
- **Conditional API Keys**: Only enabled modules get API keys
- **Flexible Configuration**: JSONB `moduleConfigs` allows per-tenant
  customization
- **Status Lifecycle**: Clear tenant status progression for billing and access
  control

---

## 👤 **User Models**

### **Platform Admin Model:**

```typescript
interface PlatformAdmin {
  id: string;
  email: string;
  passwordHash?: string; // Nullable for SSO-only admins
  name: string;
  role: "admin" | "super_admin";
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}
```

### **Tenant User Model:**

```typescript
interface TenantUser {
  id: string;
  tenantId: string; // Foreign key to tenants table
  email: string;
  passwordHash?: string; // Nullable for SSO users
  firstName?: string;
  lastName?: string;
  status: "active" | "inactive" | "suspended";
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  externalId?: string; // For SSO provider mapping
  metadata: Record<string, any>; // Custom fields per tenant
}
```

### **Authentication Session Model:**

```typescript
interface AuthSession {
  id: string;
  tenantId: string;
  userId: string;
  token: string; // JWT token string
  expiresAt: Date;
  createdAt: Date;
}
```

---

## 🔐 **RBAC Models**

### **Role Model:**

```typescript
interface TenantRole {
  id: string;
  tenantId: string;
  name: string; // "Admin", "Editor", "Viewer"
  description?: string;
  permissions: string[]; // ["users.create", "users.read", "reports.read"]
  isSystem: boolean; // System roles cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}
```

### **Permission Model:**

```typescript
interface Permission {
  id: string;
  tenantId: string;
  key: string; // "users.create", "reports.read"
  description?: string;
  category?: string; // "user_management", "reporting"
  isSystem: boolean; // System permissions cannot be modified
}
```

### **User Role Assignment:**

```typescript
interface TenantUserRole {
  id: string;
  tenantId: string;
  userId: string; // Foreign key to tenant_users
  roleId: string; // Foreign key to tenant_roles
  assignedAt: Date;
  assignedBy?: string; // User ID who made the assignment
}
```

---

## 📧 **Communication Models**

### **Email Log Model:**

```typescript
interface EmailLog {
  id: string;
  tenantId?: string; // Null for platform-level emails
  recipientEmail: string;
  subject: string;
  templateType: string; // "onboarding", "password_reset", "notification"
  status: "sent" | "failed" | "pending";
  sentAt: Date;
  errorMessage?: string;
}
```

### **Notification Model:**

```typescript
interface TenantNotification {
  id: string;
  tenantId: string;
  type: string; // "module_enabled", "status_changed", "config_updated"
  title: string;
  message: string;
  metadata: Record<string, any>; // Additional context data
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}
```

---

## 📊 **Audit & Compliance Models**

### **System Activity Log:**

```typescript
interface SystemLog {
  id: string;
  tenantId?: string; // Null for platform-level actions
  adminUserId?: string; // Platform admin performing action
  action: string; // "tenant_created", "module_enabled", "user_created"
  entityType: string; // "tenant", "user", "module"
  entityId: string; // ID of affected entity
  details: Record<string, any>; // Action-specific details
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}
```

### **Compliance Audit Log:**

```typescript
interface ComplianceAuditLog {
  id: string;
  tenantId?: string;
  userId?: string; // Tenant user performing action
  adminUserId?: string; // Platform admin
  eventType: string; // "rbac_change", "data_access", "security_event"
  eventCategory: string; // "create", "read", "update", "delete"
  entityType: string; // "user", "role", "data_record"
  entityId: string;
  entityName?: string; // Human-readable name
  action: string; // "role_assigned", "data_exported", "login_failed"
  outcome: "success" | "failure" | "blocked";
  riskLevel: "low" | "medium" | "high" | "critical";
  complianceFrameworks: string[]; // ["gdpr", "sox", "hipaa"]
  dataClassification: "public" | "internal" | "confidential" | "restricted";
  details: Record<string, any>;
  beforeState?: Record<string, any>; // State before change
  afterState?: Record<string, any>; // State after change
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  geolocation?: Record<string, any>; // Country, region
  timestamp: Date;
  retentionUntil?: Date; // Automatic purging
}
```

### **Security Event Model:**

```typescript
interface SecurityEvent {
  id: string;
  tenantId?: string;
  eventType: string; // "suspicious_login", "brute_force", "privilege_escalation"
  severity: "info" | "warning" | "alert" | "critical";
  source: string; // "api", "web", "mobile", "system"
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  isResolved: boolean;
  resolvedBy?: string; // Admin user ID
  resolvedAt?: Date;
  timestamp: Date;
}
```

---

## 🏗️ **Configuration Models**

### **Module Definition:**

```typescript
interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
  category: "core" | "authentication" | "monitoring" | "communication";
  providers?: string[]; // Available sub-providers
  dependencies?: ModuleId[]; // Required modules
  isRequired?: boolean; // Cannot be disabled
  configFields?: ConfigField[]; // UI configuration fields
}
```

### **Auth Provider Configuration:**

```typescript
interface AuthModuleConfig {
  providers: AuthProviderConfig[];
  sessionTimeout?: number; // Minutes
  passwordPolicy?: PasswordPolicy;
  mfaEnabled?: boolean;
}

interface AuthProviderConfig {
  type: "azure-ad" | "auth0" | "saml" | "local";
  name: string; // Display name
  priority: number; // 1 = primary, 2 = secondary
  enabled: boolean;
  config: AzureADConfig | Auth0Config | SAMLConfig | LocalConfig;
}

interface AzureADConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  domain?: string;
}

interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience?: string;
}

interface SAMLConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  identifierFormat?: string;
}

interface LocalConfig {
  requireEmailVerification: boolean;
  allowSelfRegistration: boolean;
}
```

### **RBAC Module Configuration:**

```typescript
interface RBACModuleConfig {
  defaultRoles: string[]; // Roles created for new users
  allowCustomRoles: boolean;
  hierarchicalRoles: boolean; // Enable role inheritance
  permissionCategories: string[]; // Custom permission groupings
}
```

### **Logging Module Configuration:**

```typescript
interface LoggingModuleConfig {
  retentionDays: number; // Data retention period
  logLevel: "debug" | "info" | "warn" | "error";
  enableCompliance: boolean;
  complianceFrameworks: string[]; // ["gdpr", "sox", "hipaa"]
  alertThresholds: AlertThreshold[];
}

interface AlertThreshold {
  eventType: string;
  count: number;
  timeWindow: number; // Minutes
  severity: "info" | "warning" | "alert" | "critical";
}
```

---

## 🎨 **UI/Display Models**

### **Dashboard Stats:**

```typescript
interface TenantStats {
  userCount: number;
  activeUsers: number; // Last 30 days
  rolesCount: number;
  lastLoginDate?: Date;
  moduleUsage: ModuleUsageStats[];
}

interface ModuleUsageStats {
  moduleId: ModuleId;
  apiCalls: number; // Last 30 days
  errorRate: number; // Percentage
  avgResponseTime: number; // Milliseconds
}
```

### **Navigation Context:**

```typescript
interface TenantContext {
  tenant: Tenant;
  currentUser: TenantUser;
  permissions: string[];
  enabledModules: ModuleId[];
  moduleConfigs: ModuleConfigs;
}
```

---

## 🔗 **Relationship Patterns**

### **Tenant Hierarchy:**

```
Platform
├── Tenant A (acme-corp)
│   ├── Users
│   ├── Roles
│   ├── Sessions
│   ├── Audit Logs
│   └── Notifications
├── Tenant B (demo-company)
│   ├── Users
│   ├── Roles
│   ├── Sessions
│   ├── Audit Logs
│   └── Notifications
└── Platform Admins
    ├── System Logs
    └── Global Configuration
```

### **Module Dependencies:**

```
auth (required)
├── rbac (required, depends on auth)
├── logging (optional, depends on auth)
├── notifications (optional, depends on auth)
└── ai-copilot (optional, depends on auth + rbac)
```

### **Permission Hierarchy:**

```
Tenant Admin
├── Can manage all users
├── Can configure modules
├── Can view all audit logs
└── Can manage roles
    └── User Manager
        ├── Can create/edit users
        ├── Can assign roles
        └── Viewer
            └── Can read data only
```
