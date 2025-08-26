import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenants table - core tenant management
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 100 }).notNull().unique(), // URL slug
  name: varchar("name", { length: 255 }).notNull(),
  adminEmail: varchar("admin_email", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, active, suspended
  authApiKey: varchar("auth_api_key", { length: 100 }).notNull(),
  rbacApiKey: varchar("rbac_api_key", { length: 100 }).notNull(),
  // Module configurations
  enabledModules: jsonb("enabled_modules").default(sql`'["auth", "rbac"]'`), // ["auth", "rbac", "azure-ad", "auth0", "saml"]
  moduleConfigs: jsonb("module_configs").default(sql`'{}'`), // Store configs for each module
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Users table for authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login")
});

// Sessions table for JWT token management
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Roles table for RBAC
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: text("permissions").array(), // Array of permission keys
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// User-Role assignments
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: uuid("assigned_by").references(() => users.id)
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  key: varchar("key", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  isSystem: boolean("is_system").default(false)
});

// Tenant notifications for admin actions
export const tenantNotifications = pgTable("tenant_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  type: varchar("type", { length: 50 }).notNull(), // module_enabled, module_disabled, status_changed, config_updated
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").default(sql`'{}'`), // Store additional context
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at")
});

// Email logs for tracking
export const emailLogs = pgTable("email_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  templateType: varchar("template_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // sent, failed, pending
  sentAt: timestamp("sent_at").defaultNow(),
  errorMessage: text("error_message")
});

// System activity logs for admin monitoring
export const systemLogs = pgTable("system_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  adminUserId: uuid("admin_user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // module_enabled, module_disabled, tenant_created, etc.
  entityType: varchar("entity_type", { length: 50 }).notNull(), // tenant, module, user
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  details: jsonb("details").default(sql`'{}'`), // Additional context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow()
});

// Compliance audit logs for regulatory requirements
export const complianceAuditLogs = pgTable("compliance_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  userId: uuid("user_id").references(() => tenantUsers.id), // End user performing action
  adminUserId: uuid("admin_user_id").references(() => users.id), // Platform admin
  eventType: varchar("event_type", { length: 50 }).notNull(), // rbac_change, data_access, security_event, auth_event
  eventCategory: varchar("event_category", { length: 50 }).notNull(), // create, read, update, delete, access, login, logout
  entityType: varchar("entity_type", { length: 50 }).notNull(), // user, role, permission, data_record, session
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  entityName: varchar("entity_name", { length: 255 }), // Human readable entity name
  action: varchar("action", { length: 100 }).notNull(), // role_assigned, permission_granted, data_exported, login_failed
  outcome: varchar("outcome", { length: 20 }).notNull().default("success"), // success, failure, blocked
  riskLevel: varchar("risk_level", { length: 20 }).notNull().default("low"), // low, medium, high, critical
  complianceFrameworks: text("compliance_frameworks").array().default(sql`'{}'::text[]`), // gdpr, sox, hipaa, pci, iso27001
  dataClassification: varchar("data_classification", { length: 50 }).default("public"), // public, internal, confidential, restricted
  details: jsonb("details").default(sql`'{}'`), // Event-specific details
  beforeState: jsonb("before_state"), // State before change (for audit purposes)
  afterState: jsonb("after_state"), // State after change
  sessionId: varchar("session_id", { length: 255 }), // Session identifier
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  geolocation: jsonb("geolocation"), // Country, region for compliance reporting
  timestamp: timestamp("timestamp").defaultNow(),
  retentionUntil: timestamp("retention_until"), // Automatic data purging for compliance
});

// Security events for threat detection and compliance
export const securityEvents = pgTable("security_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  eventType: varchar("event_type", { length: 50 }).notNull(), // suspicious_login, brute_force, privilege_escalation
  severity: varchar("severity", { length: 20 }).notNull(), // info, warning, alert, critical
  source: varchar("source", { length: 100 }).notNull(), // api, web, mobile, system
  userId: uuid("user_id").references(() => tenantUsers.id),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  details: jsonb("details").default(sql`'{}'`),
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  timestamp: timestamp("timestamp").defaultNow()
});

