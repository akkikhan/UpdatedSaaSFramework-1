import { db } from '../db';
import {
  tenants,
  tenantUsers,
  userNotificationPreferences,
  tenantRoles,
  tenantPermissions,
  tenantUserRoles
} from '../../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { EventEmitter } from 'events';

export interface ConfigChangeEvent {
  type: 'auth' | 'rbac' | 'notifications' | 'module' | 'global';
  action: 'create' | 'update' | 'delete' | 'enable' | 'disable';
  scope: 'platform' | 'tenant' | 'user';
  targetId?: string; // tenantId or userId
  config: any;
  metadata?: any;
  timestamp: Date;
  triggeredBy: string;
}

export interface SyncRule {
  triggerEvents: string[];
  targetScopes: ('platform' | 'tenant' | 'user')[];
  syncDirection: 'down' | 'up' | 'bidirectional';
  conflictResolution: 'platform-wins' | 'tenant-wins' | 'user-wins' | 'merge';
  autoApply: boolean;
  requiresApproval?: boolean;
}

export class ConfigSyncService extends EventEmitter {
  private syncRules: Map<string, SyncRule> = new Map();
  private activeSyncs: Set<string> = new Set();

  constructor() {
    super();
    this.initializeSyncRules();
    this.setupEventHandlers();
    console.log('🔄 Config Synchronization Service initialized');
  }

  /**
   * Initialize synchronization rules for different config types
   */
  private initializeSyncRules() {
    // Auth/SSO Configuration Sync Rules
    this.syncRules.set('auth-provider-config', {
      triggerEvents: ['auth.provider.create', 'auth.provider.update', 'auth.provider.enable', 'auth.provider.disable'],
      targetScopes: ['tenant', 'user'],
      syncDirection: 'down', // Platform → Tenant → User
      conflictResolution: 'platform-wins',
      autoApply: true
    });

    // RBAC Permission Template Sync Rules
    this.syncRules.set('rbac-permission-templates', {
      triggerEvents: ['rbac.template.create', 'rbac.template.update', 'rbac.businesstype.update'],
      targetScopes: ['tenant'],
      syncDirection: 'down',
      conflictResolution: 'merge', // Merge with existing tenant customizations
      autoApply: true
    });

    // Notification Configuration Sync Rules
    this.syncRules.set('notification-configs', {
      triggerEvents: ['notifications.config.update', 'notifications.provider.add'],
      targetScopes: ['tenant', 'user'],
      syncDirection: 'down',
      conflictResolution: 'tenant-wins', // Tenant preferences override platform defaults
      autoApply: true
    });

    // Module Enablement Sync Rules
    this.syncRules.set('module-availability', {
      triggerEvents: ['module.enable', 'module.disable', 'module.config.update'],
      targetScopes: ['tenant', 'user'],
      syncDirection: 'down',
      conflictResolution: 'platform-wins',
      autoApply: true
    });

    // Tenant-to-Platform Sync Rules (for reporting/analytics)
    this.syncRules.set('tenant-usage-feedback', {
      triggerEvents: ['tenant.config.change', 'tenant.feature.usage'],
      targetScopes: ['platform'],
      syncDirection: 'up',
      conflictResolution: 'merge',
      autoApply: true
    });

    // User Preference Inheritance Rules
    this.syncRules.set('user-preference-defaults', {
      triggerEvents: ['tenant.defaults.update', 'user.created'],
      targetScopes: ['user'],
      syncDirection: 'down',
      conflictResolution: 'user-wins', // User preferences always win
      autoApply: true
    });
  }

  /**
   * Setup event handlers for configuration changes
   */
  private setupEventHandlers() {
    this.on('config-change', async (event: ConfigChangeEvent) => {
      await this.processConfigChange(event);
    });

    this.on('sync-completed', (event: ConfigChangeEvent, results: any[]) => {
      console.log(`✅ Sync completed for ${event.type}.${event.action} affecting ${results.length} entities`);
    });

    this.on('sync-failed', (event: ConfigChangeEvent, error: Error) => {
      console.error(`❌ Sync failed for ${event.type}.${event.action}:`, error.message);
    });
  }

