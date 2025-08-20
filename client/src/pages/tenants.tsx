import { useState } from "react";
import { Plus, Eye, Mail, Edit, Pause, Trash, Search, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ViewTenantModal from "@/components/modals/view-tenant-modal";
import EditTenantModal from "@/components/modals/edit-tenant-modal";
import { useTenants, useUpdateTenantStatus, useResendOnboardingEmail } from "@/hooks/use-tenants";
import type { Tenant } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function TenantsPage() {
  const [, setLocation] = useLocation();
  const [showViewTenantModal, setShowViewTenantModal] = useState(false);
  const [showEditTenantModal, setShowEditTenantModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: tenants, isLoading } = useTenants();
  const updateTenantStatus = useUpdateTenantStatus();
  const resendEmail = useResendOnboardingEmail();

  const filteredTenants = tenants?.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.orgId.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleStatusChange = async (id: string, status: string) => {
    await updateTenantStatus.mutateAsync({ id, status });
  };

  const handleResendEmail = async (id: string) => {
    await resendEmail.mutateAsync(id);
  };

  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowViewTenantModal(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowEditTenantModal(true);
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (confirm(`Are you sure you want to delete tenant "${tenant.name}"? This action cannot be undone.`)) {
      // Implement delete functionality
      console.log('Delete tenant:', tenant.id);
    }
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Tenant Management</h3>
              <p className="text-slate-600 text-sm mt-1">Manage all your platform tenants</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search tenants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                  data-testid="input-search-tenants"
                />
                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              </div>
              <Button
                onClick={() => setLocation("/tenants/wizard")}
                className="btn-primary flex items-center space-x-2"
                data-testid="button-guided-setup"
              >
                <Plus size={16} />
                <span>Guided Setup</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/tenants/add")}
                className="flex items-center space-x-2"
                data-testid="button-add-tenant"
              >
                <Plus size={16} />
                <span>Quick Add</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-3">Tenant</TableHead>
                  <TableHead className="px-6 py-3">Status</TableHead>
                  <TableHead className="px-6 py-3">Created</TableHead>
                  <TableHead className="px-6 py-3">API Keys</TableHead>
                  <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length > 0 ? (
                  filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id} className="table-row" data-testid={`tenant-row-${tenant.orgId}`}>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {tenant.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{tenant.name}</p>
                            <p className="text-sm text-slate-500">{tenant.orgId}</p>
                            <p className="text-sm text-slate-500">{tenant.adminEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
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
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-slate-500">
                        {format(new Date(tenant.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">Auth: {tenant.authApiKey.substring(0, 12)}...</div>
                          <div className="text-xs text-slate-500">RBAC: {tenant.rbacApiKey.substring(0, 12)}...</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-slate-600"
                            title="View Details"
                            onClick={() => handleViewTenant(tenant)}
                            data-testid={`button-view-${tenant.orgId}`}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-slate-600"
                            title="Send Email"
                            onClick={() => handleResendEmail(tenant.id)}
                            disabled={resendEmail.isPending}
                            data-testid={`button-email-${tenant.orgId}`}
                          >
                            <Mail size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-slate-600"
                            title="Edit"
                            onClick={() => handleEditTenant(tenant)}
                            data-testid={`button-edit-${tenant.orgId}`}
                          >
                            <Edit size={16} />
                          </Button>
                          {tenant.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-600"
                              title="Suspend"
                              onClick={() => handleStatusChange(tenant.id, 'suspended')}
                              disabled={updateTenantStatus.isPending}
                              data-testid={`button-suspend-${tenant.orgId}`}
                            >
                              <Pause size={16} />
                            </Button>
                          ) : tenant.status === 'pending' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-600"
                              title="Delete"
                              onClick={() => handleDeleteTenant(tenant)}
                              data-testid={`button-delete-${tenant.orgId}`}
                            >
                              <Trash size={16} />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-400 hover:text-green-600"
                              title="Activate"
                              onClick={() => handleStatusChange(tenant.id, 'active')}
                              disabled={updateTenantStatus.isPending}
                              data-testid={`button-activate-${tenant.orgId}`}
                            >
                              <CheckCircle size={16} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      {searchQuery ? "No tenants found matching your search." : "No tenants found. Create your first tenant to get started."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {filteredTenants.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Showing 1 to {filteredTenants.length} of {filteredTenants.length} tenants
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTenant && (
        <>
          <ViewTenantModal
            open={showViewTenantModal}
            onOpenChange={setShowViewTenantModal}
            tenant={selectedTenant}
          />
          
          <EditTenantModal
            open={showEditTenantModal}
            onOpenChange={setShowEditTenantModal}
            tenant={selectedTenant}
          />
        </>
      )}
    </div>
  );
}
