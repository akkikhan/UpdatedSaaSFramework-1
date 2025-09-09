import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Filter, Download, Clock, Mail, Settings, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";

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
    state: "",
    limit: 50,
    offset: 0,
  });

  const [emailFilters, setEmailFilters] = useState({
    tenantId: "",
    status: "",
    limit: 50,
    offset: 0,
  });

  // Tenant Event Logs
  const [tenantEventFilters, setTenantEventFilters] = useState({
    tenantId: "",
    level: "all",
    category: "",
    limit: 50,
    offset: 0,
  });

  const tenantsQuery = useQuery({
    queryKey: ["/api/tenants"],
    queryFn: api.getTenants,
  });

  const tenantEventsQuery = useQuery({
    queryKey: ["/api/admin/logging/events", tenantEventFilters],
    enabled: !!tenantEventFilters.tenantId,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("tenantId", tenantEventFilters.tenantId);
      if (tenantEventFilters.level && tenantEventFilters.level !== "all")
        params.set("level", tenantEventFilters.level);
      if (tenantEventFilters.category) params.set("category", tenantEventFilters.category);
      params.set("limit", String(tenantEventFilters.limit));
      params.set("offset", String(tenantEventFilters.offset));
      const res = await apiRequest("GET", `/api/admin/logging/events?${params.toString()}`);
      return res.json() as Promise<Array<any>>;
    },
  });

  // System logs query
  const systemLogsQuery = useQuery({
    queryKey: ["/api/logs/system", systemFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (systemFilters.tenantId) params.append("tenantId", systemFilters.tenantId);
      if (systemFilters.action && systemFilters.action !== "all")
        params.append("action", systemFilters.action);
      if (systemFilters.state) params.append("state", systemFilters.state);
      params.append("limit", systemFilters.limit.toString());
      params.append("offset", systemFilters.offset.toString());

      const response = await apiRequest("GET", `/api/logs/system?${params.toString()}`);
      return response.json() as Promise<SystemLog[]>;
    },
  });

  // Email logs query
  const emailLogsQuery = useQuery({
    queryKey: ["/api/logs/email", emailFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (emailFilters.tenantId) params.append("tenantId", emailFilters.tenantId);
      if (emailFilters.status && emailFilters.status !== "all")
        params.append("status", emailFilters.status);
      params.append("limit", emailFilters.limit.toString());
      params.append("offset", emailFilters.offset.toString());

      const response = await apiRequest("GET", `/api/logs/email?${params.toString()}`);
      return response.json() as Promise<EmailLog[]>;
    },
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "modules_updated":
        return <Settings className="h-4 w-4" />;
      case "tenant_created":
        return <User className="h-4 w-4" />;
      case "tenant_status_updated":
        return <Settings className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "modules_updated":
        return "bg-blue-100 text-blue-800";
      case "tenant_created":
        return "bg-green-100 text-green-800";
      case "tenant_status_updated":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="aspire-page-container">
      {/* Aspire Page Header */}
      <div className="aspire-page-header">
        <div className="aspire-header-content">
          <div className="aspire-header-text">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="aspire-page-title">System Logs</h1>
                <p className="aspire-page-subtitle">
                  Monitor system activities and email delivery status
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="aspire-content-wrapper">
        <div className="aspire-main-card">
          <Tabs defaultValue="system" className="space-y-6">
            <TabsList className="aspire-tabs-list">
              <TabsTrigger
                value="system"
                data-testid="tab-system-logs"
                className="aspire-tab-trigger"
              >
                <Settings className="h-4 w-4 mr-2" />
                System Logs
              </TabsTrigger>
              <TabsTrigger
                value="email"
                data-testid="tab-email-logs"
                className="aspire-tab-trigger"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Logs
              </TabsTrigger>
              <TabsTrigger
                value="tenant-events"
                data-testid="tab-tenant-events"
                className="aspire-tab-trigger"
              >
                <FileText className="h-4 w-4 mr-2" />
                Tenant Events
              </TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="space-y-6">
              <Card className="aspire-card">
                <CardHeader className="aspire-card-header">
                  <div className="flex items-center justify-between">
                    <CardTitle className="aspire-card-title">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Settings className="h-4 w-4 text-white" />
                        </div>
                        System Activity Logs
                      </div>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => systemLogsQuery.refetch()}
                        disabled={systemLogsQuery.isLoading}
                        data-testid="button-refresh-system"
                        className="aspire-button-outline"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${systemLogsQuery.isLoading ? "animate-spin" : ""}`}
                        />
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
                      onChange={e =>
                        setSystemFilters(prev => ({ ...prev, tenantId: e.target.value }))
                      }
                      className="max-w-xs"
                      data-testid="input-system-tenant-filter"
                    />
                    <Select
                      value={systemFilters.action}
                      onValueChange={value =>
                        setSystemFilters(prev => ({ ...prev, action: value }))
                      }
                    >
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
                    <Input
                      placeholder="Filter by state..."
                      value={systemFilters.state}
                      onChange={e => setSystemFilters(prev => ({ ...prev, state: e.target.value }))}
                      className="max-w-xs"
                      data-testid="input-system-state-filter"
                    />
                  </div>

                  {/* System Logs List */}
                  <div className="space-y-3">
                    {systemLogsQuery.isLoading ? (
                      <div className="text-center py-8 text-slate-500">Loading system logs...</div>
                    ) : systemLogsQuery.data?.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">No system logs found</div>
                    ) : (
                      systemLogsQuery.data?.map(log => (
                        <Card
                          key={log.id}
                          className="border-l-4 border-l-blue-400"
                          data-testid={`system-log-${log.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                                  {getActionIcon(log.action)}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {log.action.replace("_", " ").toUpperCase()}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {log.entityType}
                                    </Badge>
                                    {log.details?.state && (
                                      <Badge className="text-xs" variant="secondary">
                                        {log.details.state}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-800">
                                    <span className="font-medium">
                                      {log.tenantName || "System"}
                                    </span>
                                    {log.details && Object.keys(log.details).length > 0 && (
                                      <span className="text-slate-600 ml-2">
                                        {JSON.stringify(log.details, null, 0)}
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}
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
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${emailLogsQuery.isLoading ? "animate-spin" : ""}`}
                        />
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
                      onChange={e =>
                        setEmailFilters(prev => ({ ...prev, tenantId: e.target.value }))
                      }
                      className="max-w-xs"
                      data-testid="input-email-tenant-filter"
                    />
                    <Select
                      value={emailFilters.status}
                      onValueChange={value => setEmailFilters(prev => ({ ...prev, status: value }))}
                    >
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
                      emailLogsQuery.data?.map(log => (
                        <Card
                          key={log.id}
                          className="border-l-4 border-l-indigo-400"
                          data-testid={`email-log-${log.id}`}
                        >
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
                                    {format(new Date(log.sentAt), "MMM d, yyyy h:mm a")}
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

            <TabsContent value="tenant-events" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Tenant Event Logs
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => tenantEventsQuery.refetch()}
                        disabled={tenantEventsQuery.isLoading}
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${tenantEventsQuery.isLoading ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg items-end">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Tenant</label>
                      <Select
                        value={tenantEventFilters.tenantId}
                        onValueChange={v =>
                          setTenantEventFilters(prev => ({ ...prev, tenantId: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tenant" />
                        </SelectTrigger>
                        <SelectContent>
                          {(tenantsQuery.data || []).map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({t.orgId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Level</label>
                      <Select
                        value={tenantEventFilters.level}
                        onValueChange={v => setTenantEventFilters(prev => ({ ...prev, level: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="debug">Debug</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Category</label>
                      <Input
                        placeholder="e.g., application"
                        value={tenantEventFilters.category}
                        onChange={e =>
                          setTenantEventFilters(prev => ({ ...prev, category: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Button onClick={() => tenantEventsQuery.refetch()} className="w-full">
                        Apply
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="text-left p-2">Time</th>
                          <th className="text-left p-2">Level</th>
                          <th className="text-left p-2">Category</th>
                          <th className="text-left p-2">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenantEventsQuery.isLoading ? (
                          <tr>
                            <td colSpan={4} className="p-3 text-center text-slate-500">
                              Loading...
                            </td>
                          </tr>
                        ) : (tenantEventsQuery.data || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-3 text-center text-slate-500">
                              No events
                            </td>
                          </tr>
                        ) : (
                          (tenantEventsQuery.data || []).map((row: any) => (
                            <tr key={row.id || row.timestamp} className="border-t">
                              <td className="p-2 whitespace-nowrap">
                                {new Date(row.timestamp || row.time || Date.now()).toLocaleString()}
                              </td>
                              <td className="p-2">
                                <Badge variant="secondary" className="text-xs">
                                  {(row.level && String(row.level).split(":")[0]) ||
                                    row.message?.level ||
                                    "info"}
                                </Badge>
                              </td>
                              <td className="p-2">
                                {row.eventType || row.message?.category || "application"}
                              </td>
                              <td className="p-2">
                                {row.message?.message ? (
                                  row.message.message
                                ) : typeof row.message === "string" ? (
                                  row.message
                                ) : (
                                  <code className="text-xs bg-slate-50 border px-1 py-0.5 rounded">
                                    {JSON.stringify(row.message)}
                                  </code>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