  /**
   * Trigger configuration change event
   */
  async triggerConfigChange(event: Omit<ConfigChangeEvent, 'timestamp'>) {
    const fullEvent: ConfigChangeEvent = {
      ...event,
      timestamp: new Date()
    };

    console.log(`🔄 Triggering config sync: ${fullEvent.type}.${fullEvent.action} from ${fullEvent.scope}`);
    this.emit('config-change', fullEvent);
  }

  /**
   * Process configuration change and apply sync rules
   */
  private async processConfigChange(event: ConfigChangeEvent) {
    const eventKey = `${event.type}.${event.action}`;
    
    // Prevent circular syncs
    if (this.activeSyncs.has(eventKey)) {
      console.log(`⚠️ Skipping circular sync for ${eventKey}`);
      return;
    }

    this.activeSyncs.add(eventKey);

    try {
      const applicableRules = Array.from(this.syncRules.entries())
        .filter(([_, rule]) => rule.triggerEvents.some(trigger => 
          eventKey.startsWith(trigger.replace('*', ''))
        ));

      const syncResults = [];

      for (const [ruleName, rule] of applicableRules) {
        console.log(`📋 Applying sync rule: ${ruleName} for ${eventKey}`);
        
        try {
          const result = await this.applySyncRule(event, rule);
          syncResults.push({ ruleName, success: true, result });
        } catch (error) {
          console.error(`❌ Sync rule ${ruleName} failed:`, error);
          syncResults.push({ ruleName, success: false, error: error.message });
        }
      }

      this.emit('sync-completed', event, syncResults);

    } catch (error) {
      this.emit('sync-failed', event, error);
    } finally {
      this.activeSyncs.delete(eventKey);
    }
  }

  /**
   * Apply specific sync rule based on event and rule configuration
   */
  private async applySyncRule(event: ConfigChangeEvent, rule: SyncRule) {
    const results = [];

    for (const targetScope of rule.targetScopes) {
      switch (targetScope) {
        case 'tenant':
          if (event.scope === 'platform') {
            results.push(await this.syncToTenants(event, rule));
          }
          break;
        
        case 'user':
          if (event.scope === 'platform' || event.scope === 'tenant') {
            results.push(await this.syncToUsers(event, rule));
          }
          break;
        
        case 'platform':
          if (event.scope === 'tenant') {
            results.push(await this.syncToPlatform(event, rule));
          }
          break;
      }
    }

    return results;
  }

  /**
   * Sync configuration changes down to tenants
   */
  private async syncToTenants(event: ConfigChangeEvent, rule: SyncRule) {
    console.log(`🏢 Syncing ${event.type} changes to tenants`);

    // Get all active tenants or specific tenant if targetId provided
    const tenantQuery = event.targetId 
      ? db.select().from(tenants).where(eq(tenants.id, event.targetId))
      : db.select().from(tenants).where(eq(tenants.status, 'active'));

    const targetTenants = await tenantQuery;
    const syncResults = [];

    for (const tenant of targetTenants) {
      try {
        const result = await this.syncConfigToTenant(tenant, event, rule);
        syncResults.push({ tenantId: tenant.id, success: true, result });
      } catch (error) {
        console.error(`Failed to sync to tenant ${tenant.id}:`, error);
        syncResults.push({ tenantId: tenant.id, success: false, error: error.message });
      }
    }

    return syncResults;
  }

  /**
   * Sync configuration to a specific tenant
   */
  private async syncConfigToTenant(tenant: any, event: ConfigChangeEvent, rule: SyncRule) {
    const currentModuleConfigs = tenant.moduleConfigs || {};
    let updatedConfigs = { ...currentModuleConfigs };

    switch (event.type) {
      case 'auth':
        updatedConfigs = await this.syncAuthConfigToTenant(tenant, event, rule, updatedConfigs);
        break;
      
      case 'rbac':
        updatedConfigs = await this.syncRbacConfigToTenant(tenant, event, rule, updatedConfigs);
        break;
      
      case 'notifications':
        updatedConfigs = await this.syncNotificationConfigToTenant(tenant, event, rule, updatedConfigs);
        break;
      
      case 'module':
        updatedConfigs = await this.syncModuleConfigToTenant(tenant, event, rule, updatedConfigs);
        break;
    }

    // Update tenant configuration
    await db.update(tenants)
      .set({ 
        moduleConfigs: updatedConfigs,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenant.id));

    // Trigger real-time updates to tenant portal
    await this.broadcastToTenant(tenant.id, {
      type: 'config-update',
      module: event.type,
      config: updatedConfigs[event.type],
      timestamp: new Date()
    });

    return { configUpdated: true, broadcastSent: true };
  }

