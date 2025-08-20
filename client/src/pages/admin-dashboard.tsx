import { useState } from "react";
import { Building, CheckCircle, Clock, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/ui/stats-card";
import AddTenantModal from "@/components/modals/add-tenant-modal";
import { useStats, useHealthStatus } from "@/hooks/use-stats";
import { useRecentTenants } from "@/hooks/use-tenants";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: recentTenants, isLoading: tenantsLoading } = useRecentTenants();
  const { data: healthStatus } = useHealthStatus();

  return (
    <div>
      {/* Add Tenant Button - positioned absolutely for header */}
      <div className="fixed top-4 right-6 z-10">
        <Button
          onClick={() => setShowAddTenantModal(true)}
          className="btn-primary flex items-center space-x-2"
          data-testid="button-add-tenant"
        >
          <Plus size={16} />
          <span>Add Tenant</span>
        </Button>
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
        {/* Recent Tenants */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Tenants</h3>
          <div className="space-y-4">
            {tenantsLoading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : recentTenants && recentTenants.length > 0 ? (
              recentTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  data-testid={`tenant-item-${tenant.orgId}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {tenant.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{tenant.name}</p>
                      <p className="text-sm text-slate-500">{tenant.adminEmail}</p>
                    </div>
                  </div>
                  <span
                    className={`status-badge ${
                      tenant.status === 'active'
                        ? 'status-active'
                        : tenant.status === 'pending'
                        ? 'status-pending'
                        : 'status-suspended'
                    }`}
                    data-testid={`status-${tenant.orgId}`}
                  >
                    {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                No tenants found. Create your first tenant to get started.
              </div>
            )}
          </div>
          {recentTenants && recentTenants.length > 0 && (
            <Button
              variant="ghost"
              className="w-full mt-4 text-blue-600 hover:text-blue-500"
              data-testid="button-view-all-tenants"
            >
              View All Tenants
            </Button>
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
                <div className={healthStatus?.services.email ? "system-status-operational" : "system-status-warning"}></div>
                <span className="text-slate-700">Email Service</span>
              </div>
              <span className={`font-medium text-sm ${healthStatus?.services.email ? "text-green-600" : "text-amber-600"}`}>
                {healthStatus?.services.email ? "Operational" : "High Load"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={healthStatus?.services.database ? "system-status-operational" : "system-status-error"}></div>
                <span className="text-slate-700">Database</span>
              </div>
              <span className={`font-medium text-sm ${healthStatus?.services.database ? "text-green-600" : "text-red-600"}`}>
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

      <AddTenantModal
        open={showAddTenantModal}
        onOpenChange={setShowAddTenantModal}
      />
    </div>
  );
}