// Tenant Users - The actual end users of each tenant's application
export const tenantUsers = pgTable("tenant_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  externalId: varchar("external_id", { length: 255 }), // For SSO integrations
  metadata: jsonb("metadata").default(sql`'{}'`)
});

// Tenant Roles - Custom roles within each tenant
export const tenantRoles = pgTable("tenant_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// User Role Assignments
export const tenantUserRoles = pgTable("tenant_user_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => tenantUsers.id, { onDelete: "cascade" }).notNull(),
  roleId: uuid("role_id").references(() => tenantRoles.id, { onDelete: "cascade" }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: uuid("assigned_by").references(() => tenantUsers.id)
});

// Platform Admin RBAC Configuration Tables

// Permission Templates - Reusable permission sets for different business scenarios
export const permissionTemplates = pgTable("permission_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
  businessTypes: text("business_types").array().notNull().default(sql`'{}'::text[]`),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Business Types - Different business categories with specific compliance requirements
export const businessTypes = pgTable("business_types", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  requiredCompliance: text("required_compliance").array().notNull().default(sql`'{}'::text[]`),
  defaultPermissions: text("default_permissions").array().notNull().default(sql`'{}'::text[]`),
  riskLevel: varchar("risk_level", { length: 20 }).notNull().default("low"), // low, medium, high, critical
  isActive: boolean("is_active").notNull().default(true),
  maxTenants: integer("max_tenants"), // Optional limit for business type
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Default Roles - Templates for roles that get created for new tenants
export const defaultRoles = pgTable("default_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
  businessTypeId: uuid("business_type_id").references(() => businessTypes.id, { onDelete: "cascade" }),
  permissionTemplateId: uuid("permission_template_id").references(() => permissionTemplates.id, { onDelete: "set null" }),
  isSystemRole: boolean("is_system_role").notNull().default(false),
  canBeModified: boolean("can_be_modified").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(1), // 1 = highest priority
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  authApiKey: true,
  rbacApiKey: true,
  createdAt: true,
  updatedAt: true
}).extend({
  enabledModules: z.array(z.enum(["auth", "rbac", "azure-ad", "auth0", "saml", "logging", "notifications", "ai-copilot"])).optional(),
  moduleConfigs: z.object({
    "auth": z.object({
      providers: z.array(z.object({
        type: z.enum(["azure-ad", "auth0", "saml", "local"]),
        name: z.string(), // "Employee SSO", "Customer Auth", etc.
        priority: z.number().default(1), // 1 = primary, 2 = secondary
        config: z.object({
          // Azure AD config
          tenantId: z.string().optional(),
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
          domain: z.string().optional(),
          // Auth0 config
          auth0Domain: z.string().optional(),
          audience: z.string().optional(),
          // SAML config
          entryPoint: z.string().optional(),
          issuer: z.string().optional(),
          cert: z.string().optional(),
          identifierFormat: z.string().optional(),
          // Common settings
          callbackUrl: z.string().optional(),
          logoutUrl: z.string().optional(),
        }).optional(),
        userMapping: z.object({
          emailField: z.string().default("email"),
          nameField: z.string().default("name"),
          roleField: z.string().optional(),
        }).optional(),
        enabled: z.boolean().default(true),
      })).optional(),
      defaultProvider: z.string().optional(), // Which provider to use by default
      allowFallback: z.boolean().default(true), // Allow fallback to other providers
    }).optional(),
    "rbac": z.object({
      permissionTemplate: z.enum(["standard", "enterprise", "custom"]).default("standard"),
      businessType: z.enum(["general", "healthcare", "finance", "education", "government"]).default("general"),
      customPermissions: z.array(z.string()).optional(),
      defaultRoles: z.array(z.string()).optional(),
    }).optional(),
    "logging": z.object({
      levels: z.array(z.enum(["error", "warn", "info", "debug", "trace"])).optional(),
      destinations: z.array(z.enum(["database", "elasticsearch", "cloudwatch", "datadog"])).optional(),
      retention: z.object({
        error: z.string().optional(),
        security: z.string().optional(),
        audit: z.string().optional(),
        performance: z.string().optional(),
      }).optional(),
      alerting: z.object({
        errorThreshold: z.number().optional(),
        securityEvents: z.boolean().optional(),
        performanceDegradation: z.boolean().optional(),
      }).optional(),
    }).optional(),
    "notifications": z.object({
      channels: z.array(z.enum(["email", "sms", "push", "webhook", "slack"])).optional(),
      emailProvider: z.enum(["sendgrid", "mailgun", "ses", "smtp"]).optional(),
      smsProvider: z.enum(["twilio", "vonage", "aws-sns"]).optional(),
      pushProvider: z.enum(["firebase", "apn", "onesignal"]).optional(),
      templates: z.object({
        welcome: z.boolean().optional(),
        trial_ending: z.boolean().optional(),
        payment_failed: z.boolean().optional(),
        security_alert: z.boolean().optional(),
      }).optional(),
    }).optional(),
    "ai-copilot": z.object({
      provider: z.enum(["openai", "anthropic", "azure-openai", "aws-bedrock"]).optional(),
      model: z.string().optional(),
      capabilities: z.object({
        chatSupport: z.boolean().optional(),
        codeAssistance: z.boolean().optional(),
        documentAnalysis: z.boolean().optional(),
        workflowAutomation: z.boolean().optional(),
      }).optional(),
      safety: z.object({
        contentFiltering: z.boolean().optional(),
        piiDetection: z.boolean().optional(),
        rateLimiting: z.boolean().optional(),
      }).optional(),
    }).optional(),
  }).optional(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true
});

export const insertTenantUserSchema = createInsertSchema(tenantUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTenantRoleSchema = createInsertSchema(tenantRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTenantUserRoleSchema = createInsertSchema(tenantUserRoles).omit({
  id: true,
  assignedAt: true
});

export const insertTenantNotificationSchema = createInsertSchema(tenantNotifications).omit({
  id: true,
  createdAt: true
});

export const insertComplianceAuditLogSchema = createInsertSchema(complianceAuditLogs).omit({
  id: true,
  timestamp: true
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  timestamp: true
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Session = typeof sessions.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
export type SystemLog = typeof systemLogs.$inferSelect;
export type ComplianceAuditLog = typeof complianceAuditLogs.$inferSelect;
export type InsertComplianceAuditLog = z.infer<typeof insertComplianceAuditLogSchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type TenantUser = typeof tenantUsers.$inferSelect;
export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;
export type TenantRole = typeof tenantRoles.$inferSelect;
export type InsertTenantRole = z.infer<typeof insertTenantRoleSchema>;
export type TenantUserRole = typeof tenantUserRoles.$inferSelect;

// Platform Admin RBAC Configuration Types
export type PermissionTemplate = typeof permissionTemplates.$inferSelect;
export type BusinessType = typeof businessTypes.$inferSelect;  
export type DefaultRole = typeof defaultRoles.$inferSelect;

// Insert schemas for RBAC Configuration
export const insertPermissionTemplateSchema = createInsertSchema(permissionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBusinessTypeSchema = createInsertSchema(businessTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertDefaultRoleSchema = createInsertSchema(defaultRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertPermissionTemplate = z.infer<typeof insertPermissionTemplateSchema>;
export type InsertBusinessType = z.infer<typeof insertBusinessTypeSchema>;
export type InsertDefaultRole = z.infer<typeof insertDefaultRoleSchema>;
export type InsertTenantUserRole = z.infer<typeof insertTenantUserRoleSchema>;
export type TenantNotification = typeof tenantNotifications.$inferSelect;
export type InsertTenantNotification = z.infer<typeof insertTenantNotificationSchema>;
