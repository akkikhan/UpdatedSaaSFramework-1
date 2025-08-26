import { db } from '../db';
import { storage } from '../storage';
import {
  tenantRoles,
  tenantUsers,
  tenantUserRoles,
  roleHierarchy,
  permissionGroups,
  roleTemplates,
  bulkOperations,
  permissionAuditLog
} from '../../shared/schema';
import type {
  TenantRole,
  TenantUser,
  InsertRoleHierarchy,
  InsertPermissionGroup,
  InsertRoleTemplate,
  InsertBulkOperation,
  InsertPermissionAuditLog,
  RoleHierarchy,
  PermissionGroup,
  RoleTemplate,
  BulkOperation
} from '../../shared/schema';
import { complianceService } from './compliance';
import { eq, and, inArray, desc, sql, gte, lt } from 'drizzle-orm';

export interface RoleAssignmentOptions {
  expiresAt?: Date;
  assignmentType?: 'permanent' | 'temporary' | 'conditional';
  conditions?: any;
  reason?: string;
}

export interface BulkOperationResult {
  operationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errorMessages: string[];
}

export class EnhancedRBACService {
  constructor() {
    console.log('🛡️ Enhanced RBAC Service initialized');
  }

  /**
   * Create role with optional parent hierarchy
   */
  async createRole(
    tenantId: string,
    roleData: {
      name: string;
      description?: string;
      permissions: string[];
      parentRoleId?: string;
      inheritanceType?: 'full' | 'partial' | 'additive';
    },
    createdBy: string
  ): Promise<TenantRole> {
    const [role] = await db.insert(tenantRoles).values({
      tenantId,
      name: roleData.name,
      description: roleData.description,
      permissions: roleData.permissions,
      isSystem: false
    }).returning();

    // Create hierarchy if parent specified
    if (roleData.parentRoleId) {
      await this.createRoleHierarchy(
        tenantId,
        roleData.parentRoleId,
        role.id,
        roleData.inheritanceType || 'full',
        createdBy
      );
    }

    // Log audit event
    await this.logPermissionChange({
      tenantId,
      action: 'role_created',
      entityType: 'role',
      entityId: role.id,
      newValue: { name: role.name, permissions: role.permissions },
      changedBy: createdBy
    });

    return role;
  }

  /**
   * Create role hierarchy relationship
   */
  async createRoleHierarchy(
    tenantId: string,
    parentRoleId: string,
    childRoleId: string,
    inheritanceType: 'full' | 'partial' | 'additive' = 'full',
    createdBy: string,
    inheritedPermissions?: string[]
  ): Promise<RoleHierarchy> {
    // Validate no circular dependency
    const wouldCreateCycle = await this.wouldCreateCircularDependency(
      tenantId,
      parentRoleId,
      childRoleId
    );

    if (wouldCreateCycle) {
      throw new Error('Cannot create role hierarchy: would create circular dependency');
    }

    const [hierarchy] = await db.insert(roleHierarchy).values({
      tenantId,
      parentRoleId,
      childRoleId,
      inheritanceType,
      inheritedPermissions: inheritedPermissions || []
    }).returning();

    // Update child role permissions based on inheritance
    await this.updateInheritedPermissions(childRoleId);

    // Log audit event
    await this.logPermissionChange({
      tenantId,
      action: 'hierarchy_created',
      entityType: 'hierarchy',
      entityId: hierarchy.id,
      newValue: { parentRoleId, childRoleId, inheritanceType },
      changedBy: createdBy
    });

    return hierarchy;
  }

