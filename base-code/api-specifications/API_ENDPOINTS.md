# 🚀 API Specifications & Endpoints

## 🌐 **API Overview**

The SaaS Framework exposes three distinct API layers:

1. **Platform Admin APIs** (`/api/platform/*`) - System administration
2. **Tenant Management APIs** (`/api/tenants/*`) - Tenant CRUD operations
3. **Module APIs** (`/api/v2/*`) - Per-tenant functionality

---

## 🔐 **Authentication Patterns**

### **Platform Admin Authentication:**

```http
Authorization: Bearer <platform_admin_jwt>
```

### **Tenant API Authentication:**

```http
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <module_specific_api_key>
X-Tenant-ID: <tenant_org_id>
```

---

## 👑 **Platform Admin APIs**

### **Admin Authentication:**

```yaml
# Platform admin login
POST /api/platform/auth/login
Content-Type: application/json

{
  "email": "admin@platform.com",
  "password": "secure_password"
}

Response:
{
  "token": "jwt_token_here",
  "admin": {
    "id": "uuid",
    "email": "admin@platform.com",
    "name": "Platform Admin",
    "role": "admin"
  },
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

```yaml
# Verify admin token
GET /api/platform/auth/verify
Authorization: Bearer <admin_token>

Response:
{
  "admin": {
    "id": "uuid",
    "email": "admin@platform.com",
    "name": "Platform Admin"
  }
}
```

```yaml
# Admin logout
POST /api/platform/auth/logout
Authorization: Bearer <admin_token>

Response:
{
  "message": "Logged out successfully"
}
```

### **Tenant Management:**

```yaml
# Create new tenant
POST /api/tenants
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "orgId": "acme-corp",
  "name": "Acme Corporation",
  "adminEmail": "admin@acme.com",
  "enabledModules": ["auth", "rbac", "logging"],
  "moduleConfigs": {
    "auth": {
      "providers": [
        {
          "type": "azure-ad",
          "name": "Employee SSO",
          "priority": 1,
          "config": {
            "tenantId": "azure-tenant-id",
            "clientId": "azure-client-id",
            "clientSecret": "azure-secret"
          }
        }
      ]
    }
  }
}

Response:
{
  "tenant": {
    "id": "uuid",
    "orgId": "acme-corp",
    "name": "Acme Corporation",
    "status": "pending",
    "authApiKey": "generated_key",
    "rbacApiKey": "generated_key",
    "loggingApiKey": "generated_key"
  },
  "onboardingEmail": {
    "sent": true,
    "recipient": "admin@acme.com"
  }
}
```

```yaml
# List all tenants
GET /api/tenants
Authorization: Bearer <admin_token>

