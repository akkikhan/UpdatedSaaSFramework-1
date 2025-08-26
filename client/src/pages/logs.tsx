import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Filter, Download, Clock, Mail, Settings, User } from "lucide-react";
import { format } from "date-fns";

interface SystemLog {
  id: string;
  tenantId: string | null;
  adminUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  tenantName: string | null;
}

interface EmailLog {
  id: string;
  tenantId: string | null;
  recipientEmail: string;
  subject: string;
  templateType: string;
  status: string;
  sentAt: string;
  errorMessage: string | null;
  tenantName: string | null;
}

export default function LogsPage() {
  const [systemFilters, setSystemFilters] = useState({
    tenantId: "",
    action: "",
    limit: 50,
    offset: 0
  });

  const [emailFilters, setEmailFilters] = useState({
    tenantId: "",
    status: "",
    limit: 50,
    offset: 0
  });

  // System logs query
  const systemLogsQuery = useQuery({
    queryKey: ["/api/logs/system", systemFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (systemFilters.tenantId) params.append("tenantId", systemFilters.tenantId);
      if (systemFilters.action) params.append("action", systemFilters.action);
      params.append("limit", systemFilters.limit.toString());
      params.append("offset", systemFilters.offset.toString());
      
      const response = await fetch(`/api/logs/system?${params}`);
      if (!response.ok) throw new Error("Failed to fetch system logs");
      return response.json() as Promise<SystemLog[]>;
    }
  });

  // Email logs query
  const emailLogsQuery = useQuery({
    queryKey: ["/api/logs/email", emailFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (emailFilters.tenantId) params.append("tenantId", emailFilters.tenantId);
      if (emailFilters.status) params.append("status", emailFilters.status);
      params.append("limit", emailFilters.limit.toString());
      params.append("offset", emailFilters.offset.toString());
      
      const response = await fetch(`/api/logs/email?${params}`);
      if (!response.ok) throw new Error("Failed to fetch email logs");
      return response.json() as Promise<EmailLog[]>;
    }
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'modules_updated':
        return <Settings className="h-4 w-4" />;
      case 'tenant_created':
        return <User className="h-4 w-4" />;
      case 'tenant_status_updated':
        return <Settings className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'modules_updated':
        return 'bg-blue-100 text-blue-800';
      case 'tenant_created':
        return 'bg-green-100 text-green-800';
      case 'tenant_status_updated':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">System Logs</h1>
        <p className="text-slate-600 mt-1">Monitor system activities and email delivery status</p>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system" data-testid="tab-system-logs">
            <Settings className="h-4 w-4 mr-2" />
            System Logs
          </TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email-logs">
            <Mail className="h-4 w-4 mr-2" />
            Email Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Activity Logs
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => systemLogsQuery.refetch()}
                    disabled={systemLogsQuery.isLoading}
                    data-testid="button-refresh-system"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${systemLogsQuery.isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-lg">
                <Filter className="h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Filter by tenant ID..."
                  value={systemFilters.tenantId}
                  onChange={(e) => setSystemFilters(prev => ({ ...prev, tenantId: e.target.value }))}
                  className="max-w-xs"
                  data-testid="input-system-tenant-filter"
                />
                <Select value={systemFilters.action} onValueChange={(value) => setSystemFilters(prev => ({ ...prev, action: value }))}>
                  <SelectTrigger className="max-w-xs" data-testid="select-system-action-filter">
                    <SelectValue placeholder="Filter by action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="modules_updated">Module Updates</SelectItem>
                    <SelectItem value="tenant_created">Tenant Created</SelectItem>
                    <SelectItem value="tenant_status_updated">Status Updates</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* System Logs List */}
              <div className="space-y-3">
                {systemLogsQuery.isLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading system logs...</div>
                ) : systemLogsQuery.data?.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No system logs found</div>
                ) : (
                  systemLogsQuery.data?.map((log) => (
                    <Card key={log.id} className="border-l-4 border-l-blue-400" data-testid={`system-log-${log.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                              {getActionIcon(log.action)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {log.action.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {log.entityType}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-800">
                                <span className="font-medium">{log.tenantName || 'System'}</span>
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <span className="text-slate-600 ml-2">
                                    {JSON.stringify(log.details, null, 0)}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                                {log.ipAddress && (
                                  <span className="ml-2">IP: {log.ipAddress}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Delivery Logs
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => emailLogsQuery.refetch()}
                    disabled={emailLogsQuery.isLoading}
                    data-testid="button-refresh-email"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${emailLogsQuery.isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-lg">
                <Filter className="h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Filter by tenant ID..."
                  value={emailFilters.tenantId}
                  onChange={(e) => setEmailFilters(prev => ({ ...prev, tenantId: e.target.value }))}
                  className="max-w-xs"
                  data-testid="input-email-tenant-filter"
                />
                <Select value={emailFilters.status} onValueChange={(value) => setEmailFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="max-w-xs" data-testid="select-email-status-filter">
                    <SelectValue placeholder="Filter by status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email Logs List */}
              <div className="space-y-3">
                {emailLogsQuery.isLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading email logs...</div>
                ) : emailLogsQuery.data?.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No email logs found</div>
                ) : (
                  emailLogsQuery.data?.map((log) => (
                    <Card key={log.id} className="border-l-4 border-l-indigo-400" data-testid={`email-log-${log.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                              <Mail className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(log.status)}>
                                  {log.status.toUpperCase()}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {log.templateType}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-800">
                                <span className="font-medium">{log.subject}</span>
                              </p>
                              <p className="text-sm text-slate-600">
                                To: {log.recipientEmail}
                                {log.tenantName && ` (${log.tenantName})`}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                {format(new Date(log.sentAt), 'MMM d, yyyy h:mm a')}
                              </div>
                              {log.errorMessage && (
                                <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                  Error: {log.errorMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}