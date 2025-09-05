import { Building, CheckCircle, Clock, Mail, Bell } from "lucide-react";
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
  const { data: providerRequests = [] } = useQuery({
    queryKey: ["/api/admin/provider-requests"],
    refetchInterval: 5000,
  }) as { data: any[] };
  const { data: resolved = [] } = useQuery({
    queryKey: ["/api/admin/module-requests", "resolved"],
    queryFn: async () => {
      const res = await fetch("/api/admin/module-requests?includeResolved=true");
      if (!res.ok) return [];
      const all = await res.json();
      return all.filter(
        (r: any) => r.details?.status === "approved" || r.details?.status === "dismissed"
      );
    },
    refetchInterval: 10000,
  }) as { data: any[] };
  const { toast } = useToast();

  return (
    <div>
      {/* Header Controls - Notifications only */}
      <div className="fixed top-4 right-6 z-10 flex items-center gap-3">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              value={stats?.totalTenants || 0}
              icon={Building}
              iconColor="text-blue-600"
              backgroundColor="bg-blue-100"
            />
            <StatsCard
              title="Active Tenants"
              value={stats?.activeTenants || 0}
              icon={CheckCircle}
              iconColor="text-green-600"
              backgroundColor="bg-green-100"
            />
            <StatsCard
              title="Pending"
              value={stats?.pendingTenants || 0}
              icon={Clock}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants - Modern Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
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
                {recentTenants.map((tenant) => (
                  <TableRow key={tenant.id} data-testid={`tenant-item-${tenant.orgId}`}>
                    <TableCell className="font-medium text-slate-800">{tenant.name}</TableCell>
                    <TableCell className="text-slate-600">{tenant.orgId}</TableCell>
                    <TableCell>
                      <span
                        className={`status-badge ${
                          tenant.status === "active"
                            ? "status-active"
                            : tenant.status === "pending"
                              ? "status-pending"
                              : "status-suspended"
                        }`}
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6" id="module-requests">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" /> Module Requests
            </h3>
            <Button variant="ghost" className="text-blue-600 hover:text-blue-500" onClick={() => setLocation("/logs?tab=module")}>View All</Button>
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
                          toast({ title: "Approved", description: `${r.details?.moduleId} approved for ${r.tenantName || r.tenantId}` });
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
                          toast({ title: "Dismissed", description: `${r.details?.moduleId} dismissed for ${r.tenantName || r.tenantId}` });
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Provider Requests</h3>
            <Button variant="ghost" className="text-blue-600 hover:text-blue-500" onClick={() => setLocation("/logs?tab=provider")}>View All</Button>
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
                          toast({ title: "Approved", description: `${r.details?.provider} change approved` });
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
                          toast({ title: "Dismissed", description: `${r.details?.provider} change dismissed` });
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
          <h3 className="text-lg font-semibold text-slate-800 mb-4">System Health</h3>
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
