import {
  tenants,
  users,
  sessions,
  roles,
  userRoles,
  permissions,
  emailLogs,
  systemLogs,
  type Tenant,
  type InsertTenant,
  type User,
  type InsertUser,
  type Role,
  type Session,
  type EmailLog,
  type SystemLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql } from "drizzle-orm";
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
  createSession(session: Omit<Session, 'id' | 'createdAt'>): Promise<Session>;
  getSession(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;
  
  // Role operations
  createRole(role: Omit<Role, 'id' | 'createdAt'>): Promise<Role>;
  getRolesByTenant(tenantId: string): Promise<Role[]>;
  
  // Email logging
  logEmail(emailLog: Omit<EmailLog, 'id' | 'sentAt'>): Promise<EmailLog>;
  
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
  
  // Module management
  updateTenantModules(tenantId: string, enabledModules: string[], moduleConfigs: any): Promise<void>;
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
}

export class DatabaseStorage implements IStorage {
  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    // Generate API keys
    const authApiKey = `auth_${randomUUID().replace(/-/g, '').substring(0, 24)}`;
    const rbacApiKey = `rbac_${randomUUID().replace(/-/g, '').substring(0, 24)}`;
    
    const [tenant] = await db
      .insert(tenants)
      .values({
        ...insertTenant,
        authApiKey,
        rbacApiKey
      })
      .returning();
    
    // Create default admin user
    await this.createUser({
      tenantId: tenant.id,
      email: tenant.adminEmail,
      passwordHash: await this.hashPassword('temp123!'), // Temporary password
      isActive: true
    });
    
    // Create default roles
    const adminRole = await this.createRole({
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Full administrative access',
      permissions: ['tenant.admin', 'user.create', 'user.read', 'user.update', 'user.delete', 'role.manage'],
      isSystem: true
    });
    
    await this.createRole({
      tenantId: tenant.id,
      name: 'User',
      description: 'Standard user access',
      permissions: ['user.read'],
      isSystem: true
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
    await db
      .update(tenants)
      .set({ status, updatedAt: new Date() })
      .where(eq(tenants.id, id));
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
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
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, userId));
  }
  
  async createSession(session: Omit<Session, 'id' | 'createdAt'>): Promise<Session> {
    const [newSession] = await db
      .insert(sessions)
      .values(session)
      .returning();
    return newSession;
  }
  
  async getSession(token: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token));
    return session;
  }
  
  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  
  async createRole(role: Omit<Role, 'id' | 'createdAt'>): Promise<Role> {
    const [newRole] = await db
      .insert(roles)
      .values(role)
      .returning();
    return newRole;
  }
  
  async getRolesByTenant(tenantId: string): Promise<Role[]> {
    return await db
      .select()
      .from(roles)
      .where(eq(roles.tenantId, tenantId));
  }
  
  async logEmail(emailLog: Omit<EmailLog, 'id' | 'sentAt'>): Promise<EmailLog> {
    const [log] = await db
      .insert(emailLogs)
      .values(emailLog)
      .returning();
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
      userAgent: data.userAgent || null
    });
  }

  // Get system logs with pagination
  async getSystemLogs(options: {
    tenantId?: string;
    limit?: number;
    offset?: number;
    action?: string;
  } = {}): Promise<any[]> {
    const baseQuery = db.select({
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
      adminEmail: users.email
    })
    .from(systemLogs)
    .leftJoin(tenants, eq(systemLogs.tenantId, tenants.id))
    .leftJoin(users, eq(systemLogs.adminUserId, users.id))
    .orderBy(desc(systemLogs.timestamp));

    // Apply filters and execute
    if (options.tenantId && options.action) {
      return await baseQuery.where(
        sql`${systemLogs.tenantId} = ${options.tenantId} AND ${systemLogs.action} = ${options.action}`
      ).limit(options.limit || 50).offset(options.offset || 0);
    } else if (options.tenantId) {
      return await baseQuery.where(eq(systemLogs.tenantId, options.tenantId))
        .limit(options.limit || 50).offset(options.offset || 0);
    } else if (options.action) {
      return await baseQuery.where(eq(systemLogs.action, options.action))
        .limit(options.limit || 50).offset(options.offset || 0);
    } else {
      return await baseQuery.limit(options.limit || 50).offset(options.offset || 0);
    }
  }

  // Update tenant modules
  async updateTenantModules(tenantId: string, enabledModules: string[], moduleConfigs: any): Promise<void> {
    await db.update(tenants)
      .set({ 
        enabledModules: enabledModules,
        moduleConfigs: moduleConfigs,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId));
  }

  // Get email logs for admin
  async getEmailLogs(options: {
    tenantId?: string;
    limit?: number;
    offset?: number;
    status?: string;
  } = {}): Promise<any[]> {
    const baseQuery = db.select({
      id: emailLogs.id,
      tenantId: emailLogs.tenantId,
      recipientEmail: emailLogs.recipientEmail,
      subject: emailLogs.subject,
      templateType: emailLogs.templateType,
      status: emailLogs.status,
      sentAt: emailLogs.sentAt,
      errorMessage: emailLogs.errorMessage,
      tenantName: tenants.name
    })
    .from(emailLogs)
    .leftJoin(tenants, eq(emailLogs.tenantId, tenants.id))
    .orderBy(desc(emailLogs.sentAt));

    // Apply filters and execute
    if (options.tenantId && options.status) {
      return await baseQuery.where(
        sql`${emailLogs.tenantId} = ${options.tenantId} AND ${emailLogs.status} = ${options.status}`
      ).limit(options.limit || 50).offset(options.offset || 0);
    } else if (options.tenantId) {
      return await baseQuery.where(eq(emailLogs.tenantId, options.tenantId))
        .limit(options.limit || 50).offset(options.offset || 0);
    } else if (options.status) {
      return await baseQuery.where(eq(emailLogs.status, options.status))
        .limit(options.limit || 50).offset(options.offset || 0);
    } else {
      return await baseQuery.limit(options.limit || 50).offset(options.offset || 0);
    }
  }
  
  async getTenantStats() {
    const [stats] = await db
      .select({
        totalTenants: count(),
        activeTenants: sql<number>`count(*) filter (where status = 'active')`.as('activeTenants'),
        pendingTenants: sql<number>`count(*) filter (where status = 'pending')`.as('pendingTenants')
      })
      .from(tenants);
    
    const [emailStats] = await db
      .select({
        emailsSent: sql<number>`count(*) filter (where status = 'sent')`.as('emailsSent')
      })
      .from(emailLogs);
    
    return {
      ...stats,
      emailsSent: emailStats.emailsSent || 0
    };
  }
  
  async getRecentTenants(limit: number = 5): Promise<Tenant[]> {
    return await db
      .select()
      .from(tenants)
      .orderBy(desc(tenants.createdAt))
      .limit(limit);
  }
  
  private async hashPassword(password: string): Promise<string> {
    // Simple hash for demo - in production use bcrypt
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(password).digest('hex');
  }
}

export const storage = new DatabaseStorage();