Response:
{
  "tenants": [
    {
      "id": "uuid",
      "orgId": "acme-corp",
      "name": "Acme Corporation",
      "status": "active",
      "enabledModules": ["auth", "rbac"],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

```yaml
# Get tenant by ID or orgId
GET /api/tenants/{id}
GET /api/tenants/by-org-id/{orgId}
Authorization: Bearer <admin_token>

Response:
{
  "tenant": {
    "id": "uuid",
    "orgId": "acme-corp",
    "name": "Acme Corporation",
    "adminEmail": "admin@acme.com",
    "status": "active",
    "enabledModules": ["auth", "rbac", "logging"],
    "moduleConfigs": { /* module configurations */ },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

```yaml
# Update tenant status
PATCH /api/tenants/{id}/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "suspended"
}

Response:
{
  "tenant": {
    "id": "uuid",
    "status": "suspended"
  }
}
```

### **System Monitoring:**

```yaml
# Get system statistics
GET /api/stats
Authorization: Bearer <admin_token>

Response:
{
  "totalTenants": 150,
  "activeTenants": 142,
  "totalUsers": 5420,
  "activeUsers": 3891,
  "emailsSent": 8932,
  "systemHealth": "healthy"
}
```

```yaml
# Get recent tenants
GET /api/tenants/recent
Authorization: Bearer <admin_token>

Response:
{
  "tenants": [
    {
      "id": "uuid",
      "name": "Recently Created Corp",
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 🏢 **Tenant Portal APIs**

### **Tenant User Authentication:**

```yaml
# Tenant user login
POST /api/v2/auth/login
Content-Type: application/json
X-API-Key: <tenant_auth_api_key>

{
  "email": "user@acme.com",
  "password": "user_password",
  "tenantId": "acme-corp"
}

Response:
{
  "token": "tenant_user_jwt",
  "user": {
    "id": "uuid",
    "email": "user@acme.com",
    "tenantId": "uuid",
    "permissions": ["users.read", "reports.read"]
  },
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

```yaml
# Tenant user logout
POST /api/v2/auth/logout
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_auth_api_key>

Response:
{
  "message": "Logged out successfully"
}
```

### **User Management:**

```yaml
# List tenant users
GET /api/v2/users
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_rbac_api_key>

Response:
{
  "users": [
    {
      "id": "uuid",
      "email": "user@acme.com",
      "firstName": "John",
      "lastName": "Doe",
      "status": "active",
      "roles": ["editor"],
      "lastLoginAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

```yaml
# Create tenant user
POST /api/v2/users
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_rbac_api_key>
Content-Type: application/json

{
  "email": "newuser@acme.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "roles": ["viewer"]
}

Response:
{
  "user": {
    "id": "uuid",
    "email": "newuser@acme.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "status": "active"
  },
  "temporaryPassword": "temp_password_sent_via_email"
}
```

---

## 🔐 **RBAC APIs**

### **Role Management:**

```yaml
# List tenant roles
GET /api/v2/rbac/roles
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_rbac_api_key>

Response:
{
  "roles": [
    {
      "id": "uuid",
      "name": "Admin",
      "description": "Full access to tenant",
      "permissions": ["*"],
      "isSystem": true
    },
    {
      "id": "uuid",
      "name": "Editor",
      "permissions": ["users.read", "users.create", "reports.read"],
      "isSystem": false
    }
  ]
}
```

```yaml
# Create custom role
POST /api/v2/rbac/roles
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_rbac_api_key>
Content-Type: application/json

{
  "name": "Report Manager",
  "description": "Can manage reports and view users",
  "permissions": ["reports.*", "users.read"]
}

Response:
{
  "role": {
    "id": "uuid",
    "name": "Report Manager",
    "permissions": ["reports.create", "reports.read", "reports.update", "reports.delete", "users.read"]
  }
}
```

### **Permission Management:**

```yaml
# Check user permission
POST /api/v2/rbac/check-permission
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_rbac_api_key>
Content-Type: application/json

{
  "userId": "user_uuid",
  "permission": "users.create",
  "resource": {
    "type": "user",
    "id": "target_user_id"
  }
}

Response:
{
  "allowed": true,
  "reason": "User has role 'Admin' with permission 'users.create'"
}
```

```yaml
# Assign role to user
POST /api/v2/rbac/user-roles
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_rbac_api_key>
Content-Type: application/json

{
  "userId": "user_uuid",
  "roleId": "role_uuid"
}

Response:
{
  "assignment": {
    "userId": "user_uuid",
    "roleId": "role_uuid",
    "assignedAt": "2024-01-01T00:00:00Z",
    "assignedBy": "admin_user_uuid"
  }
}
```

---

## 📊 **Logging & Audit APIs**

### **Audit Log Access:**

```yaml
# Get audit logs
GET /api/v2/logging/audit?startDate=2024-01-01&endDate=2024-01-31&eventType=rbac_change
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_logging_api_key>

Response:
{
  "logs": [
    {
      "id": "uuid",
      "eventType": "rbac_change",
      "action": "role_assigned",
      "entityType": "user",
      "entityName": "john.doe@acme.com",
      "outcome": "success",
      "riskLevel": "medium",
      "details": {
        "roleAssigned": "Admin",
        "assignedBy": "platform.admin@acme.com"
      },
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 156,
  "page": 1,
  "pageSize": 50
}
```

### **Security Events:**

```yaml
# Get security events
GET /api/v2/logging/security-events?severity=critical
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_logging_api_key>

Response:
{
  "events": [
    {
      "id": "uuid",
      "eventType": "suspicious_login",
      "severity": "critical",
      "source": "web",
      "userId": "user_uuid",
      "ipAddress": "192.168.1.100",
      "details": {
        "loginAttempts": 5,
        "failureReason": "invalid_password",
        "geoLocation": "Unknown"
      },
      "isResolved": false,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 📧 **Notification APIs**

### **Email Management:**

```yaml
# Send notification email
POST /api/v2/notifications/email
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_notifications_api_key>
Content-Type: application/json

{
  "to": ["user@acme.com"],
  "templateId": "welcome_email",
  "variables": {
    "userName": "John Doe",
    "companyName": "Acme Corporation"
  }
}

Response:
{
  "messageId": "uuid",
  "status": "sent",
  "recipients": ["user@acme.com"]
}
```

### **Template Management:**

```yaml
# List email templates
GET /api/v2/notifications/templates
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_notifications_api_key>

Response:
{
  "templates": [
    {
      "id": "welcome_email",
      "name": "Welcome Email",
      "subject": "Welcome to {{companyName}}",
      "type": "email",
      "variables": ["userName", "companyName"]
    }
  ]
}
```

---

## 🔧 **Configuration APIs**

### **Module Configuration:**

```yaml
# Get tenant configuration
GET /api/v2/config
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_auth_api_key>

Response:
{
  "tenant": {
    "id": "uuid",
    "orgId": "acme-corp",
    "name": "Acme Corporation",
    "enabledModules": ["auth", "rbac", "logging"]
  },
  "moduleConfigs": {
    "auth": {
      "providers": [/* auth provider configs */],
      "sessionTimeout": 1440
    },
    "rbac": {
      "defaultRoles": ["viewer"],
      "allowCustomRoles": true
    }
  }
}
```

```yaml
# Update module configuration
PATCH /api/v2/config/modules/{moduleId}
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_auth_api_key>
Content-Type: application/json

{
  "config": {
    "sessionTimeout": 720,
    "mfaEnabled": true
  }
}

Response:
{
  "module": "auth",
  "config": {
    "sessionTimeout": 720,
    "mfaEnabled": true
  },
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

## 📈 **Analytics APIs**

### **Usage Statistics:**

```yaml
# Get tenant usage stats
GET /api/v2/analytics/usage?period=30days
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_logging_api_key>

Response:
{
  "period": "30days",
  "stats": {
    "totalUsers": 45,
    "activeUsers": 32,
    "apiCalls": 12450,
    "errorRate": 0.02,
    "avgResponseTime": 145
  },
  "moduleUsage": {
    "auth": {
      "apiCalls": 8500,
      "errorRate": 0.01
    },
    "rbac": {
      "apiCalls": 2340,
      "errorRate": 0.03
    },
    "logging": {
      "apiCalls": 1610,
      "errorRate": 0.00
    }
  }
}
```

---

## ⚡ **Webhook APIs**

### **Webhook Configuration:**

```yaml
# Register webhook endpoint
POST /api/v2/webhooks
Authorization: Bearer <tenant_user_jwt>
X-API-Key: <tenant_notifications_api_key>
Content-Type: application/json

{
  "url": "https://acme.com/webhooks/saas-events",
  "events": ["user.created", "role.assigned", "security.alert"],
  "secret": "webhook_signing_secret"
}

Response:
{
  "webhook": {
    "id": "uuid",
    "url": "https://acme.com/webhooks/saas-events",
    "events": ["user.created", "role.assigned", "security.alert"],
    "active": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 🚨 **Error Response Format**

All APIs follow consistent error response format:

```yaml
# Error Response
{
  "error":
    {
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid email or password",
      "details":
        {
          "field": "password",
          "reason": "Password does not meet complexity requirements",
        },
      "requestId": "req_uuid",
      "timestamp": "2024-01-01T00:00:00Z",
    },
}
```

### **Common Error Codes:**

- `UNAUTHORIZED` - Invalid or missing authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error