  /**
   * Assign role to user with time-based options
   */
  async assignRole(
    tenantId: string,
    userId: string,
    roleId: string,
    assignedBy: string,
    options: RoleAssignmentOptions = {}
  ): Promise<any> {
    // Check if assignment already exists
    const existing = await db.select()
      .from(tenantUserRoles)
      .where(and(
        eq(tenantUserRoles.tenantId, tenantId),
        eq(tenantUserRoles.userId, userId),
        eq(tenantUserRoles.roleId, roleId),
        eq(tenantUserRoles.isActive, true)
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Role already assigned to user');
    }

    const assignmentData = {
      tenantId,
      userId,
      roleId,
      assignedBy,
      expiresAt: options.expiresAt || null,
      assignmentType: options.assignmentType || 'permanent',
      conditions: options.conditions || {},
      metadata: { reason: options.reason },
      isActive: true,
      activatedAt: new Date()
    };

    const [assignment] = await db.insert(tenantUserRoles)
      .values(assignmentData)
      .returning();

    // Log compliance event
    await complianceService.logRBACEvent({
      tenantId,
      userId,
      adminUserId: assignedBy,
      action: 'role_assigned',
      entityType: 'user',
      entityId: userId,
      afterState: { roleId, assignmentType: options.assignmentType }
    });

    // Log audit event
    await this.logPermissionChange({
      tenantId,
      userId,
      roleId,
      action: 'role_assigned',
      entityType: 'user',
      entityId: userId,
      newValue: assignmentData,
      changeReason: options.reason,
      changedBy: assignedBy
    });

    return assignment;
  }

  /**
   * Get effective permissions for a user (including hierarchy)
   */
  async getUserEffectivePermissions(tenantId: string, userId: string): Promise<string[]> {
    // Get user's direct role assignments
    const userRoles = await db.select({
      roleId: tenantUserRoles.roleId,
      expiresAt: tenantUserRoles.expiresAt,
      isActive: tenantUserRoles.isActive
    })
    .from(tenantUserRoles)
    .where(and(
      eq(tenantUserRoles.tenantId, tenantId),
      eq(tenantUserRoles.userId, userId),
      eq(tenantUserRoles.isActive, true)
    ));

    // Filter out expired assignments
    const activeRoles = userRoles.filter(role => 
      !role.expiresAt || role.expiresAt > new Date()
    );

    if (activeRoles.length === 0) {
      return [];
    }

    const roleIds = activeRoles.map(r => r.roleId);

    // Get all permissions including inherited ones
    const effectivePermissions = await this.getRoleEffectivePermissions(tenantId, roleIds);

    return [...new Set(effectivePermissions)]; // Remove duplicates
  }

  /**
   * Get effective permissions for roles (including hierarchy)
   */
  async getRoleEffectivePermissions(tenantId: string, roleIds: string[]): Promise<string[]> {
    const allPermissions = new Set<string>();
    const processedRoles = new Set<string>();

    const processRole = async (roleId: string) => {
      if (processedRoles.has(roleId)) return;
      processedRoles.add(roleId);

      // Get role's direct permissions
      const role = await db.select()
        .from(tenantRoles)
        .where(and(
          eq(tenantRoles.tenantId, tenantId),
          eq(tenantRoles.id, roleId)
        ))
        .limit(1);

      if (role.length > 0) {
        role[0].permissions.forEach(permission => allPermissions.add(permission));

        // Get parent roles for inheritance
        const parentHierarchies = await db.select()
          .from(roleHierarchy)
          .where(and(
            eq(roleHierarchy.tenantId, tenantId),
            eq(roleHierarchy.childRoleId, roleId),
            eq(roleHierarchy.isActive, true)
          ));

        // Process parent roles recursively
        for (const hierarchy of parentHierarchies) {
          await processRole(hierarchy.parentRoleId);

          // Apply inheritance rules
          if (hierarchy.inheritanceType === 'partial' && hierarchy.inheritedPermissions) {
            hierarchy.inheritedPermissions.forEach(permission => allPermissions.add(permission));
          }
        }
      }
    };

    // Process all roles
    for (const roleId of roleIds) {
      await processRole(roleId);
    }

    return Array.from(allPermissions);
  }

  /**
   * Create permission group
   */
  async createPermissionGroup(
    tenantId: string,
    groupData: {
      name: string;
      description?: string;
      permissions: string[];
      category?: string;
      icon?: string;
      color?: string;
    },
    createdBy: string
  ): Promise<PermissionGroup> {
    const [group] = await db.insert(permissionGroups).values({
      tenantId,
      name: groupData.name,
      description: groupData.description,
      permissions: groupData.permissions,
      category: groupData.category || 'custom',
      icon: groupData.icon,
      color: groupData.color
    }).returning();

    // Log audit event
    await this.logPermissionChange({
      tenantId,
      action: 'permission_group_created',
      entityType: 'permission_group',
      entityId: group.id,
      newValue: groupData,
      changedBy: createdBy
    });

    return group;
  }

  /**
   * Create role template
   */
  async createRoleTemplate(
    templateData: {
      tenantId?: string;
      name: string;
      description?: string;
      permissions: string[];
      permissionGroupIds?: string[];
      businessType?: string;
      complianceLevel?: string;
      isPublic?: boolean;
      tags?: string[];
    },
    createdBy: string
  ): Promise<RoleTemplate> {
    const [template] = await db.insert(roleTemplates).values({
      ...templateData,
      createdBy,
      isPublic: templateData.isPublic || false
    }).returning();

    return template;
  }

  /**
   * Create role from template
   */
  async createRoleFromTemplate(
    tenantId: string,
    templateId: string,
    roleName: string,
    createdBy: string
  ): Promise<TenantRole> {
    const template = await db.select()
      .from(roleTemplates)
      .where(eq(roleTemplates.id, templateId))
      .limit(1);

    if (template.length === 0) {
      throw new Error('Role template not found');
    }

    const templateData = template[0];

    // Update usage count
    await db.update(roleTemplates)
      .set({ usageCount: templateData.usageCount + 1 })
      .where(eq(roleTemplates.id, templateId));

    // Create role from template
    return this.createRole(
      tenantId,
      {
        name: roleName,
        description: templateData.description || `Created from template: ${templateData.name}`,
        permissions: templateData.permissions
      },
      createdBy
    );
  }

  /**
   * Bulk assign roles to multiple users
   */
  async bulkAssignRoles(
    tenantId: string,
    userIds: string[],
    roleIds: string[],
    assignedBy: string,
    options: RoleAssignmentOptions = {}
  ): Promise<BulkOperationResult> {
    const operationData: InsertBulkOperation = {
      tenantId,
      operationType: 'assign_roles',
      targetType: 'users',
      targetIds: userIds,
      parameters: { roleIds, options },
      totalItems: userIds.length * roleIds.length,
      initiatedBy: assignedBy
    };

    const [operation] = await db.insert(bulkOperations)
      .values(operationData)
      .returning();

    // Process bulk operation asynchronously
    this.processBulkOperation(operation.id).catch(console.error);

    return {
      operationId: operation.id,
      status: 'pending',
      progress: 0,
      totalItems: operation.totalItems,
      processedItems: 0,
      failedItems: 0,
      errorMessages: []
    };
  }

  /**
   * Process bulk operation
   */
  private async processBulkOperation(operationId: string) {
    await db.update(bulkOperations)
      .set({ status: 'processing', startedAt: new Date() })
      .where(eq(bulkOperations.id, operationId));

    const operation = await db.select()
      .from(bulkOperations)
      .where(eq(bulkOperations.id, operationId))
      .limit(1);

    if (operation.length === 0) return;

    const op = operation[0];
    const { targetIds, parameters } = op as any;
    const { roleIds, options } = parameters;

    let processedItems = 0;
    let failedItems = 0;
    const errorMessages: string[] = [];

    try {
      for (const userId of targetIds) {
        for (const roleId of roleIds) {
          try {
            await this.assignRole(op.tenantId, userId, roleId, op.initiatedBy, options);
            processedItems++;
          } catch (error) {
            failedItems++;
            errorMessages.push(`Failed to assign role ${roleId} to user ${userId}: ${error.message}`);
          }

          // Update progress
          const progress = Math.round((processedItems + failedItems) / op.totalItems * 100);
          await db.update(bulkOperations)
            .set({ 
              progress,
              processedItems: processedItems,
              failedItems: failedItems,
              errorMessages: errorMessages
            })
            .where(eq(bulkOperations.id, operationId));
        }
      }

      // Mark as completed
      await db.update(bulkOperations)
        .set({ 
          status: 'completed',
          completedAt: new Date(),
          result: { processedItems, failedItems, errorMessages }
        })
        .where(eq(bulkOperations.id, operationId));

    } catch (error) {
      await db.update(bulkOperations)
        .set({ 
          status: 'failed',
          completedAt: new Date(),
          errorMessages: [...errorMessages, error.message]
        })
        .where(eq(bulkOperations.id, operationId));
    }
  }

  /**
   * Get bulk operation status
   */
  async getBulkOperationStatus(operationId: string): Promise<BulkOperationResult | null> {
    const operation = await db.select()
      .from(bulkOperations)
      .where(eq(bulkOperations.id, operationId))
      .limit(1);

    if (operation.length === 0) return null;

    const op = operation[0];
    return {
      operationId: op.id,
      status: op.status as any,
      progress: op.progress,
      totalItems: op.totalItems,
      processedItems: op.processedItems,
      failedItems: op.failedItems,
      errorMessages: op.errorMessages || []
    };
  }

  /**
   * Clean up expired role assignments
   */
  async cleanupExpiredAssignments(): Promise<number> {
    const now = new Date();
    
    // Find expired assignments
    const expiredAssignments = await db.select()
      .from(tenantUserRoles)
      .where(and(
        eq(tenantUserRoles.isActive, true),
        lt(tenantUserRoles.expiresAt, now)
      ));

    if (expiredAssignments.length === 0) return 0;

    // Deactivate expired assignments
    await db.update(tenantUserRoles)
      .set({ 
        isActive: false,
        deactivatedAt: now
      })
      .where(and(
        eq(tenantUserRoles.isActive, true),
        lt(tenantUserRoles.expiresAt, now)
      ));

    // Log cleanup events
    for (const assignment of expiredAssignments) {
      await this.logPermissionChange({
        tenantId: assignment.tenantId,
        userId: assignment.userId,
        roleId: assignment.roleId,
        action: 'role_expired',
        entityType: 'user',
        entityId: assignment.userId,
        oldValue: { isActive: true },
        newValue: { isActive: false },
        changeReason: 'Automatic cleanup - assignment expired',
        changedBy: null // System action
      });
    }

    return expiredAssignments.length;
  }

  /**
   * Get role hierarchy tree
   */
  async getRoleHierarchyTree(tenantId: string): Promise<any[]> {
    const hierarchies = await db.select()
      .from(roleHierarchy)
      .where(and(
        eq(roleHierarchy.tenantId, tenantId),
        eq(roleHierarchy.isActive, true)
      ));

    const roles = await db.select()
      .from(tenantRoles)
      .where(eq(tenantRoles.tenantId, tenantId));

    // Build tree structure
    const roleMap = new Map(roles.map(role => [role.id, { ...role, children: [] }]));
    const rootRoles: any[] = [];

    for (const hierarchy of hierarchies) {
      const parent = roleMap.get(hierarchy.parentRoleId);
      const child = roleMap.get(hierarchy.childRoleId);

      if (parent && child) {
        parent.children.push({
          ...child,
          inheritanceType: hierarchy.inheritanceType,
          hierarchyId: hierarchy.id
        });
      }
    }

    // Find root roles (roles with no parents)
    const childRoleIds = new Set(hierarchies.map(h => h.childRoleId));
    for (const role of roles) {
      if (!childRoleIds.has(role.id)) {
        rootRoles.push(roleMap.get(role.id));
      }
    }

    return rootRoles;
  }

  /**
   * Log permission change for audit trail
   */
  private async logPermissionChange(data: {
    tenantId: string;
    userId?: string;
    roleId?: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    changeReason?: string;
    changedBy: string | null;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const auditData: InsertPermissionAuditLog = {
      tenantId: data.tenantId,
      userId: data.userId || null,
      roleId: data.roleId || null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      oldValue: data.oldValue || null,
      newValue: data.newValue || null,
      changeReason: data.changeReason || null,
      changedBy: data.changedBy,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null
    };

    await db.insert(permissionAuditLog).values(auditData);
  }

  /**
   * Check for circular dependency in role hierarchy
   */
  private async wouldCreateCircularDependency(
    tenantId: string,
    parentRoleId: string,
    childRoleId: string
  ): Promise<boolean> {
    if (parentRoleId === childRoleId) return true;

    const visited = new Set<string>();
    const checkPath = async (roleId: string): Promise<boolean> => {
      if (visited.has(roleId)) return true;
      if (roleId === parentRoleId) return true;

      visited.add(roleId);

      const children = await db.select()
        .from(roleHierarchy)
        .where(and(
          eq(roleHierarchy.tenantId, tenantId),
          eq(roleHierarchy.parentRoleId, roleId),
          eq(roleHierarchy.isActive, true)
        ));

      for (const child of children) {
        if (await checkPath(child.childRoleId)) {
          return true;
        }
      }

      return false;
    };

    return checkPath(childRoleId);
  }

  /**
   * Update inherited permissions for a role
   */
  private async updateInheritedPermissions(roleId: string) {
    // Get role details
    const role = await db.select()
      .from(tenantRoles)
      .where(eq(tenantRoles.id, roleId))
      .limit(1);

    if (role.length === 0) return;

    const currentPermissions = new Set(role[0].permissions);

    // Get parent permissions
    const parentHierarchies = await db.select()
      .from(roleHierarchy)
      .where(and(
        eq(roleHierarchy.childRoleId, roleId),
        eq(roleHierarchy.isActive, true)
      ));

    for (const hierarchy of parentHierarchies) {
      const parentRole = await db.select()
        .from(tenantRoles)
        .where(eq(tenantRoles.id, hierarchy.parentRoleId))
        .limit(1);

      if (parentRole.length > 0) {
        const parentPermissions = parentRole[0].permissions;

        if (hierarchy.inheritanceType === 'full') {
          parentPermissions.forEach(p => currentPermissions.add(p));
        } else if (hierarchy.inheritanceType === 'partial' && hierarchy.inheritedPermissions) {
          hierarchy.inheritedPermissions.forEach(p => currentPermissions.add(p));
        }
      }
    }

    // Update role permissions
    await db.update(tenantRoles)
      .set({ 
        permissions: Array.from(currentPermissions),
        updatedAt: new Date()
      })
      .where(eq(tenantRoles.id, roleId));
  }

  /**
   * Get permission audit logs
   */
  async getPermissionAuditLogs(options: {
    tenantId: string;
    userId?: string;
    roleId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    let query = db.select()
      .from(permissionAuditLog)
      .where(eq(permissionAuditLog.tenantId, options.tenantId))
      .orderBy(desc(permissionAuditLog.timestamp));

    if (options.userId) {
      query = query.where(eq(permissionAuditLog.userId, options.userId));
    }

    if (options.startDate) {
      query = query.where(gte(permissionAuditLog.timestamp, options.startDate));
    }

    return await query.limit(options.limit || 100).offset(options.offset || 0);
  }
}

export const enhancedRBACService = new EnhancedRBACService();
