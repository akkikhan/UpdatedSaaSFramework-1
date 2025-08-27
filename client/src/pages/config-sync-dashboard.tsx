import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  Bell,
  Building,
  CheckCircle,
  Clock,
  Eye,
  Globe,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  Users,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ConfigSyncStatus {
  tenantId: string;
  tenantName: string;
  orgId: string;
  lastSyncAt: string;
  syncStatus: 'success' | 'partial' | 'failed' | 'pending';
  configModules: {
    auth: { status: string; lastUpdated: string; version: string };
    rbac: { status: string; lastUpdated: string; version: string };
    notifications: { status: string; lastUpdated: string; version: string };
    modules: { status: string; lastUpdated: string; version: string };
  };
  conflicts: number;
  pendingChanges: number;
}

interface SyncEvent {
  id: string;
  type: string;
  action: string;
  scope: string;
  targetId?: string;
  targetName?: string;
  timestamp: string;
  triggeredBy: string;
  status: 'pending' | 'success' | 'failed';
  affectedTenants: number;
  successCount: number;
  failureCount: number;
  duration?: number;
  errorMessage?: string;
}

interface RealtimeConnectionStats {
  total: number;
  active: number;
  byRole: Record<string, number>;
  byTenant: Record<string, number>;
}

export default function ConfigSyncDashboard() {
  const { toast } = useToast();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [connectionStats, setConnectionStats] = useState<RealtimeConnectionStats | null>(null);

  // Initialize real-time sync monitoring
  const { isConnected, reconnect } = useRealtimeSync({
    enabled: true,
    configTypes: ['auth', 'rbac', 'notifications', 'modules'],
    onSyncNotification: notification => {
      // Add sync event to the list
      const newEvent: SyncEvent = {
        id: Date.now().toString(),
        type: notification.event.type,
        action: notification.event.action,
        scope: notification.event.scope,
        timestamp: notification.timestamp,
        triggeredBy: 'system',
        status: notification.type === 'sync-completed' ? 'success' : 'failed',
        affectedTenants: 0,
        successCount: notification.results?.successful || 0,
        failureCount: notification.results?.failed || 0,
        errorMessage: notification.error?.message
      };

      setSyncEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
    },
    autoInvalidateQueries: true
  });

  // Mock data for demonstration (in real implementation, this would come from API)
  const mockSyncStatus: ConfigSyncStatus[] = [
    {
      tenantId: '1',
      tenantName: 'Acme Corp',
      orgId: 'acme-corp',
      lastSyncAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      syncStatus: 'success',
      configModules: {
        auth: {
          status: 'synced',
          lastUpdated: new Date(Date.now() - 300000).toISOString(),
          version: '1.2.0'
        },
        rbac: {
          status: 'synced',
          lastUpdated: new Date(Date.now() - 300000).toISOString(),
          version: '1.1.0'
        },
        notifications: {
          status: 'synced',
          lastUpdated: new Date(Date.now() - 300000).toISOString(),
          version: '1.0.5'
        },
        modules: {
          status: 'synced',
          lastUpdated: new Date(Date.now() - 300000).toISOString(),
          version: '2.0.0'
        }
      },
      conflicts: 0,
      pendingChanges: 0
    },
    {
      tenantId: '2',
      tenantName: 'TechStart Inc',
      orgId: 'techstart',
      lastSyncAt: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
      syncStatus: 'partial',
      configModules: {
        auth: {
          status: 'synced',
          lastUpdated: new Date(Date.now() - 900000).toISOString(),
          version: '1.2.0'
        },
        rbac: {
          status: 'conflict',
          lastUpdated: new Date(Date.now() - 1800000).toISOString(),
          version: '1.0.8'
        },
        notifications: {
          status: 'synced',
          lastUpdated: new Date(Date.now() - 900000).toISOString(),
          version: '1.0.5'
        },
        modules: {
          status: 'pending',
          lastUpdated: new Date(Date.now() - 1800000).toISOString(),
          version: '1.9.0'
        }
      },
      conflicts: 1,
      pendingChanges: 2
    },
    {
      tenantId: '3',
      tenantName: 'Global Enterprises',
      orgId: 'global-ent',
      lastSyncAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      syncStatus: 'failed',
      configModules: {
        auth: {
          status: 'error',
          lastUpdated: new Date(Date.now() - 3600000).toISOString(),
          version: '1.1.5'
        },
        rbac: {
          status: 'outdated',
          lastUpdated: new Date(Date.now() - 7200000).toISOString(),
          version: '1.0.3'
        },
        notifications: {
          status: 'outdated',
          lastUpdated: new Date(Date.now() - 7200000).toISOString(),
          version: '1.0.2'
        },
        modules: {
          status: 'error',
          lastUpdated: new Date(Date.now() - 3600000).toISOString(),
          version: '1.8.0'
        }
      },
      conflicts: 3,
      pendingChanges: 5
    }
  ];

  // Calculate overall statistics
  const overallStats = {
    totalTenants: mockSyncStatus.length,
    healthyTenants: mockSyncStatus.filter(t => t.syncStatus === 'success').length,
    partialTenants: mockSyncStatus.filter(t => t.syncStatus === 'partial').length,
    failedTenants: mockSyncStatus.filter(t => t.syncStatus === 'failed').length,
    totalConflicts: mockSyncStatus.reduce((sum, t) => sum + t.conflicts, 0),
    totalPendingChanges: mockSyncStatus.reduce((sum, t) => sum + t.pendingChanges, 0),
    lastSyncTime: Math.max(...mockSyncStatus.map(t => new Date(t.lastSyncAt).getTime()))
  };

  const healthPercentage = Math.round(
    (overallStats.healthyTenants / overallStats.totalTenants) * 100
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'synced':
        return <CheckCircle className='h-4 w-4 text-green-600' />;
      case 'partial':
      case 'conflict':
        return <AlertTriangle className='h-4 w-4 text-yellow-600' />;
      case 'failed':
      case 'error':
        return <XCircle className='h-4 w-4 text-red-600' />;
      case 'pending':
        return <Clock className='h-4 w-4 text-blue-600' />;
      case 'outdated':
        return <RefreshCw className='h-4 w-4 text-gray-600' />;
      default:
        return <Activity className='h-4 w-4 text-gray-600' />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'auth':
        return <Shield className='h-4 w-4' />;
      case 'rbac':
        return <Users className='h-4 w-4' />;
      case 'notifications':
        return <Bell className='h-4 w-4' />;
      case 'modules':
        return <Settings className='h-4 w-4' />;
      default:
        return <Activity className='h-4 w-4' />;
    }
  };

  // Force sync for a specific tenant
  const forceSyncTenant = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/admin/sync/tenant/${tenantId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('tenant_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Sync Initiated',
          description: 'Configuration sync has been started for this tenant'
        });
      } else {
        throw new Error('Failed to initiate sync');
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to initiate configuration sync',
        variant: 'destructive'
      });
    }
  };

  // Force global sync
  const forceGlobalSync = async () => {
    try {
      const response = await fetch('/api/admin/sync/global', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('tenant_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Global Sync Initiated',
          description: 'Configuration sync has been started for all tenants'
        });
      } else {
        throw new Error('Failed to initiate global sync');
      }
    } catch (error) {
      toast({
        title: 'Global Sync Failed',
        description: 'Failed to initiate global configuration sync',
        variant: 'destructive'
      });
    }
  };

  // Mock connection stats update
  useEffect(() => {
    const updateStats = () => {
      setConnectionStats({
        total: 45,
        active: 38,
        byRole: {
          platform_admin: 3,
          tenant_admin: 12,
          user: 23
        },
        byTenant: {
          'acme-corp': 15,
          techstart: 8,
          'global-ent': 12,
          platform: 3
        }
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold text-slate-800'>Configuration Sync Dashboard</h1>
          <p className='text-slate-600 mt-1'>
            Monitor and manage configuration synchronization across all tenants
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2'>
            <div
              className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className='text-sm text-slate-600'>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {!isConnected && (
            <Button size='sm' variant='outline' onClick={reconnect}>
              <RefreshCw className='h-4 w-4 mr-2' />
              Reconnect
            </Button>
          )}

          <Button onClick={forceGlobalSync}>
            <RotateCcw className='h-4 w-4 mr-2' />
            Force Global Sync
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className='grid grid-cols-1 md:grid-cols-6 gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>System Health</CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>{healthPercentage}%</div>
            <Progress value={healthPercentage} className='mt-2' />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Tenants</CardTitle>
            <Building className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{overallStats.totalTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Healthy</CardTitle>
            <CheckCircle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>{overallStats.healthyTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Issues</CardTitle>
            <AlertTriangle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-yellow-600'>{overallStats.partialTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Failed</CardTitle>
            <XCircle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>{overallStats.failedTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Live Connections</CardTitle>
            <Globe className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>{connectionStats?.active || 0}</div>
            <p className='text-xs text-muted-foreground'>of {connectionStats?.total || 0} total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue='tenants' className='space-y-6'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='tenants'>
            <Building className='h-4 w-4 mr-2' />
            Tenant Status
          </TabsTrigger>
          <TabsTrigger value='events'>
            <Activity className='h-4 w-4 mr-2' />
            Sync Events
          </TabsTrigger>
          <TabsTrigger value='connections'>
            <Globe className='h-4 w-4 mr-2' />
            Live Connections
          </TabsTrigger>
          <TabsTrigger value='conflicts'>
            <AlertTriangle className='h-4 w-4 mr-2' />
            Conflicts
          </TabsTrigger>
        </TabsList>

        {/* Tenant Status */}
        <TabsContent value='tenants' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Tenant Configuration Status</CardTitle>
              <CardDescription>
                Real-time synchronization status for all tenant configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {mockSyncStatus.map(tenant => (
                  <div key={tenant.tenantId} className='border rounded-lg p-4'>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center gap-3'>
                        <div>
                          <h3 className='font-medium'>{tenant.tenantName}</h3>
                          <p className='text-sm text-muted-foreground'>{tenant.orgId}</p>
                        </div>
                      </div>

                      <div className='flex items-center gap-3'>
                        <Badge className={getStatusColor(tenant.syncStatus)}>
                          {tenant.syncStatus.toUpperCase()}
                        </Badge>

                        <span className='text-sm text-muted-foreground'>
                          {format(new Date(tenant.lastSyncAt), 'MMM d, HH:mm')}
                        </span>

                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => forceSyncTenant(tenant.tenantId)}
                        >
                          <RotateCcw className='h-3 w-3 mr-1' />
                          Sync
                        </Button>

                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() =>
                            setSelectedTenant(
                              selectedTenant === tenant.tenantId ? null : tenant.tenantId
                            )
                          }
                        >
                          <Eye className='h-3 w-3 mr-1' />
                          Details
                        </Button>
                      </div>
                    </div>

                    {/* Module Status */}
                    <div className='grid grid-cols-4 gap-4 mb-3'>
                      {Object.entries(tenant.configModules).map(([module, config]) => (
                        <div
                          key={module}
                          className='flex items-center gap-2 p-2 bg-slate-50 rounded'
                        >
                          {getModuleIcon(module)}
                          <div className='flex-1'>
                            <div className='text-xs font-medium capitalize'>{module}</div>
                            <div className='flex items-center gap-1'>
                              {getStatusIcon(config.status)}
                              <span className='text-xs'>{config.status}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Expanded Details */}
                    {selectedTenant === tenant.tenantId && (
                      <div className='mt-4 p-4 bg-slate-50 rounded-lg'>
                        <h4 className='font-medium mb-3'>Configuration Details</h4>
                        <div className='grid grid-cols-2 gap-4'>
                          <div>
                            <h5 className='text-sm font-medium mb-2'>Module Versions</h5>
                            {Object.entries(tenant.configModules).map(([module, config]) => (
                              <div key={module} className='flex justify-between text-sm'>
                                <span className='capitalize'>{module}:</span>
                                <span className='font-mono'>{config.version}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <h5 className='text-sm font-medium mb-2'>Sync Information</h5>
                            <div className='space-y-1 text-sm'>
                              <div className='flex justify-between'>
                                <span>Conflicts:</span>
                                <span className='font-medium text-red-600'>{tenant.conflicts}</span>
                              </div>
                              <div className='flex justify-between'>
                                <span>Pending Changes:</span>
                                <span className='font-medium text-blue-600'>
                                  {tenant.pendingChanges}
                                </span>
                              </div>
                              <div className='flex justify-between'>
                                <span>Last Sync:</span>
                                <span>
                                  {format(new Date(tenant.lastSyncAt), 'MMM d, yyyy HH:mm:ss')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Events */}
        <TabsContent value='events' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Events</CardTitle>
              <CardDescription>
                Real-time log of configuration synchronization events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {syncEvents.length > 0 ? (
                  syncEvents.map(event => (
                    <div
                      key={event.id}
                      className='flex items-center justify-between p-3 border rounded-lg'
                    >
                      <div className='flex items-center gap-3'>
                        {getStatusIcon(event.status)}
                        <div>
                          <div className='font-medium'>
                            {event.type}.{event.action} ({event.scope})
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            {event.targetName ? `Target: ${event.targetName}` : 'System-wide'} •
                            Triggered by {event.triggeredBy}
                          </div>
                        </div>
                      </div>

                      <div className='text-right'>
                        <div className='text-sm'>
                          {event.successCount > 0 && (
                            <span className='text-green-600'>{event.successCount} success</span>
                          )}
                          {event.failureCount > 0 && (
                            <span className='text-red-600 ml-2'>{event.failureCount} failed</span>
                          )}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {format(new Date(event.timestamp), 'HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-8 text-muted-foreground'>
                    <Activity className='h-12 w-12 mx-auto mb-4 opacity-50' />
                    <p>No sync events recorded yet</p>
                    <p className='text-sm'>
                      Events will appear here as configurations are synchronized
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Connections */}
        <TabsContent value='connections' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Real-time Connections</CardTitle>
              <CardDescription>
                Live WebSocket connections for real-time configuration updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectionStats ? (
                <div className='grid grid-cols-2 gap-6'>
                  <div>
                    <h4 className='font-medium mb-3'>Connections by Role</h4>
                    <div className='space-y-2'>
                      {Object.entries(connectionStats.byRole).map(([role, count]) => (
                        <div key={role} className='flex justify-between'>
                          <span className='capitalize'>{role.replace('_', ' ')}:</span>
                          <span className='font-medium'>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className='font-medium mb-3'>Connections by Tenant</h4>
                    <div className='space-y-2'>
                      {Object.entries(connectionStats.byTenant).map(([tenant, count]) => (
                        <div key={tenant} className='flex justify-between'>
                          <span className='capitalize'>{tenant}:</span>
                          <span className='font-medium'>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  Loading connection statistics...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflicts */}
        <TabsContent value='conflicts' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Configuration Conflicts</CardTitle>
              <CardDescription>
                Resolve conflicts between platform and tenant configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-center py-8 text-muted-foreground'>
                <AlertTriangle className='h-12 w-12 mx-auto mb-4 opacity-50' />
                <p>No configuration conflicts detected</p>
                <p className='text-sm'>
                  Conflicts will appear here when platform and tenant configurations diverge
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
// eof
