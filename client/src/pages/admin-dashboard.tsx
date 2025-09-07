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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatsCard
              title="Total Tenants"
              value={total}
              icon={Building}
              iconColor="text-blue-600"
              backgroundColor="bg-blue-100"
            />
            <StatsCard
              title="Active Tenants"
              value={active}
              icon={CheckCircle}
              iconColor="text-green-600"
              backgroundColor="bg-green-100"
            />
            <StatsCard
              title="Pending Requests"
              value={requests.length}
              icon={Activity}
              iconColor="text-amber-600"
              backgroundColor="bg-amber-100"
            />
            <StatsCard
              title="Emails Sent"
              value={stats?.emailsSent || 0}
              icon={Mail}
              iconColor="text-purple-600"
              backgroundColor="bg-purple-100"
            />
          </>
        )}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* New Tenants Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" /> New Tenants (7 days)
            </h3>
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" /> Tenant Status
            </h3>
            <div className="text-sm text-slate-500">Active rate: {activeRate}%</div>
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-indigo-600" /> Module Adoption
            </h3>
            <div className="text-sm text-slate-500">Total: {total}</div>
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
        {/* Recent Tenants - Modern Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Recent Tenants</h3>
            {recentTenants && recentTenants.length > 0 && (
              <Button
                variant="ghost"
                className="text-blue-600 hover:text-blue-500"
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
