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

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  authApiKey: true,
  rbacApiKey: true,
  createdAt: true,
  updatedAt: true
}).extend({
  enabledModules: z.array(z.enum(["auth", "rbac", "azure-ad", "auth0", "saml"])).optional(),
  moduleConfigs: z.object({
    "azure-ad": z.object({
      tenantId: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
      domain: z.string().optional(),
    }).optional(),
    "auth0": z.object({
      domain: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
    }).optional(),
    "saml": z.object({
      entryPoint: z.string(),
      issuer: z.string(),
      cert: z.string(),
      identifierFormat: z.string().optional(),
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
export type TenantUser = typeof tenantUsers.$inferSelect;
export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;
export type TenantRole = typeof tenantRoles.$inferSelect;
export type InsertTenantRole = z.infer<typeof insertTenantRoleSchema>;
export type TenantUserRole = typeof tenantUserRoles.$inferSelect;
export type InsertTenantUserRole = z.infer<typeof insertTenantUserRoleSchema>;
