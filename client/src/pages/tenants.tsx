import { useState } from "react";
import {
  Plus,
  Eye,
  Mail,
  Edit,
  Pause,
  Trash,
  Search,
  CheckCircle,
  ArrowLeft,
  Copy,
  ExternalLink,
} from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTenants, useUpdateTenantStatus, useResendOnboardingEmail } from "@/hooks/use-tenants";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Tenant } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const editFormSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  adminEmail: z.string().email("Please enter a valid email address"),
  status: z.enum(["pending", "active", "suspended"]),
});

type EditFormData = z.infer<typeof editFormSchema>;

export default function TenantsPage() {
  const [, setLocation] = useLocation();
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "view" | "edit">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: tenants, isLoading } = useTenants();
  const updateTenantStatus = useUpdateTenantStatus();
  const resendEmail = useResendOnboardingEmail();

  // Pending module requests for inline indicator badges
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["/api/admin/module-requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/module-requests");
      return res.json();
    },
    refetchInterval: 5000,
  }) as unknown as {
    data: Array<{ id: string; tenantId: string; details?: { moduleId?: string; action?: string } }>;
  };

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: "",
      adminEmail: "",
      status: "pending",
    },
  });

  const onSubmit = async (data: EditFormData) => {
    if (!selectedTenant) return;

    try {
      if (data.status !== selectedTenant.status) {
        await updateTenantStatus.mutateAsync({ id: selectedTenant.id, status: data.status });
      }
      handleBackToList();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const filteredTenants =
    tenants?.filter(tenant => {
      const q = (searchQuery || "").toLowerCase();
      const name = (tenant?.name || "").toLowerCase();
      const email = (tenant?.adminEmail || "").toLowerCase();
      const org = (tenant?.orgId || "").toLowerCase();
      return name.includes(q) || email.includes(q) || org.includes(q);
    }) || [];

  const handleStatusChange = async (id: string, status: string) => {
    await updateTenantStatus.mutateAsync({ id, status });
  };

  const handleResendEmail = async (id: string) => {
    await resendEmail.mutateAsync(id);
  };

  const handleViewTenant = (tenant: Tenant) => {
    // Navigate to tenant attention page for detailed configuration
    setLocation(`/tenants/${tenant.id}/attention`);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setViewMode("edit");
    form.reset({
      name: tenant.name,
      adminEmail: tenant.adminEmail,
      status: tenant.status as "pending" | "active" | "suspended",
    });
  };

  const handleBackToList = () => {
    setSelectedTenant(null);
    setViewMode("list");
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (
      confirm(
        `Are you sure you want to delete tenant "${tenant.name}"? This action cannot be undone.`
      )
    ) {
      // Implement delete functionality
      console.log("Delete tenant:", tenant.id);
    }
  };

  // Show inline view/edit forms instead of list
  if (viewMode === "view" && selectedTenant) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleBackToList}
            className="flex items-center gap-2"
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tenants
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Tenant Details</h1>
            <p className="text-slate-600">View detailed information for {selectedTenant.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Organization Name</label>
                <p className="text-slate-900 font-medium">{selectedTenant.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Organization ID</label>
                <p className="text-slate-900 font-mono">{selectedTenant.orgId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Admin Email</label>
                <p className="text-slate-900">{selectedTenant.adminEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <Badge
                  variant={
                    selectedTenant.status === "active"
                      ? "default"
                      : selectedTenant.status === "pending"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {selectedTenant.status.charAt(0).toUpperCase() + selectedTenant.status.slice(1)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Created</label>
                <p className="text-slate-900">
                  {format(new Date(selectedTenant.createdAt), "PPpp")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Integration keys for this tenant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Auth API Key</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedTenant.authApiKey, "Auth API Key")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-slate-900 font-mono text-sm bg-slate-50 p-2 rounded">
                  {selectedTenant.authApiKey}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">RBAC API Key</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedTenant.rbacApiKey, "RBAC API Key")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-slate-900 font-mono text-sm bg-slate-50 p-2 rounded">
                  {selectedTenant.rbacApiKey}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Enabled Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Enabled Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {((selectedTenant.enabledModules as string[]) || ["auth", "rbac"]).map(module => (
                  <Badge key={module} variant="outline">
                    {module}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Logging Settings (read-only) */}
          {Array.isArray(selectedTenant.enabledModules) &&
            selectedTenant.enabledModules.includes("logging") && (
              <Card>
                <CardHeader>
                  <CardTitle>Logging Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Levels</label>
                    <p className="text-slate-900">
                      {Array.isArray((selectedTenant.moduleConfigs as any)?.logging?.levels)
                        ? ((selectedTenant.moduleConfigs as any).logging.levels as string[]).join(
                            ", "
                          )
                        : "error, warning, info"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Destinations</label>
                    <p className="text-slate-900">
                      {Array.isArray((selectedTenant.moduleConfigs as any)?.logging?.destinations)
                        ? (
                            (selectedTenant.moduleConfigs as any).logging.destinations as string[]
                          ).join(", ")
                        : "—"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Retention (days)</label>
                      <p className="text-slate-900">
                        {typeof (selectedTenant.moduleConfigs as any)?.logging?.retentionDays ===
                        "number"
                          ? (selectedTenant.moduleConfigs as any).logging.retentionDays
                          : 30}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">PII Redaction</label>
                      <p className="text-slate-900">
                        {(selectedTenant.moduleConfigs as any)?.logging?.redactionEnabled
                          ? "Enabled"
                          : "Disabled"}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Edit Logging settings in Platform Module Management or in Tenant Portal →
                    Modules.
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => handleEditTenant(selectedTenant)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Tenant
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => handleResendEmail(selectedTenant.id)}
                disabled={resendEmail.isPending}
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Welcome Email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (viewMode === "edit" && selectedTenant) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleBackToList}
            className="flex items-center gap-2"
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tenants
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Edit Tenant</h1>
            <p className="text-slate-600">Update tenant information for {selectedTenant.name}</p>
          </div>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
            <CardDescription>Update the tenant's status and configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled
                          className="bg-slate-100"
                          data-testid="input-edit-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel htmlFor="org-id-input">Organization ID</FormLabel>
                  <Input
                    id="org-id-input"
                    value={selectedTenant.orgId}
                    disabled
                    className="bg-slate-100"
                    data-testid="input-edit-org-id"
                    aria-label="Organization ID"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled
                          className="bg-slate-100"
                          data-testid="input-edit-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToList}
                    data-testid="button-edit-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateTenantStatus.isPending}
                    data-testid="button-edit-save"
                  >
                    {updateTenantStatus.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                  data-testid="input-search-tenants"
                  aria-label="Search tenants"
                />
                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              </div>
              <Button
                onClick={() => setLocation("/tenants/wizard")}
                className="btn-primary flex items-center space-x-2"
                data-testid="button-add-tenant"
              >
                <Plus size={16} />
                <span>Add Tenant</span>
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
                  <TableHead className="px-6 py-3">Modules</TableHead>
                  <TableHead className="px-6 py-3">API Keys</TableHead>
                  <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length > 0 ? (
                  filteredTenants.map(tenant => (
                    <TableRow
                      key={tenant.id}
                      className="table-row"
                      data-testid={`tenant-row-${tenant.orgId}`}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {(tenant.name || tenant.orgId || "--").substring(0, 2).toUpperCase()}
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
                      <TableCell className="px-6 py-4 text-sm text-slate-500">
                        {tenant.createdAt ? format(new Date(tenant.createdAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {(tenant.enabledModules || []).map(m => (
                            <span
                              key={m}
                              className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                            >
                              {m.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">
                            Auth:{" "}
                            {tenant.authApiKey
                              ? `${tenant.authApiKey.substring(0, 12)}...`
                              : "not generated"}
                          </div>
                          <div className="text-xs text-slate-500">
                            RBAC:{" "}
                            {tenant.rbacApiKey
                              ? `${tenant.rbacApiKey.substring(0, 12)}...`
                              : "not generated"}
                          </div>
                          <div className="text-xs text-slate-500">
                            Logging:{" "}
                            {(tenant as any).loggingApiKey
                              ? `${(tenant as any).loggingApiKey.substring(0, 12)}...`
                              : "not generated"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {(() => {
                            const providers = (tenant.moduleConfigs as any)?.auth?.providers || [];
                            const hasSSO = Array.isArray(providers)
                              ? providers.some((p: any) =>
                                  ["azure-ad", "auth0", "saml"].includes(p?.type)
                                )
                              : false;
                            const hasRBAC = (tenant.enabledModules || []).includes("rbac");
                            const hasPending = (pendingRequests as any[]).some(
                              (r: any) => r.tenantId === tenant.id
                            );
                            const needsAttention = hasPending || (hasRBAC && !hasSSO);
                            return (
                              <Button
                                variant={needsAttention ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setLocation(`/tenants/${tenant.id}/attention`)}
                                title="Manage tenant modules"
                                data-testid={`button-manage-${tenant.orgId}`}
                              >
                                {needsAttention ? "Needs Attention" : "Manage"}
                              </Button>
                            );
                          })()}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-slate-600"
                            title="Open Tenant Portal"
                            onClick={() =>
                              tenant.orgId && window.open(`/tenant/${tenant.orgId}/login`, "_blank")
                            }
                            data-testid={`button-portal-${tenant.orgId}`}
                          >
                            <ExternalLink size={16} />
                          </Button>
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
                          {tenant.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-600"
                              title="Suspend"
                              onClick={() => handleStatusChange(tenant.id, "suspended")}
                              disabled={updateTenantStatus.isPending}
                              data-testid={`button-suspend-${tenant.orgId}`}
                            >
                              <Pause size={16} />
                            </Button>
                          ) : tenant.status === "pending" ? (
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
                              onClick={() => handleStatusChange(tenant.id, "active")}
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
                      {searchQuery
                        ? "No tenants found matching your search."
                        : "No tenants found. Create your first tenant to get started."}
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
    </div>
  );
}
