import {
  tenants,
  users,
  sessions,
  roles,
  userRoles,
  permissions,
  emailLogs,
  systemLogs,
  complianceAuditLogs,
  securityEvents,
  tenantUsers,
  tenantRoles,
  tenantUserRoles,
  tenantNotifications,
  permissionTemplates,
  businessTypes,
  defaultRoles,
  platformAdmins,
  type Tenant,
  type InsertTenant,
  type User,
  type InsertUser,
  type Role,
  type Session,
  type EmailLog,
  type SystemLog,
  type ComplianceAuditLog,
  type SecurityEvent,
  type TenantUser,
  type InsertTenantUser,
  type TenantRole,
  type InsertTenantRole,
  type TenantUserRole,
  type InsertTenantUserRole,
  type TenantNotification,
  type InsertTenantNotification,
  type PermissionTemplate,
  type InsertPermissionTemplate,
  type BusinessType,
  type InsertBusinessType,
  type DefaultRole,
  type InsertDefaultRole,
  type PlatformAdmin,
  type InsertPlatformAdmin,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, asc, and, like, gte, lte, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Tenant operations
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByOrgId(orgId: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  updateTenantStatus(id: string, status: string): Promise<void>;

  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string, tenantId: string): Promise<User | undefined>;
  updateUserLastLogin(userId: string): Promise<void>;

  // Session operations
  createSession(session: Omit<Session, "id" | "createdAt">): Promise<Session>;
  getSession(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;

  // Role operations
  createRole(role: Omit<Role, "id" | "createdAt">): Promise<Role>;
  getRolesByTenant(tenantId: string): Promise<Role[]>;

  // Email logging
  logEmail(emailLog: Omit<EmailLog, "id" | "sentAt">): Promise<EmailLog>;

  // System logging
  logSystemActivity(data: {
    tenantId?: string;
    adminUserId?: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void>;
  getSystemLogs(options?: {
    tenantId?: string;
    limit?: number;
    offset?: number;
    action?: string;
  }): Promise<any[]>;

  // Compliance logging
  getComplianceAuditLogs(options?: {
    tenantId?: string;
    eventType?: string;
    framework?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]>;
  getSecurityEvents(options?: {
    tenantId?: string;
    severity?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]>;

  // Module management
  updateTenantModules(
    tenantId: string,
    enabledModules: string[],
    moduleConfigs: any
  ): Promise<void>;
  getEmailLogs(options?: {
    tenantId?: string;
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<any[]>;

  // Statistics
  getTenantStats(): Promise<{
    totalTenants: number;
    activeTenants: number;
    pendingTenants: number;
    emailsSent: number;
  }>;
  getRecentTenants(limit: number): Promise<Tenant[]>;

  // Tenant Users - actual end users of the tenant's application
  createTenantUser(user: InsertTenantUser): Promise<TenantUser>;
  getTenantUsers(tenantId: string, limit?: number, offset?: number): Promise<TenantUser[]>;
  getTenantUser(id: string): Promise<TenantUser | null>;
  getTenantUserByEmail(tenantId: string, email: string): Promise<TenantUser | null>;
  updateTenantUser(id: string, updates: Partial<InsertTenantUser>): Promise<TenantUser | null>;
  deleteTenantUser(id: string): Promise<void>;

  // Tenant Roles - custom roles within each tenant for RBAC
  createTenantRole(role: InsertTenantRole): Promise<TenantRole>;
  getTenantRoles(tenantId: string): Promise<TenantRole[]>;
  getTenantRole(id: string): Promise<TenantRole | null>;
  updateTenantRole(id: string, updates: Partial<InsertTenantRole>): Promise<TenantRole | null>;
  deleteTenantRole(id: string): Promise<void>;

  // Tenant User Role Assignments
  assignTenantUserRole(assignment: InsertTenantUserRole): Promise<TenantUserRole>;
  getTenantUserRoles(tenantId: string, userId?: string): Promise<TenantUserRole[]>;
  removeTenantUserRole(userId: string, roleId: string): Promise<void>;

  // Tenant Notification operations
  createTenantNotification(notification: InsertTenantNotification): Promise<TenantNotification>;
  getTenantNotifications(
    tenantId: string,
    options?: { limit?: number; unreadOnly?: boolean }
  ): Promise<TenantNotification[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;

  // Platform Admin RBAC Configuration operations
  // Permission Templates
  createPermissionTemplate(template: InsertPermissionTemplate): Promise<PermissionTemplate>;
  getPermissionTemplates(): Promise<PermissionTemplate[]>;
  getPermissionTemplate(id: string): Promise<PermissionTemplate | undefined>;
  updatePermissionTemplate(
    id: string,
    template: Partial<InsertPermissionTemplate>
  ): Promise<PermissionTemplate>;
  deletePermissionTemplate(id: string): Promise<void>;

  // Business Types
  createBusinessType(businessType: InsertBusinessType): Promise<BusinessType>;
  getBusinessTypes(): Promise<BusinessType[]>;
  getBusinessType(id: string): Promise<BusinessType | undefined>;
  updateBusinessType(id: string, businessType: Partial<InsertBusinessType>): Promise<BusinessType>;
  deleteBusinessType(id: string): Promise<void>;

  // Default Roles
  createDefaultRole(role: InsertDefaultRole): Promise<DefaultRole>;
  getDefaultRoles(): Promise<DefaultRole[]>;
  getDefaultRole(id: string): Promise<DefaultRole | undefined>;
  updateDefaultRole(id: string, role: Partial<InsertDefaultRole>): Promise<DefaultRole>;
  deleteDefaultRole(id: string): Promise<void>;
  getDefaultRolesByBusinessType(businessTypeId: string): Promise<DefaultRole[]>;

  // Platform Admin operations
  createPlatformAdmin(admin: InsertPlatformAdmin): Promise<PlatformAdmin>;
  getPlatformAdmin(id: string): Promise<PlatformAdmin | undefined>;
  getPlatformAdminByEmail(email: string): Promise<PlatformAdmin | undefined>;
  updatePlatformAdminLastLogin(id: string): Promise<void>;
  getAllPlatformAdmins(): Promise<PlatformAdmin[]>;
  updatePlatformAdmin(
    id: string,
    updates: Partial<InsertPlatformAdmin>
  ): Promise<PlatformAdmin | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    if (!db) {
      throw new Error(
        "Database connection not available. Please check your database configuration."
      );
    }

    // Generate API keys
    const authApiKey = `auth_${randomUUID().replace(/-/g, "").substring(0, 24)}`;
    const rbacApiKey = `rbac_${randomUUID().replace(/-/g, "").substring(0, 24)}`;

    const [tenant] = await db
      .insert(tenants)
      .values({
        ...insertTenant,
        authApiKey,
        rbacApiKey,
      })
      .returning();

    // Create default admin user
    await this.createUser({
      tenantId: tenant.id,
      email: tenant.adminEmail,
      passwordHash: await this.hashPassword("temp123!"), // Temporary password
      isActive: true,
    });

    // Create default roles
    const adminRole = await this.createRole({
      tenantId: tenant.id,
      name: "Admin",
      description: "Full administrative access",
      permissions: [
        "tenant.admin",
        "user.create",
        "user.read",
        "user.update",
        "user.delete",
        "role.manage",
      ],
      isSystem: true,
    });

    await this.createRole({
      tenantId: tenant.id,
      name: "User",
      description: "Standard user access",
      permissions: ["user.read"],
      isSystem: true,
    });

    return tenant;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantByOrgId(orgId: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.orgId, orgId));
    return tenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async updateTenantStatus(id: string, status: string): Promise<void> {
    await db.update(tenants).set({ status, updatedAt: new Date() }).where(eq(tenants.id, id));
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getUserByEmail(email: string, tenantId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email) && eq(users.tenantId, tenantId));
    return user;
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, userId));
  }

  async createSession(session: Omit<Session, "id" | "createdAt">): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async getSession(token: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
    return session;
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  async createRole(role: Omit<Role, "id" | "createdAt">): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async getRolesByTenant(tenantId: string): Promise<Role[]> {
    return await db.select().from(roles).where(eq(roles.tenantId, tenantId));
  }

  async logEmail(emailLog: Omit<EmailLog, "id" | "sentAt">): Promise<EmailLog> {
    const [log] = await db.insert(emailLogs).values(emailLog).returning();
    return log;
  }

  // System activity logging
  async logSystemActivity(data: {
    tenantId?: string;
    adminUserId?: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await db.insert(systemLogs).values({
      tenantId: data.tenantId || null,
      adminUserId: data.adminUserId || null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      details: data.details || {},
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });
  }

  // Get system logs with pagination
  async getSystemLogs(
    options: {
      tenantId?: string;
      limit?: number;
      offset?: number;
      action?: string;
    } = {}
  ): Promise<any[]> {
    const baseQuery = db
      .select({
        id: systemLogs.id,
        tenantId: systemLogs.tenantId,
        adminUserId: systemLogs.adminUserId,
        action: systemLogs.action,
        entityType: systemLogs.entityType,
        entityId: systemLogs.entityId,
        details: systemLogs.details,
        ipAddress: systemLogs.ipAddress,
        userAgent: systemLogs.userAgent,
        timestamp: systemLogs.timestamp,
        tenantName: tenants.name,
        adminEmail: users.email,
      })
      .from(systemLogs)
      .leftJoin(tenants, eq(systemLogs.tenantId, tenants.id))
      .leftJoin(users, eq(systemLogs.adminUserId, users.id))
      .orderBy(desc(systemLogs.timestamp));

    // Apply filters and execute
    if (options.tenantId && options.action) {
      return await baseQuery
        .where(
          sql`${systemLogs.tenantId} = ${options.tenantId} AND ${systemLogs.action} = ${options.action}`
        )
        .limit(options.limit || 50)
        .offset(options.offset || 0);
    } else if (options.tenantId) {
      return await baseQuery
        .where(eq(systemLogs.tenantId, options.tenantId))
        .limit(options.limit || 50)
        .offset(options.offset || 0);
    } else if (options.action) {
      return await baseQuery
        .where(eq(systemLogs.action, options.action))
        .limit(options.limit || 50)
        .offset(options.offset || 0);
    } else {
      return await baseQuery.limit(options.limit || 50).offset(options.offset || 0);
    }
  }

  // Update tenant modules
  async updateTenantModules(
    tenantId: string,
    enabledModules: string[],
    moduleConfigs: any
  ): Promise<void> {
    await db
      .update(tenants)
      .set({
        enabledModules: enabledModules,
        moduleConfigs: moduleConfigs,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
  }

  // Compliance audit logs
  async getComplianceAuditLogs(
    options: {
      tenantId?: string;
      eventType?: string;
      framework?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    let query = db
      .select({
        id: complianceAuditLogs.id,
        tenantId: complianceAuditLogs.tenantId,
        userId: complianceAuditLogs.userId,
        adminUserId: complianceAuditLogs.adminUserId,
        eventType: complianceAuditLogs.eventType,
        eventCategory: complianceAuditLogs.eventCategory,
        entityType: complianceAuditLogs.entityType,
        entityId: complianceAuditLogs.entityId,
        entityName: complianceAuditLogs.entityName,
        action: complianceAuditLogs.action,
        outcome: complianceAuditLogs.outcome,
        riskLevel: complianceAuditLogs.riskLevel,
        complianceFrameworks: complianceAuditLogs.complianceFrameworks,
        dataClassification: complianceAuditLogs.dataClassification,
        details: complianceAuditLogs.details,
        ipAddress: complianceAuditLogs.ipAddress,
        timestamp: complianceAuditLogs.timestamp,
        tenantName: tenants.name,
      })
      .from(complianceAuditLogs)
      .leftJoin(tenants, eq(complianceAuditLogs.tenantId, tenants.id))
      .orderBy(desc(complianceAuditLogs.timestamp));

    // Apply filters
    const conditions = [];
    if (options.tenantId) {
      conditions.push(eq(complianceAuditLogs.tenantId, options.tenantId));
    }
    if (options.eventType) {
      conditions.push(eq(complianceAuditLogs.eventType, options.eventType));
    }
    if (options.framework) {
      conditions.push(sql`${options.framework} = ANY(${complianceAuditLogs.complianceFrameworks})`);
    }
    if (options.startDate) {
      conditions.push(sql`${complianceAuditLogs.timestamp} >= ${options.startDate}`);
    }
    if (options.endDate) {
      conditions.push(sql`${complianceAuditLogs.timestamp} <= ${options.endDate}`);
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.reduce(
        (acc, condition, index) => (index === 0 ? condition : sql`${acc} AND ${condition}`),
        conditions[0]
      );
      query = query.where(whereCondition);
    }

    return await query.limit(options.limit || 50).offset(options.offset || 0);
  }

  // Security events
  async getSecurityEvents(
    options: {
      tenantId?: string;
      severity?: string;
      eventType?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    let query = db
      .select({
        id: securityEvents.id,
        tenantId: securityEvents.tenantId,
        eventType: securityEvents.eventType,
        severity: securityEvents.severity,
        source: securityEvents.source,
        userId: securityEvents.userId,
        ipAddress: securityEvents.ipAddress,
        userAgent: securityEvents.userAgent,
        details: securityEvents.details,
        isResolved: securityEvents.isResolved,
        resolvedBy: securityEvents.resolvedBy,
        resolvedAt: securityEvents.resolvedAt,
        timestamp: securityEvents.timestamp,
        tenantName: tenants.name,
      })
      .from(securityEvents)
      .leftJoin(tenants, eq(securityEvents.tenantId, tenants.id))
      .orderBy(desc(securityEvents.timestamp));

    // Apply filters
    const conditions = [];
    if (options.tenantId) {
      conditions.push(eq(securityEvents.tenantId, options.tenantId));
    }
    if (options.severity) {
      conditions.push(eq(securityEvents.severity, options.severity));
    }
    if (options.eventType) {
      conditions.push(eq(securityEvents.eventType, options.eventType));
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.reduce(
        (acc, condition, index) => (index === 0 ? condition : sql`${acc} AND ${condition}`),
        conditions[0]
      );
      query = query.where(whereCondition);
    }

    return await query.limit(options.limit || 50).offset(options.offset || 0);
  }

  // Get email logs for admin
  async getEmailLogs(
    options: {
      tenantId?: string;
      limit?: number;
      offset?: number;
      status?: string;
    } = {}
  ): Promise<any[]> {
    const baseQuery = db
      .select({
        id: emailLogs.id,
        tenantId: emailLogs.tenantId,
        recipientEmail: emailLogs.recipientEmail,
        subject: emailLogs.subject,
        templateType: emailLogs.templateType,
        status: emailLogs.status,
        sentAt: emailLogs.sentAt,
        errorMessage: emailLogs.errorMessage,
        tenantName: tenants.name,
      })
      .from(emailLogs)
      .leftJoin(tenants, eq(emailLogs.tenantId, tenants.id))
      .orderBy(desc(emailLogs.sentAt));

    // Apply filters and execute
    if (options.tenantId && options.status) {
      return await baseQuery
        .where(
          sql`${emailLogs.tenantId} = ${options.tenantId} AND ${emailLogs.status} = ${options.status}`
        )
        .limit(options.limit || 50)
        .offset(options.offset || 0);
    } else if (options.tenantId) {
      return await baseQuery
        .where(eq(emailLogs.tenantId, options.tenantId))
        .limit(options.limit || 50)
        .offset(options.offset || 0);
    } else if (options.status) {
      return await baseQuery
        .where(eq(emailLogs.status, options.status))
        .limit(options.limit || 50)
        .offset(options.offset || 0);
    } else {
      return await baseQuery.limit(options.limit || 50).offset(options.offset || 0);
    }
  }

  async getTenantStats() {
    const [stats] = await db
      .select({
        totalTenants: count(),
        activeTenants: sql<number>`count(*) filter (where status = 'active')`.as("activeTenants"),
        pendingTenants: sql<number>`count(*) filter (where status = 'pending')`.as(
          "pendingTenants"
        ),
      })
      .from(tenants);

    const [emailStats] = await db
      .select({
        emailsSent: sql<number>`count(*) filter (where status = 'sent')`.as("emailsSent"),
      })
      .from(emailLogs);

    return {
      ...stats,
      emailsSent: emailStats.emailsSent || 0,
    };
  }

  async getRecentTenants(limit: number = 5): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(desc(tenants.createdAt)).limit(limit);
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import("bcryptjs");
    return bcrypt.hash(password, 10);
  }

  // Tenant Users Implementation
  async createTenantUser(user: InsertTenantUser): Promise<TenantUser> {
    const [newUser] = await db.insert(tenantUsers).values(user).returning();
    return newUser;
  }

  async getTenantUsers(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TenantUser[]> {
    return await db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId))
      .orderBy(desc(tenantUsers.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getTenantUser(id: string): Promise<TenantUser | null> {
    const [user] = await db.select().from(tenantUsers).where(eq(tenantUsers.id, id));
    return user || null;
  }

  async getTenantUserByEmail(tenantId: string, email: string): Promise<TenantUser | null> {
    const [user] = await db
      .select()
      .from(tenantUsers)
      .where(sql`${tenantUsers.tenantId} = ${tenantId} AND ${tenantUsers.email} = ${email}`);
    return user || null;
  }

  async updateTenantUser(
    id: string,
    updates: Partial<InsertTenantUser>
  ): Promise<TenantUser | null> {
    const [updatedUser] = await db
      .update(tenantUsers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenantUsers.id, id))
      .returning();
    return updatedUser || null;
  }

  async deleteTenantUser(id: string): Promise<void> {
    await db.delete(tenantUsers).where(eq(tenantUsers.id, id));
  }

  // Tenant Roles Implementation
  async createTenantRole(role: InsertTenantRole): Promise<TenantRole> {
    const [newRole] = await db.insert(tenantRoles).values(role).returning();
    return newRole;
  }

  async getTenantRoles(tenantId: string): Promise<TenantRole[]> {
    return await db
      .select()
      .from(tenantRoles)
      .where(eq(tenantRoles.tenantId, tenantId))
      .orderBy(tenantRoles.name);
  }

  async getTenantRole(id: string): Promise<TenantRole | null> {
    const [role] = await db.select().from(tenantRoles).where(eq(tenantRoles.id, id));
    return role || null;
  }

  async updateTenantRole(
    id: string,
    updates: Partial<InsertTenantRole>
  ): Promise<TenantRole | null> {
    const [updatedRole] = await db
      .update(tenantRoles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenantRoles.id, id))
      .returning();
    return updatedRole || null;
  }

  async deleteTenantRole(id: string): Promise<void> {
    await db.delete(tenantRoles).where(eq(tenantRoles.id, id));
  }

  // Tenant User Role Assignments Implementation
  async assignTenantUserRole(assignment: InsertTenantUserRole): Promise<TenantUserRole> {
    const [newAssignment] = await db.insert(tenantUserRoles).values(assignment).returning();
    return newAssignment;
  }

  async getTenantUserRoles(tenantId: string, userId?: string): Promise<TenantUserRole[]> {
    if (userId) {
      return await db
        .select()
        .from(tenantUserRoles)
        .where(
          sql`${tenantUserRoles.tenantId} = ${tenantId} AND ${tenantUserRoles.userId} = ${userId}`
        );
    }

    return await db.select().from(tenantUserRoles).where(eq(tenantUserRoles.tenantId, tenantId));
  }

  async removeTenantUserRole(userId: string, roleId: string): Promise<void> {
    await db
      .delete(tenantUserRoles)
      .where(sql`${tenantUserRoles.userId} = ${userId} AND ${tenantUserRoles.roleId} = ${roleId}`);
  }

  // Tenant Notification Implementation
  async createTenantNotification(
    notification: InsertTenantNotification
  ): Promise<TenantNotification> {
    const [result] = await db.insert(tenantNotifications).values(notification).returning();
    return result;
  }

  async getTenantNotifications(
    tenantId: string,
    options: { limit?: number; unreadOnly?: boolean } = {}
  ): Promise<TenantNotification[]> {
    let query = db
      .select()
      .from(tenantNotifications)
      .where(eq(tenantNotifications.tenantId, tenantId));

    if (options.unreadOnly) {
      query = query.where(eq(tenantNotifications.isRead, false));
    }

    return await query.orderBy(desc(tenantNotifications.createdAt)).limit(options.limit || 50);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(tenantNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(tenantNotifications.id, notificationId));
  }

  // Platform Admin RBAC Configuration Implementation

  // Permission Templates
  async createPermissionTemplate(template: InsertPermissionTemplate): Promise<PermissionTemplate> {
    const [result] = await db.insert(permissionTemplates).values(template).returning();
    return result;
  }

  async getPermissionTemplates(): Promise<PermissionTemplate[]> {
    return await db
      .select()
      .from(permissionTemplates)
      .where(eq(permissionTemplates.isActive, true))
      .orderBy(asc(permissionTemplates.name));
  }

  async getPermissionTemplate(id: string): Promise<PermissionTemplate | undefined> {
    const [result] = await db
      .select()
      .from(permissionTemplates)
      .where(eq(permissionTemplates.id, id));
    return result;
  }

  async updatePermissionTemplate(
    id: string,
    template: Partial<InsertPermissionTemplate>
  ): Promise<PermissionTemplate> {
    const [result] = await db
      .update(permissionTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(permissionTemplates.id, id))
      .returning();
    return result;
  }

  async deletePermissionTemplate(id: string): Promise<void> {
    await db
      .update(permissionTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(permissionTemplates.id, id));
  }

  // Business Types
  async createBusinessType(businessType: InsertBusinessType): Promise<BusinessType> {
    const [result] = await db.insert(businessTypes).values(businessType).returning();
    return result;
  }

  async getBusinessTypes(): Promise<BusinessType[]> {
    return await db
      .select()
      .from(businessTypes)
      .where(eq(businessTypes.isActive, true))
      .orderBy(asc(businessTypes.name));
  }

  async getBusinessType(id: string): Promise<BusinessType | undefined> {
    const [result] = await db.select().from(businessTypes).where(eq(businessTypes.id, id));
    return result;
  }

  async updateBusinessType(
    id: string,
    businessType: Partial<InsertBusinessType>
  ): Promise<BusinessType> {
    const [result] = await db
      .update(businessTypes)
      .set({ ...businessType, updatedAt: new Date() })
      .where(eq(businessTypes.id, id))
      .returning();
    return result;
  }

  async deleteBusinessType(id: string): Promise<void> {
    await db
      .update(businessTypes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(businessTypes.id, id));
  }

  // Default Roles
  async createDefaultRole(role: InsertDefaultRole): Promise<DefaultRole> {
    const [result] = await db.insert(defaultRoles).values(role).returning();
    return result;
  }

  async getDefaultRoles(): Promise<DefaultRole[]> {
    return await db
      .select()
      .from(defaultRoles)
      .where(eq(defaultRoles.isActive, true))
      .orderBy(asc(defaultRoles.priority));
  }

  async getDefaultRole(id: string): Promise<DefaultRole | undefined> {
    const [result] = await db.select().from(defaultRoles).where(eq(defaultRoles.id, id));
    return result;
  }

  async updateDefaultRole(id: string, role: Partial<InsertDefaultRole>): Promise<DefaultRole> {
    const [result] = await db
      .update(defaultRoles)
      .set({ ...role, updatedAt: new Date() })
      .where(eq(defaultRoles.id, id))
      .returning();
    return result;
  }

  async deleteDefaultRole(id: string): Promise<void> {
    await db
      .update(defaultRoles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(defaultRoles.id, id));
  }

  async getDefaultRolesByBusinessType(businessTypeId: string): Promise<DefaultRole[]> {
    return await db
      .select()
      .from(defaultRoles)
      .where(and(eq(defaultRoles.businessTypeId, businessTypeId), eq(defaultRoles.isActive, true)))
      .orderBy(asc(defaultRoles.priority));
  }

  // Platform Admin operations
  async createPlatformAdmin(admin: InsertPlatformAdmin): Promise<PlatformAdmin> {
    const [result] = await db.insert(platformAdmins).values(admin).returning();
    return result;
  }

  async getPlatformAdmin(id: string): Promise<PlatformAdmin | undefined> {
    const [result] = await db.select().from(platformAdmins).where(eq(platformAdmins.id, id));
    return result;
  }

  async getPlatformAdminByEmail(email: string): Promise<PlatformAdmin | undefined> {
    const [result] = await db.select().from(platformAdmins).where(eq(platformAdmins.email, email));
    return result;
  }

  async updatePlatformAdminLastLogin(id: string): Promise<void> {
    await db.update(platformAdmins).set({ lastLogin: new Date() }).where(eq(platformAdmins.id, id));
  }

  async getAllPlatformAdmins(): Promise<PlatformAdmin[]> {
    return await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.isActive, true))
      .orderBy(asc(platformAdmins.name));
  }

  async updatePlatformAdmin(
    id: string,
    updates: Partial<InsertPlatformAdmin>
  ): Promise<PlatformAdmin | undefined> {
    const [result] = await db
      .update(platformAdmins)
      .set(updates)
      .where(eq(platformAdmins.id, id))
      .returning();
    return result;
  }
}

// Create demo storage for testing when database is unavailable
class DemoStorage implements IStorage {
  async createTenant(): Promise<any> {
    return { id: "demo-tenant", status: "active" };
  }
  async getTenant(): Promise<any> {
    return { id: "demo-tenant", status: "active" };
  }
  async getTenantByOrgId(): Promise<any> {
    return { id: "demo-tenant", status: "active" };
  }
  async getAllTenants(): Promise<any[]> {
    return [{ id: "demo-tenant", status: "active" }];
  }
  async updateTenantStatus(): Promise<void> {
    return;
  }
  async createUser(): Promise<any> {
    return { id: "demo-user" };
  }
  async getUserByEmail(): Promise<any> {
    return { id: "demo-user" };
  }
  async updateUserLastLogin(): Promise<void> {
    return;
  }
  async createSession(): Promise<any> {
    return { id: "demo-session" };
  }
  async getSession(): Promise<any> {
    return { id: "demo-session" };
  }
  async deleteSession(): Promise<void> {
    return;
  }
  async createRole(): Promise<any> {
    return { id: "demo-role" };
  }
  async getRolesByTenant(): Promise<any[]> {
    return [{ id: "demo-role" }];
  }
  async logEmail(): Promise<any> {
    return { id: "demo-email-log" };
  }
  async logSystemActivity(): Promise<void> {
    return;
  }
  async getSystemLogs(): Promise<any[]> {
    return [];
  }
  async getComplianceAuditLogs(): Promise<any[]> {
    return [];
  }
  async getSecurityEvents(): Promise<any[]> {
    return [];
  }
  async updateTenantModules(): Promise<void> {
    return;
  }
  async getEmailLogs(): Promise<any[]> {
    return [];
  }
  async getTenantStats(): Promise<any> {
    return { totalTenants: 1, activeTenants: 1, pendingTenants: 0, emailsSent: 0 };
  }
  async getRecentTenants(): Promise<any[]> {
    return [{ id: "demo-tenant" }];
  }
  async createTenantUser(): Promise<any> {
    return { id: "demo-tenant-user" };
  }
  async getTenantUsers(): Promise<any[]> {
    return [];
  }
  async getTenantUser(): Promise<any> {
    return null;
  }
  async getTenantUserByEmail(): Promise<any> {
    return null;
  }
  async updateTenantUser(): Promise<any> {
    return null;
  }
  async deleteTenantUser(): Promise<void> {
    return;
  }
  async createTenantRole(): Promise<any> {
    return { id: "demo-tenant-role" };
  }
  async getTenantRoles(): Promise<any[]> {
    return [];
  }
  async getTenantRole(): Promise<any> {
    return null;
  }
  async updateTenantRole(): Promise<any> {
    return null;
  }
  async deleteTenantRole(): Promise<void> {
    return;
  }
  async assignTenantUserRole(): Promise<any> {
    return { id: "demo-assignment" };
  }
  async getTenantUserRoles(): Promise<any[]> {
    return [];
  }
  async removeTenantUserRole(): Promise<void> {
    return;
  }
  async createTenantNotification(): Promise<any> {
    return { id: "demo-notification" };
  }
  async getTenantNotifications(): Promise<any[]> {
    return [];
  }
  async markNotificationAsRead(): Promise<void> {
    return;
  }
  async createPermissionTemplate(): Promise<any> {
    return { id: "demo-template" };
  }
  async getPermissionTemplates(): Promise<any[]> {
    return [];
  }
  async getPermissionTemplate(): Promise<any> {
    return undefined;
  }
  async updatePermissionTemplate(): Promise<any> {
    return { id: "demo-template" };
  }
  async deletePermissionTemplate(): Promise<void> {
    return;
  }
  async createBusinessType(): Promise<any> {
    return { id: "demo-business-type" };
  }
  async getBusinessTypes(): Promise<any[]> {
    return [];
  }
  async getBusinessType(): Promise<any> {
    return undefined;
  }
  async updateBusinessType(): Promise<any> {
    return { id: "demo-business-type" };
  }
  async deleteBusinessType(): Promise<void> {
    return;
  }
  async createDefaultRole(): Promise<any> {
    return { id: "demo-default-role" };
  }
  async getDefaultRoles(): Promise<any[]> {
    return [];
  }
  async getDefaultRole(): Promise<any> {
    return undefined;
  }
  async updateDefaultRole(): Promise<any> {
    return { id: "demo-default-role" };
  }
  async deleteDefaultRole(): Promise<void> {
    return;
  }
  async getDefaultRolesByBusinessType(): Promise<any[]> {
    return [];
  }

  // Platform Admin operations (demo stubs)
  async createPlatformAdmin(): Promise<any> {
    return { id: "demo-platform-admin" };
  }
  async getPlatformAdmin(): Promise<any> {
    return undefined;
  }
  async getPlatformAdminByEmail(): Promise<any> {
    return undefined;
  }
  async updatePlatformAdminLastLogin(): Promise<void> {
    return;
  }
  async getAllPlatformAdmins(): Promise<any[]> {
    return [];
  }
  async updatePlatformAdmin(): Promise<any> {
    return { id: "demo-platform-admin" };
  }
}

// Use demo storage if database connection fails, otherwise use database storage
let storage: IStorage;
try {
  // Check if database is available
  if (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL) {
    storage = new DatabaseStorage();
  } else {
    console.log("No database configuration found, using demo storage");
    storage = new DemoStorage();
  }
} catch (error) {
  console.log("Database connection failed, using demo storage:", error.message);
  storage = new DemoStorage();
}

export { storage };