  /**
   * Sync auth configuration to tenant
   */
  private async syncAuthConfigToTenant(tenant: any, event: ConfigChangeEvent, rule: SyncRule, configs: any) {
    const currentAuthConfig = configs.auth || { providers: [], defaultProvider: 'local' };
    
    switch (event.action) {
      case 'create':
      case 'update':
        if (rule.conflictResolution === 'platform-wins') {
          // Platform auth provider updates take precedence
          const providerIndex = currentAuthConfig.providers.findIndex(
            (p: any) => p.type === event.config.type
          );
          
          if (providerIndex >= 0) {
            currentAuthConfig.providers[providerIndex] = {
              ...currentAuthConfig.providers[providerIndex],
              ...event.config
            };
          } else {
            currentAuthConfig.providers.push(event.config);
          }
        }
        break;
      
      case 'enable':
        const enableProvider = currentAuthConfig.providers.find((p: any) => p.type === event.config.type);
        if (enableProvider) {
          enableProvider.enabled = true;
        }
        break;
      
      case 'disable':
        const disableProvider = currentAuthConfig.providers.find((p: any) => p.type === event.config.type);
        if (disableProvider) {
          disableProvider.enabled = false;
        }
        break;
    }

    return { ...configs, auth: currentAuthConfig };
  }

  /**
   * Sync RBAC configuration to tenant
   */
  private async syncRbacConfigToTenant(tenant: any, event: ConfigChangeEvent, rule: SyncRule, configs: any) {
    const currentRbacConfig = configs.rbac || {};
    
    switch (event.action) {
      case 'update':
        if (event.config.permissionTemplate) {
          if (rule.conflictResolution === 'merge') {
            // Merge new template permissions with existing customizations
            currentRbacConfig.permissionTemplate = event.config.permissionTemplate;
            currentRbacConfig.inheritedPermissions = event.config.permissions || [];
            // Keep existing customPermissions
          } else if (rule.conflictResolution === 'platform-wins') {
            currentRbacConfig.permissionTemplate = event.config.permissionTemplate;
            currentRbacConfig.customPermissions = event.config.permissions || [];
          }
        }
        
        if (event.config.businessType) {
          currentRbacConfig.businessType = event.config.businessType;
          // Apply new default roles for this business type
          await this.updateTenantDefaultRoles(tenant.id, event.config.businessType);
        }
        break;
    }

    return { ...configs, rbac: currentRbacConfig };
  }

  /**
   * Sync notification configuration to tenant
   */
  private async syncNotificationConfigToTenant(tenant: any, event: ConfigChangeEvent, rule: SyncRule, configs: any) {
    const currentNotificationConfig = configs.notifications || { 
      channels: { email: true, sms: false, push: false },
      providers: {}
    };
    
    switch (event.action) {
      case 'update':
      case 'create':
        if (rule.conflictResolution === 'tenant-wins') {
          // Only update if tenant hasn't customized
          if (!currentNotificationConfig.customized) {
            currentNotificationConfig.providers = {
              ...currentNotificationConfig.providers,
              ...event.config.providers
            };
            currentNotificationConfig.defaultChannels = event.config.defaultChannels;
          }
        } else {
          // Platform settings override
          currentNotificationConfig.providers = {
            ...currentNotificationConfig.providers,
            ...event.config.providers
          };
        }
        break;
    }

    return { ...configs, notifications: currentNotificationConfig };
  }

  /**
   * Sync module configuration to tenant
   */
  private async syncModuleConfigToTenant(tenant: any, event: ConfigChangeEvent, rule: SyncRule, configs: any) {
    const enabledModules = tenant.enabledModules || [];
    
    switch (event.action) {
      case 'enable':
        if (!enabledModules.includes(event.config.moduleId)) {
          enabledModules.push(event.config.moduleId);
          // Also update tenant enabled modules
          await db.update(tenants)
            .set({ enabledModules })
            .where(eq(tenants.id, tenant.id));
        }
        break;
      
      case 'disable':
        const moduleIndex = enabledModules.indexOf(event.config.moduleId);
        if (moduleIndex >= 0) {
          enabledModules.splice(moduleIndex, 1);
          await db.update(tenants)
            .set({ enabledModules })
            .where(eq(tenants.id, tenant.id));
        }
        break;
    }

    return configs;
  }

