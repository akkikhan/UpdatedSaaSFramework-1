import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { configSyncService } from './config-sync';

export interface RealtimeUpdate {
  type: 'config-update' | 'module-change' | 'auth-change' | 'rbac-change' | 'notification-change';
  scope: 'platform' | 'tenant' | 'user';
  targetId?: string;
  data: any;
  timestamp: Date;
}

export class RealtimeSyncService {
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, {
    socket: any;
    tenantId?: string;
    userId?: string;
    userRole?: string;
    lastSeen: Date;
  }> = new Map();

  /**
   * Initialize Socket.IO server for real-time updates
   */
  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5000",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    this.setupSocketHandlers();
    this.setupConfigSyncIntegration();
    
    console.log('🔄 Real-time Sync Service initialized');
  }

  /**
   * Setup Socket.IO connection handlers
   */
  private setupSocketHandlers() {
    if (!this.io) return;

    this.io.use(async (socket, next) => {
      try {
        // Authenticate socket connection
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        
        socket.data = {
          userId: decoded.userId,
          tenantId: decoded.tenantId,
          userRole: decoded.role || 'user',
          email: decoded.email
        };

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });

    this.io.on('connection', (socket) => {
      const { userId, tenantId, userRole } = socket.data;
      
      console.log(`🔌 Client connected: ${userId} (tenant: ${tenantId}, role: ${userRole})`);
      
      // Store client connection
      this.connectedClients.set(socket.id, {
        socket,
        tenantId,
        userId,
        userRole,
        lastSeen: new Date()
      });

      // Join tenant-specific room
      if (tenantId) {
        socket.join(`tenant:${tenantId}`);
        socket.join(`user:${userId}`);
      }

      // Join role-based rooms
      if (userRole === 'platform_admin') {
        socket.join('platform:admins');
      } else if (userRole === 'tenant_admin') {
        socket.join(`tenant:${tenantId}:admins`);
      }

      // Handle client disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${userId}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle heartbeat to track active connections
      socket.on('heartbeat', () => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.lastSeen = new Date();
        }
      });

      // Handle configuration subscription requests
      socket.on('subscribe-config', (configTypes: string[]) => {
        for (const configType of configTypes) {
          socket.join(`config:${configType}`);
        }
        socket.emit('subscribed', { configTypes, timestamp: new Date() });
      });

      // Handle configuration unsubscription
      socket.on('unsubscribe-config', (configTypes: string[]) => {
        for (const configType of configTypes) {
          socket.leave(`config:${configType}`);
        }
        socket.emit('unsubscribed', { configTypes, timestamp: new Date() });
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'Real-time sync connected',
        clientId: socket.id,
        capabilities: this.getClientCapabilities(userRole),
        timestamp: new Date()
      });
    });
  }

  /**
   * Setup integration with config sync service
   */
  private setupConfigSyncIntegration() {
    // Listen for config changes from the sync service
    configSyncService.on('config-change', (event) => {
      this.broadcastConfigChange(event);
    });

    configSyncService.on('sync-completed', (event, results) => {
      this.broadcastSyncCompletion(event, results);
    });

    configSyncService.on('sync-failed', (event, error) => {
      this.broadcastSyncError(event, error);
    });
  }

  /**
   * Broadcast configuration changes to relevant clients
   */
  private broadcastConfigChange(event: any) {
    if (!this.io) return;

    const update: RealtimeUpdate = {
      type: 'config-update',
      scope: event.scope,
      targetId: event.targetId,
      data: {
        module: event.type,
        action: event.action,
        config: event.config,
        triggeredBy: event.triggeredBy
      },
      timestamp: new Date()
    };

    // Determine target rooms based on event scope
    const targetRooms = this.getTargetRooms(event);
    
    for (const room of targetRooms) {
      console.log(`📡 Broadcasting config update to room: ${room}`);
      this.io.to(room).emit('config-updated', update);
    }

    // Broadcast to clients subscribed to this config type
    this.io.to(`config:${event.type}`).emit('config-updated', update);
  }

  /**
   * Broadcast sync completion notifications
   */
  private broadcastSyncCompletion(event: any, results: any[]) {
    if (!this.io) return;

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    const notification = {
      type: 'sync-completed',
      message: `Configuration sync completed: ${successCount}/${totalCount} targets updated`,
      event: {
        type: event.type,
        action: event.action,
        scope: event.scope
      },
      results: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      },
      timestamp: new Date()
    };

    // Notify platform admins about sync completion
    this.io.to('platform:admins').emit('sync-notification', notification);
    
    // Notify affected tenant admins
    if (event.targetId) {
      this.io.to(`tenant:${event.targetId}:admins`).emit('sync-notification', notification);
    }
  }

  /**
   * Broadcast sync error notifications
   */
  private broadcastSyncError(event: any, error: Error) {
    if (!this.io) return;

    const errorNotification = {
      type: 'sync-error',
      message: `Configuration sync failed: ${error.message}`,
      event: {
        type: event.type,
        action: event.action,
        scope: event.scope
      },
      error: {
        message: error.message,
        code: 'SYNC_ERROR'
      },
      timestamp: new Date()
    };

    // Notify platform admins about sync failures
    this.io.to('platform:admins').emit('sync-error', errorNotification);
  }

  /**
   * Broadcast module availability changes
   */
  async broadcastModuleChange(tenantId: string, moduleId: string, action: 'enabled' | 'disabled', config?: any) {
    if (!this.io) return;

    const update: RealtimeUpdate = {
      type: 'module-change',
      scope: 'tenant',
      targetId: tenantId,
      data: {
        moduleId,
        action,
        config,
        effective: action === 'enabled'
      },
      timestamp: new Date()
    };

    // Broadcast to all clients in the tenant
    this.io.to(`tenant:${tenantId}`).emit('module-changed', update);
    
    // Trigger UI refresh for affected components
    this.io.to(`tenant:${tenantId}`).emit('refresh-ui', {
      components: ['navigation', 'module-list', 'dashboard'],
      reason: `Module ${moduleId} ${action}`,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast authentication changes (SSO provider updates, etc.)
   */
  async broadcastAuthChange(tenantId: string, changeType: string, providerConfig?: any) {
    if (!this.io) return;

    const update: RealtimeUpdate = {
      type: 'auth-change',
      scope: 'tenant',
      targetId: tenantId,
      data: {
        changeType,
        providerConfig,
        requiresReauth: ['provider-disabled', 'provider-config-changed'].includes(changeType)
      },
      timestamp: new Date()
    };

    // Broadcast to tenant users
    this.io.to(`tenant:${tenantId}`).emit('auth-changed', update);

    // If auth changes require re-authentication, notify users
    if (update.data.requiresReauth) {
      this.io.to(`tenant:${tenantId}`).emit('reauth-required', {
        message: 'Authentication configuration has changed. Please sign in again.',
        reason: changeType,
        gracePeriod: 300, // 5 minutes
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast RBAC changes (role updates, permission changes)
   */
  async broadcastRbacChange(tenantId: string, changeType: string, affectedUsers?: string[], roleChanges?: any) {
    if (!this.io) return;

    const update: RealtimeUpdate = {
      type: 'rbac-change',
      scope: 'tenant',
      targetId: tenantId,
      data: {
        changeType,
        affectedUsers,
        roleChanges,
        requiresRefresh: true
      },
      timestamp: new Date()
    };

    // Broadcast to tenant admins
    this.io.to(`tenant:${tenantId}:admins`).emit('rbac-changed', update);

    // Notify affected users specifically
    if (affectedUsers) {
      for (const userId of affectedUsers) {
        this.io.to(`user:${userId}`).emit('permissions-changed', {
          message: 'Your permissions have been updated',
          changes: roleChanges,
          effectiveImmediately: true,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Broadcast notification configuration changes
   */
  async broadcastNotificationChange(scope: 'platform' | 'tenant', targetId?: string, configChanges?: any) {
    if (!this.io) return;

    const update: RealtimeUpdate = {
      type: 'notification-change',
      scope,
      targetId,
      data: {
        configChanges,
        affectsUserPreferences: true
      },
      timestamp: new Date()
    };

    if (scope === 'platform') {
      // Broadcast to all connected clients
      this.io.emit('notification-config-changed', update);
    } else if (scope === 'tenant' && targetId) {
      // Broadcast to specific tenant
      this.io.to(`tenant:${targetId}`).emit('notification-config-changed', update);
    }
  }

  /**
   * Send direct notification to specific user
   */
  async sendDirectNotification(userId: string, notification: any) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('direct-notification', {
      ...notification,
      timestamp: new Date(),
      delivered: true
    });
  }

  /**
   * Get target rooms for broadcasting based on event scope
   */
  private getTargetRooms(event: any): string[] {
    const rooms: string[] = [];

    switch (event.scope) {
      case 'platform':
        rooms.push('platform:admins');
        // Also notify all tenant admins for platform-wide changes
        rooms.push('platform:all-tenant-admins');
        break;
      
      case 'tenant':
        if (event.targetId) {
          rooms.push(`tenant:${event.targetId}`);
          rooms.push(`tenant:${event.targetId}:admins`);
        }
        break;
      
      case 'user':
        if (event.targetId) {
          rooms.push(`user:${event.targetId}`);
        }
        break;
    }

    return rooms;
  }

  /**
   * Get client capabilities based on user role
   */
  private getClientCapabilities(userRole: string) {
    const baseCapabilities = {
      canReceiveNotifications: true,
      canSubscribeToConfigs: true
    };

    switch (userRole) {
      case 'platform_admin':
        return {
          ...baseCapabilities,
          canReceivePlatformUpdates: true,
          canReceiveAllTenantUpdates: true,
          canTriggerSyncs: true
        };
      
      case 'tenant_admin':
        return {
          ...baseCapabilities,
          canReceiveTenantUpdates: true,
          canManageUsers: true,
          canConfigureModules: true
        };
      
      default:
        return baseCapabilities;
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const now = new Date();
    const activeConnections = Array.from(this.connectedClients.values())
      .filter(client => (now.getTime() - client.lastSeen.getTime()) < 60000); // Active in last minute

    const stats = {
      total: this.connectedClients.size,
      active: activeConnections.length,
      byRole: {} as Record<string, number>,
      byTenant: {} as Record<string, number>
    };

    for (const client of activeConnections) {
      // Count by role
      const role = client.userRole || 'user';
      stats.byRole[role] = (stats.byRole[role] || 0) + 1;
      
      // Count by tenant
      const tenantId = client.tenantId || 'platform';
      stats.byTenant[tenantId] = (stats.byTenant[tenantId] || 0) + 1;
    }

    return stats;
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    if (this.io) {
      // Notify all clients of shutdown
      this.io.emit('server-shutdown', {
        message: 'Server is shutting down',
        timestamp: new Date(),
        reconnectIn: 5000
      });

      // Close all connections
      this.io.close();
      this.io = null;
    }

    this.connectedClients.clear();
    console.log('🔄 Real-time Sync Service shutdown complete');
  }
}

export const realtimeSyncService = new RealtimeSyncService();
