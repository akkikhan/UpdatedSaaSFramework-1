import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useToast } from './use-toast';

interface RealtimeUpdate {
  type: 'config-update' | 'module-change' | 'auth-change' | 'rbac-change' | 'notification-change';
  scope: 'platform' | 'tenant' | 'user';
  targetId?: string;
  data: any;
  timestamp: string;
}

interface SyncNotification {
  type: 'sync-completed' | 'sync-error';
  message: string;
  event: {
    type: string;
    action: string;
    scope: string;
  };
  results?: {
    total: number;
    successful: number;
    failed: number;
  };
  error?: {
    message: string;
    code: string;
  };
  timestamp: string;
}

interface UseRealtimeSyncOptions {
  enabled?: boolean;
  configTypes?: string[];
  onConfigUpdate?: (update: RealtimeUpdate) => void;
  onModuleChange?: (update: RealtimeUpdate) => void;
  onAuthChange?: (update: RealtimeUpdate) => void;
  onRbacChange?: (update: RealtimeUpdate) => void;
  onNotificationChange?: (update: RealtimeUpdate) => void;
  onSyncNotification?: (notification: SyncNotification) => void;
  autoInvalidateQueries?: boolean;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const {
    enabled = true,
    configTypes = ['auth', 'rbac', 'notifications', 'modules'],
    onConfigUpdate,
    onModuleChange,
    onAuthChange,
    onRbacChange,
    onNotificationChange,
    onSyncNotification,
    autoInvalidateQueries = true
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!enabled || socketRef.current?.connected) return;

    const token = localStorage.getItem('tenant_token');
    if (!token) {
      console.warn('No authentication token found for real-time sync');
      return;
    }

