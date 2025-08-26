import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Server, 
  Database, 
  HardDrive, 
  Shield, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Monitor,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SystemHealth {
  overall: string;
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  criticalIssues: number;
}

interface ServiceStatus {
  id: string;
  name: string;
  serviceType: string;
  isCritical: boolean;
  isActive: boolean;
  latestStatus: 'healthy' | 'unhealthy' | 'unknown';
  latestCheck: string;
  avgResponseTime: number;
}

interface BackupJob {
  id: string;
  configurationName: string;
  jobType: string;
  status: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  size: number;
  recordCount: number;
  errorMessage: string;
  createdAt: string;
}

export default function InfrastructureDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [backupForm, setBackupForm] = useState({
    name: "",
    backupType: "full",
    schedule: "0 2 * * *",
    retentionPolicy: { daily: 7, weekly: 4, monthly: 12, yearly: 2 },
    destinations: [{ type: "local", config: { path: "/backups" }, isDefault: true }]
  });

  // Get infrastructure dashboard data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/v2/admin/infrastructure-dashboard"],
    queryFn: async () => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/admin/infrastructure-dashboard", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch infrastructure dashboard");
      }
      
      return response.json() as Promise<{
        systemHealth: SystemHealth;
        services: ServiceStatus[];
      }>;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get backup jobs
  const { data: backupJobs, isLoading: backupJobsLoading } = useQuery({
    queryKey: ["/api/v2/admin/backup-jobs"],
    queryFn: async () => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/admin/backup-jobs?limit=10", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch backup jobs");
      }
      
      return response.json() as Promise<BackupJob[]>;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Get backup configurations
  const { data: backupConfigs } = useQuery({
    queryKey: ["/api/v2/admin/backup-configs"],
    queryFn: async () => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/admin/backup-configs", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch backup configurations");
      }
      
      return response.json();
    },
  });

  // Create backup configuration
  const createBackupConfig = useMutation({
    mutationFn: async (config: typeof backupForm) => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/admin/backup-configs", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create backup configuration");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/admin/backup-configs"] });
      setShowBackupDialog(false);
      setBackupForm({
        name: "",
        backupType: "full",
        schedule: "0 2 * * *",
        retentionPolicy: { daily: 7, weekly: 4, monthly: 12, yearly: 2 },
        destinations: [{ type: "local", config: { path: "/backups" }, isDefault: true }]
      });
      toast({
        title: "Backup Configuration Created",
        description: "Backup has been scheduled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Configuration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start manual backup
  const startBackup = useMutation({
    mutationFn: async (configurationId: string) => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/admin/backup-jobs", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configurationId, jobType: 'manual' }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to start backup");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/admin/backup-jobs"] });
      toast({
        title: "Backup Started",
        description: "Manual backup has been initiated",
      });
    },
    onError: (error) => {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'database':
        return <Database className="h-5 w-5" />;
      case 'api':
        return <Server className="h-5 w-5" />;
      case 'storage':
        return <HardDrive className="h-5 w-5" />;
      case 'cache':
        return <Zap className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getBackupStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (dashboardLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Infrastructure Dashboard</h1>
          <p className="text-slate-600 mt-1">Loading system status...</p>
        </div>
      </div>
    );
  }

  const systemHealth = dashboard?.systemHealth;
  const services = dashboard?.services || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Infrastructure Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Monitor system health, manage backups, and ensure business continuity
        </p>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{systemHealth.overall}%</div>
              <Progress value={parseFloat(systemHealth.overall)} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Services</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.totalServices}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Healthy Services</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{systemHealth.healthyServices}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{systemHealth.unhealthyServices}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{systemHealth.criticalIssues}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="services" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services" data-testid="tab-services">
            <Activity className="h-4 w-4 mr-2" />
            Services
          </TabsTrigger>
          <TabsTrigger value="backups" data-testid="tab-backups">
            <HardDrive className="h-4 w-4 mr-2" />
            Backups
          </TabsTrigger>
          <TabsTrigger value="monitoring" data-testid="tab-monitoring">
            <Monitor className="h-4 w-4 mr-2" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">
            <Settings className="h-4 w-4 mr-2" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        {/* Services Status */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Infrastructure Services</CardTitle>
              <CardDescription>
                Real-time status of all monitored services and dependencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        {getServiceIcon(service.serviceType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{service.name}</span>
                          {service.isCritical && (
                            <Badge variant="destructive" className="text-xs">Critical</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">
                          {service.serviceType} Service
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(service.latestStatus)}
                          <span className="text-sm font-medium capitalize">
                            {service.latestStatus}
                          </span>
                        </div>
                        {service.avgResponseTime && (
                          <p className="text-xs text-muted-foreground">
                            Avg: {service.avgResponseTime.toFixed(0)}ms
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Last check: {service.latestCheck ? 
                            format(new Date(service.latestCheck), 'HH:mm:ss') : 
                            'Never'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {services.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No services configured for monitoring</p>
                    <Button className="mt-2" onClick={() => setShowServiceDialog(true)}>
                      Add Service
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Management */}
        <TabsContent value="backups" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Backup Management</CardTitle>
                  <CardDescription>
                    Configure automated backups and monitor backup job status
                  </CardDescription>
                </div>
                <Button onClick={() => setShowBackupDialog(true)}>
                  <HardDrive className="h-4 w-4 mr-2" />
                  New Backup Config
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Backup Configurations */}
              <div className="space-y-4 mb-6">
                <h3 className="font-medium">Active Configurations</h3>
                {backupConfigs?.map((config: any) => (
                  <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{config.name}</span>
                      <p className="text-sm text-muted-foreground">
                        {config.backupType} backup • {config.schedule}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={config.isActive ? "default" : "secondary"}>
                        {config.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => startBackup.mutate(config.id)}
                        disabled={startBackup.isPending}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Backup Jobs */}
              <div className="space-y-4">
                <h3 className="font-medium">Recent Backup Jobs</h3>
                {backupJobsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading backup jobs...
                  </div>
                ) : backupJobs && backupJobs.length > 0 ? (
                  <div className="space-y-3">
                    {backupJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <HardDrive className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <span className="font-medium">{job.configurationName}</span>
                            <p className="text-sm text-muted-foreground">
                              {job.jobType} backup • {format(new Date(job.createdAt), 'MMM d, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {job.size && (
                              <p className="text-sm font-medium">{formatBytes(job.size)}</p>
                            )}
                            {job.duration && (
                              <p className="text-xs text-muted-foreground">
                                {formatDuration(job.duration)}
                              </p>
                            )}
                          </div>
                          
                          <Badge className={getBackupStatusColor(job.status)}>
                            {job.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No backup jobs found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
              <CardDescription>
                Performance metrics and alert configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Advanced monitoring features coming soon</p>
                <p className="text-sm">Real-time metrics, alerting, and performance analysis</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Windows</CardTitle>
              <CardDescription>
                Schedule and manage system maintenance activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming maintenance windows</p>
                <Button className="mt-2" variant="outline">
                  Schedule Maintenance
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Backup Configuration Dialog */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Backup Configuration</DialogTitle>
            <DialogDescription>
              Set up automated backups for your data protection strategy
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="backup-name">Backup Name</Label>
              <Input
                id="backup-name"
                placeholder="Daily Full Backup"
                value={backupForm.name}
                onChange={(e) => setBackupForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="backup-type">Backup Type</Label>
              <Select
                value={backupForm.backupType}
                onValueChange={(value) => setBackupForm(prev => ({ ...prev, backupType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Backup</SelectItem>
                  <SelectItem value="incremental">Incremental Backup</SelectItem>
                  <SelectItem value="differential">Differential Backup</SelectItem>
                  <SelectItem value="schema_only">Schema Only</SelectItem>
                  <SelectItem value="data_only">Data Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="schedule">Schedule (Cron Expression)</Label>
              <Input
                id="schedule"
                placeholder="0 2 * * *"
                value={backupForm.schedule}
                onChange={(e) => setBackupForm(prev => ({ ...prev, schedule: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Daily at 2 AM: 0 2 * * * | Weekly: 0 2 * * 0 | Monthly: 0 2 1 * *
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowBackupDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createBackupConfig.mutate(backupForm)}
                disabled={createBackupConfig.isPending || !backupForm.name}
                className="flex-1"
              >
                {createBackupConfig.isPending ? "Creating..." : "Create Backup"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
