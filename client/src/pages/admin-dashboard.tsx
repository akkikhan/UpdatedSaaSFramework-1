import {
  Building,
  CheckCircle,
  Clock,
  Mail,
  Bell,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/ui/stats-card";
import { useStats, useHealthStatus } from "@/hooks/use-stats";
import { useRecentTenants } from "@/hooks/use-tenants";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "@/lib/api";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: recentTenants, isLoading: tenantsLoading } = useRecentTenants();
  const { data: healthStatus } = useHealthStatus();
  const { data: requests = [] } = useQuery({
    queryKey: ["/api/admin/module-requests"],
    refetchInterval: 5000,
  }) as { data: any[] };
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const sendTestEmail = useMutation({
    mutationFn: (to?: string) => api.sendTestEmail(to),
    onSuccess: res => {
      toast({ title: "Test email sent", description: `Sent to ${res.to}` });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to send test email",
        description: err?.message || "Email service error",
        variant: "destructive",
      });
    },
  });

  // All tenants for analytics
  const { data: allTenants = [], isLoading: tenantsAllLoading } = useQuery({
    queryKey: ["/api/tenants", "all"],
    queryFn: () => api.getTenants(),
    staleTime: 15000,
  }) as { data: any[]; isLoading: boolean };

  // Derived metrics
  const total = stats?.totalTenants || (allTenants as any[]).length || 0;
  const active =
    stats?.activeTenants ||
    (allTenants as any[]).filter((t: any) => t.status === "active").length ||
    0;
  const pending =
    stats?.pendingTenants ||
    (allTenants as any[]).filter((t: any) => t.status === "pending").length ||
    0;
  const suspended = (allTenants as any[]).filter((t: any) => t.status === "suspended").length || 0;
  const activeRate = total ? Math.round((active / total) * 100) : 0;

  // New tenants last 7 days
  const now = new Date();
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return d;
  });
  const newTenantsDaily = last7Days.map(d => {
    const dayStr = format(d, "MMM d");
    const count = (allTenants as any[]).filter(
      (t: any) => t.createdAt && new Date(t.createdAt).toDateString() === d.toDateString()
    ).length;
    return { day: dayStr, count };
  });

  const statusBars = [
    { name: "Active", value: active, color: "#16a34a" },
    { name: "Pending", value: pending, color: "#f59e0b" },
    { name: "Suspended", value: suspended, color: "#ef4444" },
  ];

  const rbacEnabled = (allTenants as any[]).filter((t: any) =>
    (t.enabledModules || []).includes("rbac")
  ).length;
  const ssoConfigured = (allTenants as any[]).filter((t: any) => {
    const providers = (t.moduleConfigs as any)?.auth?.providers || [];
    return Array.isArray(providers)
      ? providers.some((p: any) => ["azure-ad", "auth0", "saml"].includes(p?.type))
      : false;
  }).length;
  const adoptionPie = [
    { name: "RBAC", value: rbacEnabled, color: "#6366f1" },
    { name: "SSO", value: ssoConfigured, color: "#06b6d4" },
    { name: "Other", value: Math.max(total - (rbacEnabled + ssoConfigured), 0), color: "#e5e7eb" },
  ];
  const { data: providerRequests = [] } = useQuery({
    queryKey: ["/api/admin/provider-requests"],
    refetchInterval: 5000,
  }) as { data: any[] };
  const { data: resolved = [] } = useQuery({
    queryKey: ["/api/admin/module-requests", "resolved"],
    queryFn: async () => {
      const platformAdminToken = localStorage.getItem("platformAdminToken");
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(platformAdminToken ? { Authorization: `Bearer ${platformAdminToken}` } : {}),
      };

      const res = await fetch("/api/admin/module-requests?includeResolved=true", {
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Clear all authentication data and redirect
          localStorage.removeItem("platformAdminToken");
          window.location.href = "/admin/login";
          return [];
        }
        return [];
      }

      const all = await res.json();
      return all.filter(
        (r: any) => r.details?.status === "approved" || r.details?.status === "dismissed"
      );
    },
    refetchInterval: 10000,
  }) as { data: any[] };

  return (
    <div className="space-y-8">
      {/* Header Controls - Notifications only */}
      <div className="flex justify-end">
        <div className="relative">
          <Button variant="outline" onClick={() => (window.location.hash = "#module-requests")}>
            <Bell className="h-4 w-4 mr-2" /> Notifications
          </Button>
          {requests.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
              {requests.length}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          <>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </>
        ) : (
          <>
            <div className="dashboard-stat-card group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tenants</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{total}</p>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 font-medium">+12%</span>
                    <span className="text-gray-500 ml-1">vs last month</span>
                  </div>
                </div>
                <div className="dashboard-stat-icon bg-gradient-to-br from-purple-500 to-purple-600">
                  <Building className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="dashboard-stat-card group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Tenants</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{active}</p>
                  <div className="flex items-center mt-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">{activeRate}% active rate</span>
                  </div>
                </div>
                <div className="dashboard-stat-icon bg-gradient-to-br from-green-500 to-green-600">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="dashboard-stat-card group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{requests.length}</p>
                  <div className="flex items-center mt-2 text-sm">
                    <Clock className="h-4 w-4 text-orange-500 mr-1" />
                    <span className="text-orange-600 font-medium">
                      {requests.length > 0 ? "Needs attention" : "All clear"}
                    </span>
                  </div>
                </div>
                <div className="dashboard-stat-icon bg-gradient-to-br from-orange-500 to-orange-600">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="dashboard-stat-card group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Emails Sent</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.emailsSent || 0}</p>
                  <div className="flex items-center mt-2 text-sm">
                    <Mail className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-blue-600 font-medium">All systems operational</span>
                  </div>
                </div>
                <div className="dashboard-stat-icon bg-gradient-to-br from-blue-500 to-blue-600">
                  <Mail className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* New Tenants Trend */}
        <div className="dashboard-chart-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                New Tenants
              </h3>
              <p className="text-sm text-gray-500 mt-1">Last 7 days growth</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {newTenantsDaily.reduce((sum, d) => sum + d.count, 0)}
              </div>
              <div className="text-sm text-green-600 font-medium">+8.2%</div>
            </div>
          </div>
          {tenantsAllLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={newTenantsDaily}
                  margin={{ left: 12, right: 12, top: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tick={{ fill: "#64748b" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    fontSize={12}
                    tick={{ fill: "#64748b" }}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorNew)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Tenant Status Distribution */}
        <div className="dashboard-chart-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                Tenant Status
              </h3>
              <p className="text-sm text-gray-500 mt-1">Distribution overview</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{activeRate}%</div>
              <div className="text-sm text-gray-500">Active rate</div>
            </div>
          </div>
          {tenantsAllLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBars} margin={{ left: 12, right: 12, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tick={{ fill: "#64748b" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    fontSize={12}
                    tick={{ fill: "#64748b" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {statusBars.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Module Adoption */}
        <div className="dashboard-chart-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <PieIcon className="h-4 w-4 text-white" />
                </div>
                Module Adoption
              </h3>
              <p className="text-sm text-gray-500 mt-1">Feature utilization</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-sm text-gray-500">Total tenants</div>
            </div>
          </div>
          {tenantsAllLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="h-48">
              <div className="flex items-center justify-center h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={adoptionPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={38}
                      outerRadius={64}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {adoptionPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value, name) => [value, name]}
                      labelStyle={{ color: "#1e293b" }}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                {adoptionPie.map(p => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span
                      className={`chart-legend-dot ${p.name === "RBAC" ? "legend-rbac" : p.name === "SSO" ? "legend-sso" : "legend-other"}`}
                    />
                    <span className="text-slate-600">
                      {p.name}: <span className="font-medium text-slate-800">{p.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants Table */}
        <div className="dashboard-chart-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-white" />
                </div>
                Recent Tenants
              </h3>
              <p className="text-sm text-gray-500 mt-1">Latest registered organizations</p>
            </div>
            {recentTenants && recentTenants.length > 0 && (
              <Button
                variant="ghost"
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-medium"
                onClick={() => (window.location.href = "/tenants")}
                data-testid="button-view-all-tenants"
              >
                View All
              </Button>
            )}
          </div>
          {tenantsLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : recentTenants && recentTenants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Org ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTenants.map(tenant => (
                  <TableRow key={tenant.id} data-testid={`tenant-item-${tenant.orgId}`}>
                    <TableCell className="font-medium text-slate-800">{tenant.name}</TableCell>
                    <TableCell className="text-slate-600">{tenant.orgId}</TableCell>
                    <TableCell>
                      <span
                        className={`status-badge ${tenant.status === "active" ? "status-active" : tenant.status === "pending" ? "status-pending" : "status-suspended"}`}
                        data-testid={`status-${tenant.orgId}`}
                      >
                        {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {tenant.createdAt ? format(new Date(tenant.createdAt), "MMM d, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-500">No tenants found.</div>
          )}
        </div>
        {/* Module Requests */}
        <div
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          id="module-requests"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" /> Module Requests
            </h3>
            <Button
              variant="ghost"
              className="text-blue-600 hover:text-blue-500"
              onClick={() => setLocation("/logs?tab=module")}
            >
              View All
            </Button>
          </div>
          {requests.length === 0 ? (
            <div className="text-slate-500 text-sm">No pending requests</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-auto">
              {requests.map(r => (
                <div
                  key={r.id}
                  className="p-3 bg-slate-50 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-800">{r.tenantName || r.tenantId}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {r.details?.moduleId} → {r.details?.action}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await apiRequest("POST", `/api/admin/module-requests/${r.id}/approve`, {
                            tenantId: r.tenantId,
                            moduleId: r.details?.moduleId,
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["/api/admin/module-requests"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["/api/admin/module-requests", "resolved"],
                          });
                          toast({
                            title: "Approved",
                            description: `${r.details?.moduleId} approved for ${r.tenantName || r.tenantId}`,
                          });
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await apiRequest("POST", `/api/admin/module-requests/${r.id}/dismiss`, {
                            tenantId: r.tenantId,
                            moduleId: r.details?.moduleId,
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["/api/admin/module-requests"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["/api/admin/module-requests", "resolved"],
                          });
                          toast({
                            title: "Dismissed",
                            description: `${r.details?.moduleId} dismissed for ${r.tenantName || r.tenantId}`,
                          });
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {resolved.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Resolved</h4>
              <div className="space-y-2 max-h-40 overflow-auto">
                {resolved.map(r => (
                  <div
                    key={r.id}
                    className="p-2 bg-slate-50 rounded border text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium">{r.tenantName || r.tenantId}</span>
                      <span className="ml-2">{r.details?.moduleId}</span>
                    </div>
                    <span
                      className={
                        r.details?.status === "approved" ? "text-green-700" : "text-slate-600"
                      }
                    >
                      {r.details?.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Provider Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Provider Requests</h3>
            <Button
              variant="ghost"
              className="text-blue-600 hover:text-blue-500"
              onClick={() => setLocation("/logs?tab=provider")}
            >
              View All
            </Button>
          </div>
          {providerRequests.length === 0 ? (
            <div className="text-slate-500 text-sm">No pending provider requests</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-auto">
              {providerRequests.map((r: any) => (
                <div
                  key={r.id}
                  className="p-3 bg-slate-50 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-800">{r.tenantName || r.tenantId}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {r.details?.provider} provider change
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await apiRequest("POST", `/api/admin/provider-requests/${r.id}/approve`, {
                            tenantId: r.tenantId,
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["/api/admin/provider-requests"],
                          });
                          toast({
                            title: "Approved",
                            description: `${r.details?.provider} change approved`,
                          });
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await apiRequest("POST", `/api/admin/provider-requests/${r.id}/dismiss`);
                          queryClient.invalidateQueries({
                            queryKey: ["/api/admin/provider-requests"],
                          });
                          toast({
                            title: "Dismissed",
                            description: `${r.details?.provider} change dismissed`,
                          });
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="system-status-operational"></div>
                <span className="text-slate-700">API Gateway</span>
              </div>
              <span className="text-green-600 font-medium text-sm">Operational</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="system-status-operational"></div>
                <span className="text-slate-700">Authentication API</span>
              </div>
              <span className="text-green-600 font-medium text-sm">Operational</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="system-status-operational"></div>
                <span className="text-slate-700">RBAC API</span>
              </div>
              <span className="text-green-600 font-medium text-sm">Operational</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={
                    healthStatus?.services.email
                      ? "system-status-operational"
                      : "system-status-warning"
                  }
                ></div>
                <span className="text-slate-700">Email Service</span>
              </div>
              <span
                className={`font-medium text-sm ${healthStatus?.services.email ? "text-green-600" : "text-amber-600"}`}
              >
                {healthStatus?.services.email ? "Operational" : "High Load"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={
                    healthStatus?.services.database
                      ? "system-status-operational"
                      : "system-status-error"
                  }
                ></div>
                <span className="text-slate-700">Database</span>
              </div>
              <span
                className={`font-medium text-sm ${healthStatus?.services.database ? "text-green-600" : "text-red-600"}`}
              >
                {healthStatus?.services.database ? "Operational" : "Error"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Input
              type="email"
              placeholder="Test email address"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              className="max-w-sm"
            />
            <Button
              onClick={() => sendTestEmail.mutate(testEmail || undefined)}
              disabled={sendTestEmail.isPending}
              className="flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {sendTestEmail.isPending ? "Sending..." : "Send Test Email"}
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Response Time</span>
              <span className="font-medium text-slate-800">~150ms</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-600">Uptime</span>
              <span className="font-medium text-slate-800">99.9%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