    // Create socket connection
    const socket = io(process.env.VITE_SERVER_URL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('🔄 Real-time sync connected');
      
      // Subscribe to configuration types
      if (configTypes.length > 0) {
        socket.emit('subscribe-config', configTypes);
      }
    });

    socket.on('connected', (data) => {
      console.log('📡 Real-time sync established:', data);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Real-time sync disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Real-time sync connection error:', error.message);
    });

    // Configuration update handlers
    socket.on('config-updated', (update: RealtimeUpdate) => {
      console.log('🔄 Configuration update received:', update);
      
      // Call specific handler based on update type
      switch (update.type) {
        case 'config-update':
          onConfigUpdate?.(update);
          break;
        case 'module-change':
          onModuleChange?.(update);
          break;
        case 'auth-change':
          onAuthChange?.(update);
          break;
        case 'rbac-change':
          onRbacChange?.(update);
          break;
        case 'notification-change':
          onNotificationChange?.(update);
          break;
      }

      // Auto-invalidate relevant queries
      if (autoInvalidateQueries) {
        invalidateRelevantQueries(update);
      }

      // Show user notification
      showUpdateNotification(update);
    });

    // Module change handlers
    socket.on('module-changed', (update: RealtimeUpdate) => {
      console.log('📦 Module change received:', update);
      onModuleChange?.(update);
      
      if (autoInvalidateQueries) {
        // Invalidate module-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
        queryClient.invalidateQueries({ queryKey: ['modules'] });
      }

      toast({
        title: "Module Updated",
        description: `${update.data.moduleId} has been ${update.data.action}`,
        variant: update.data.action === 'enabled' ? 'default' : 'destructive'
      });
    });

    // Auth change handlers
    socket.on('auth-changed', (update: RealtimeUpdate) => {
      console.log('🔐 Auth configuration changed:', update);
      onAuthChange?.(update);
      
      if (autoInvalidateQueries) {
        // Invalidate auth-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
        queryClient.invalidateQueries({ queryKey: ['auth-providers'] });
      }

      if (update.data.changeType === 'provider-config-changed') {
        toast({
          title: "Authentication Updated",
          description: "Login provider configuration has been updated",
        });
      }
    });

    // Re-authentication required handler
    socket.on('reauth-required', (data) => {
      console.warn('🔒 Re-authentication required:', data);
      
      toast({
        title: "Re-authentication Required",
        description: data.message,
        variant: "destructive",
        duration: 10000
      });

      // Optionally redirect to login after grace period
      setTimeout(() => {
        const currentUrl = window.location.pathname;
        if (!currentUrl.includes('/login')) {
          // Store current location for redirect after login
          sessionStorage.setItem('redirect_after_login', currentUrl);
          window.location.href = window.location.pathname.replace(/\/dashboard.*/, '/login');
        }
      }, data.gracePeriod * 1000);
    });

    // RBAC change handlers
    socket.on('rbac-changed', (update: RealtimeUpdate) => {
      console.log('🛡️ RBAC configuration changed:', update);
      onRbacChange?.(update);
      
      if (autoInvalidateQueries) {
        // Invalidate RBAC-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
        queryClient.invalidateQueries({ queryKey: ['roles'] });
        queryClient.invalidateQueries({ queryKey: ['permissions'] });
      }
    });

    socket.on('permissions-changed', (data) => {
      console.log('👤 User permissions changed:', data);
      
      toast({
        title: "Permissions Updated",
        description: data.message,
        duration: 5000
      });

      // Refresh current user data
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      
      // Optionally refresh the page to apply new permissions
      if (data.effectiveImmediately) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    });

    // Notification change handlers
    socket.on('notification-config-changed', (update: RealtimeUpdate) => {
      console.log('📧 Notification configuration changed:', update);
      onNotificationChange?.(update);
      
      if (autoInvalidateQueries) {
        // Invalidate notification-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/v2/user/notification-preferences'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/notification-configs'] });
      }
    });

    // Sync notification handlers
    socket.on('sync-notification', (notification: SyncNotification) => {
      console.log('🔄 Sync notification:', notification);
      onSyncNotification?.(notification);
      
      if (notification.type === 'sync-completed' && notification.results) {
        const { successful, failed, total } = notification.results;
        if (failed > 0) {
          toast({
            title: "Partial Sync Completed",
            description: `${successful}/${total} configurations updated successfully`,
            variant: "destructive"
          });
        }
      }
    });

    socket.on('sync-error', (notification: SyncNotification) => {
      console.error('❌ Sync error:', notification);
      onSyncNotification?.(notification);
      
      toast({
        title: "Configuration Sync Failed",
        description: notification.error?.message || "Unknown sync error occurred",
        variant: "destructive"
      });
    });

    // UI refresh handler
    socket.on('refresh-ui', (data) => {
      console.log('🔄 UI refresh requested:', data);
      
      // Invalidate all queries to force UI refresh
      queryClient.invalidateQueries();
      
      toast({
        title: "Interface Updated",
        description: data.reason,
        duration: 3000
      });
    });

    // Direct notifications
    socket.on('direct-notification', (notification) => {
      console.log('📨 Direct notification received:', notification);
      
      toast({
        title: notification.title || "Notification",
        description: notification.message,
        variant: notification.variant || "default",
        duration: notification.duration || 5000
      });
    });

    // Server shutdown handler
    socket.on('server-shutdown', (data) => {
      console.warn('🛑 Server shutdown notification:', data);
      
      toast({
        title: "Server Maintenance",
        description: data.message,
        variant: "destructive",
        duration: 10000
      });

      // Auto-reconnect after specified delay
      setTimeout(() => {
        socket.connect();
      }, data.reconnectIn);
    });

    // Send periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      }
    }, 30000);

    // Store interval reference for cleanup
    (socket as any).heartbeatInterval = heartbeatInterval;

  }, [enabled, configTypes, onConfigUpdate, onModuleChange, onAuthChange, onRbacChange, onNotificationChange, onSyncNotification, autoInvalidateQueries, queryClient, toast]);

  // Helper function to invalidate relevant queries based on update type
  const invalidateRelevantQueries = useCallback((update: RealtimeUpdate) => {
    const module = update.data.module;
    
    switch (module) {
      case 'auth':
        queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
        queryClient.invalidateQueries({ queryKey: ['auth'] });
        break;
      
      case 'rbac':
        queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
        queryClient.invalidateQueries({ queryKey: ['roles'] });
        queryClient.invalidateQueries({ queryKey: ['permissions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/rbac-config'] });
        break;
      
      case 'notifications':
        queryClient.invalidateQueries({ queryKey: ['/api/v2/user/notification-preferences'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/notification-configs'] });
        break;
      
      default:
        // General tenant data invalidation
        queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
    }
  }, [queryClient]);

  // Helper function to show user-friendly update notifications
  const showUpdateNotification = useCallback((update: RealtimeUpdate) => {
    const module = update.data.module;
    const action = update.data.action;
    
    let title = "Configuration Updated";
    let description = `${module} configuration has been ${action}d`;
    
    switch (module) {
      case 'auth':
        title = "Authentication Updated";
        description = "Login and security settings have been updated";
        break;
      
      case 'rbac':
        title = "Permissions Updated";
        description = "Role and permission settings have been updated";
        break;
      
      case 'notifications':
        title = "Notifications Updated";
        description = "Notification settings have been updated";
        break;
    }

    // Only show toast for significant changes that affect the user
    if (!['create', 'update', 'enable'].includes(action)) return;

    toast({
      title,
      description,
      duration: 4000
    });
  }, [toast]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (socketRef.current) {
      // Clear heartbeat interval
      if ((socketRef.current as any).heartbeatInterval) {
        clearInterval((socketRef.current as any).heartbeatInterval);
      }
      
      // Unsubscribe from config types
      if (configTypes.length > 0) {
        socketRef.current.emit('unsubscribe-config', configTypes);
      }
      
      // Disconnect socket
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [configTypes]);

  // Initialize socket on mount
  useEffect(() => {
    initializeSocket();
    
    return cleanup;
  }, [initializeSocket, cleanup]);

  // Reinitialize when enabled state changes
  useEffect(() => {
    if (enabled) {
      initializeSocket();
    } else {
      cleanup();
    }
  }, [enabled, initializeSocket, cleanup]);

  // Manual reconnection function
  const reconnect = useCallback(() => {
    cleanup();
    setTimeout(initializeSocket, 1000);
  }, [cleanup, initializeSocket]);

  // Get connection status
  const isConnected = socketRef.current?.connected || false;

  return {
    isConnected,
    reconnect,
    socket: socketRef.current
  };
}