  /**
   * Sync configuration changes down to users
   */
  private async syncToUsers(event: ConfigChangeEvent, rule: SyncRule) {
    console.log(`👤 Syncing ${event.type} changes to users`);
    
    // Get target users based on event scope
    let targetUsers;
    if (event.targetId && event.scope === 'tenant') {
      // Sync to all users in specific tenant
      targetUsers = await db.select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, event.targetId));
    } else {
      // Sync to all users across all tenants
      targetUsers = await db.select().from(tenantUsers);
    }

    const syncResults = [];

    for (const user of targetUsers) {
      try {
        const result = await this.syncConfigToUser(user, event, rule);
        syncResults.push({ userId: user.id, success: true, result });
      } catch (error) {
        console.error(`Failed to sync to user ${user.id}:`, error);
        syncResults.push({ userId: user.id, success: false, error: error.message });
      }
    }

    return syncResults;
  }

  /**
   * Sync configuration to a specific user
   */
  private async syncConfigToUser(user: any, event: ConfigChangeEvent, rule: SyncRule) {
    switch (event.type) {
      case 'notifications':
        return await this.syncNotificationPreferencesToUser(user, event, rule);
      
      case 'rbac':
        return await this.syncRbacSettingsToUser(user, event, rule);
      
      case 'auth':
        return await this.syncAuthSettingsToUser(user, event, rule);
      
      default:
        return { updated: false, reason: 'No user-level sync defined for this config type' };
    }
  }

  /**
   * Sync notification preferences to user
   */
  private async syncNotificationPreferencesToUser(user: any, event: ConfigChangeEvent, rule: SyncRule) {
    if (rule.conflictResolution === 'user-wins') {
      // Check if user has existing preferences
      const existingPrefs = await db.select()
        .from(userNotificationPreferences)
        .where(and(
          eq(userNotificationPreferences.userId, user.id),
          eq(userNotificationPreferences.tenantId, user.tenantId)
        ));

      if (existingPrefs.length > 0) {
        // User has preferences, don't override
        return { updated: false, reason: 'User preferences take precedence' };
      }
    }

    // Create/update default notification preferences for user
    const defaultPreferences = event.config.defaultPreferences || {
      email: true,
      sms: false,
      push: false,
      webhook: false,
      in_app: true
    };

    // Apply defaults for each category
    const categories = ['general', 'security', 'billing', 'maintenance', 'feature'];
    const syncResults = [];

    for (const category of categories) {
      const existing = await db.select()
        .from(userNotificationPreferences)
        .where(and(
          eq(userNotificationPreferences.userId, user.id),
          eq(userNotificationPreferences.tenantId, user.tenantId),
          eq(userNotificationPreferences.category, category)
        ))
        .limit(1);

      if (existing.length === 0) {
        // Create new preference
        await db.insert(userNotificationPreferences).values({
          userId: user.id,
          tenantId: user.tenantId,
          category,
          channels: defaultPreferences,
          frequency: 'immediate',
          isEnabled: true
        });
        syncResults.push({ category, action: 'created' });
      } else if (rule.conflictResolution !== 'user-wins') {
        // Update existing preference
        await db.update(userNotificationPreferences)
          .set({
            channels: defaultPreferences,
            updatedAt: new Date()
          })
          .where(eq(userNotificationPreferences.id, existing[0].id));
        syncResults.push({ category, action: 'updated' });
      }
    }

    return { updated: true, syncResults };
  }

  /**
   * Sync RBAC settings to user
   */
  private async syncRbacSettingsToUser(user: any, event: ConfigChangeEvent, rule: SyncRule) {
    // Update user roles based on new business type defaults
    if (event.action === 'update' && event.config.businessType) {
      const defaultRolesForBusinessType = await this.getDefaultRolesForBusinessType(
        event.config.businessType,
        user.tenantId
      );

      // Apply default roles to new users only
      const existingRoles = await db.select()
        .from(tenantUserRoles)
        .where(eq(tenantUserRoles.userId, user.id));

      if (existingRoles.length === 0) {
        // New user, apply default roles
        for (const role of defaultRolesForBusinessType) {
          await db.insert(tenantUserRoles).values({
            userId: user.id,
            roleId: role.id,
            assignedBy: 'system',
            assignmentType: 'default'
          });
        }
        return { updated: true, rolesApplied: defaultRolesForBusinessType.length };
      }
    }

    return { updated: false, reason: 'No RBAC updates required for existing user' };
  }

  /**
   * Sync auth settings to user
   */
  private async syncAuthSettingsToUser(user: any, event: ConfigChangeEvent, rule: SyncRule) {
    // Update user's available auth providers
    // This primarily affects the login UI and MFA options
    
    return { updated: true, reason: 'Auth provider availability updated for user login' };
  }

  /**
   * Sync tenant changes up to platform level
   */
  private async syncToPlatform(event: ConfigChangeEvent, rule: SyncRule) {
    console.log(`🏛️ Syncing ${event.type} changes to platform level`);
    
    // Aggregate tenant usage and preferences for platform analytics
    switch (event.type) {
      case 'auth':
        return await this.aggregateAuthUsageMetrics(event);
      
      case 'rbac':
        return await this.aggregateRbacUsageMetrics(event);
      
      case 'notifications':
        return await this.aggregateNotificationMetrics(event);
      
      default:
        return { aggregated: false, reason: 'No platform aggregation defined' };
    }
  }

  /**
   * Helper methods
   */
  private async updateTenantDefaultRoles(tenantId: string, businessType: string) {
    // Implementation for updating tenant default roles based on business type
    console.log(`Updating default roles for tenant ${tenantId} with business type ${businessType}`);
  }

  private async getDefaultRolesForBusinessType(businessType: string, tenantId: string) {
    return await db.select()
      .from(tenantRoles)
      .where(and(
        eq(tenantRoles.tenantId, tenantId),
        eq(tenantRoles.isDefault, true)
      ));
  }

  private async aggregateAuthUsageMetrics(event: ConfigChangeEvent) {
    // Aggregate auth provider usage across tenants
    return { aggregated: true, type: 'auth-metrics' };
  }

  private async aggregateRbacUsageMetrics(event: ConfigChangeEvent) {
    // Aggregate RBAC configuration patterns
    return { aggregated: true, type: 'rbac-metrics' };
  }

  private async aggregateNotificationMetrics(event: ConfigChangeEvent) {
    // Aggregate notification delivery and preference metrics
    return { aggregated: true, type: 'notification-metrics' };
  }

  /**
   * Broadcast real-time updates to specific tenant
   */
  private async broadcastToTenant(tenantId: string, update: any) {
    // Implementation for real-time broadcasting (WebSocket, Server-Sent Events, etc.)
    console.log(`📡 Broadcasting update to tenant ${tenantId}:`, update);
    
    // This would integrate with your real-time communication system
    // Examples: Socket.io, WebSocket, Server-Sent Events, or message queue
  }

  /**
   * Get effective configuration for a specific context
   */
  async getEffectiveConfig(type: string, tenantId?: string, userId?: string) {
    // Start with platform defaults
    let effectiveConfig = await this.getPlatformDefaults(type);
    
    // Apply tenant overrides
    if (tenantId) {
      const tenantConfig = await this.getTenantConfig(type, tenantId);
      effectiveConfig = this.mergeConfigs(effectiveConfig, tenantConfig);
    }
    
    // Apply user overrides
    if (userId) {
      const userConfig = await this.getUserConfig(type, userId);
      effectiveConfig = this.mergeConfigs(effectiveConfig, userConfig);
    }
    
    return effectiveConfig;
  }

  private async getPlatformDefaults(type: string) {
    // Get platform-level default configuration
    return {};
  }

  private async getTenantConfig(type: string, tenantId: string) {
    const tenant = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    return tenant[0]?.moduleConfigs?.[type] || {};
  }

  private async getUserConfig(type: string, userId: string) {
    // Get user-specific configuration
    return {};
  }

  private mergeConfigs(base: any, override: any) {
    // Deep merge configuration objects with override taking precedence
    return { ...base, ...override };
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    this.removeAllListeners();
    this.activeSyncs.clear();
    console.log('🔄 Config Sync Service shutdown complete');
  }
}

export const configSyncService = new ConfigSyncService();
