import { useState } from "react";
import { Search, ArrowLeft, Edit, Mail, CheckCircle, Pause, Trash2, Plug } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  useTenants,
  useUpdateTenantStatus,
  useUpdateTenantModules,
  useDeleteTenant,
  useResendOnboardingEmail,
} from "@/hooks/use-tenants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Tenant } from "@/lib/api";
import TenantLayout from "@/components/tenants/tenant-layout";
import { format } from "date-fns";

const editFormSchema = z.object({
  status: z.enum(["pending", "active", "suspended"]),
});

type EditFormData = z.infer<typeof editFormSchema>;

export default function TenantsPage() {
  const { data: tenants = [], isLoading } = useTenants();
  const updateTenantStatus = useUpdateTenantStatus();
  const updateModules = useUpdateTenantModules();
  const deleteTenant = useDeleteTenant();
  const resendEmail = useResendOnboardingEmail();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "edit">("view");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: { status: "pending" },
  });

  const filtered = tenants
    .filter(t => (statusFilter === "all" ? true : t.status === statusFilter))
    .filter(t => {
      const q = searchQuery.toLowerCase();
      return (
        t.name?.toLowerCase().includes(q) ||
        t.adminEmail?.toLowerCase().includes(q) ||
        t.orgId?.toLowerCase().includes(q)
      );
    });

  const toggleSelect = (id: string) => {
    setSelectedIds(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(t => t.id));
    }
  };

  const handleBulkStatus = async (status: string) => {
    await Promise.all(selectedIds.map(id => updateTenantStatus.mutateAsync({ id, status })));
    setSelectedIds([]);
  };

  const handleBulkModule = async (module: string, enable: boolean) => {
    await Promise.all(
      selectedIds.map(id => {
        const tenant = tenants.find(t => t.id === id);
        if (!tenant) return Promise.resolve();
        const modules = new Set(tenant.enabledModules || []);
        if (enable) modules.add(module);
        else modules.delete(module);
        return updateModules.mutateAsync({
          id,
          payload: { enabledModules: Array.from(modules) },
        });
      })
    );
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    await Promise.all(selectedIds.map(id => deleteTenant.mutateAsync(id)));
    setSelectedIds([]);
  };

  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setViewMode("view");
    form.reset({ status: tenant.status as EditFormData["status"] });
  };

  const handleEditTenant = () => {
    setViewMode("edit");
  };

  const handleBack = () => {
    setSelectedTenant(null);
  };

  const onSubmit = async (data: EditFormData) => {
    if (!selectedTenant) return;
    await updateTenantStatus.mutateAsync({ id: selectedTenant.id, status: data.status });
    setSelectedTenant({ ...selectedTenant, status: data.status });
    setViewMode("view");
  };

  const handleQuickStatusChange = async (status: string) => {
    if (!selectedTenant) return;
    await updateTenantStatus.mutateAsync({ id: selectedTenant.id, status });
    setSelectedTenant({ ...selectedTenant, status });
  };

  const handleDeleteTenant = async (id: string) => {
    await deleteTenant.mutateAsync(id);
    setSelectedTenant(null);
  };

  const handleToggleModule = async (tenant: Tenant, module: string) => {
    const modules = new Set(tenant.enabledModules || []);
    if (modules.has(module)) modules.delete(module);
    else modules.add(module);
    await updateModules.mutateAsync({
      id: tenant.id,
      payload: { enabledModules: Array.from(modules) },
    });
    setSelectedTenant({ ...tenant, enabledModules: Array.from(modules) });
  };

  return (
    <TenantLayout>
      <div className="flex flex-col lg:flex-row gap-2 h-full">
        <div className="lg:w-1/3 flex flex-col space-y-2 h-full">
          <div className="bg-white border rounded-lg p-2">
            <div className="relative mb-2">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <Input
                type="text"
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search tenants"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full mb-2">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            {selectedIds.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handleBulkStatus("active")}
                  disabled={updateTenantStatus.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Activate
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkStatus("suspended")}
                  disabled={updateTenantStatus.isPending}
                >
                  <Pause className="h-4 w-4 mr-1" /> Suspend
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={deleteTenant.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkModule("email", true)}
                  disabled={updateModules.isPending}
                >
                  <Plug className="h-4 w-4 mr-1" /> Enable Email
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkModule("email", false)}
                  disabled={updateModules.isPending}
                >
                  <Plug className="h-4 w-4 mr-1" /> Disable Email
                </Button>
              </div>
            )}
          </div>

          <div className="bg-white border rounded-lg overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 px-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="Select all tenants"
                    />
                  </TableHead>
                  <TableHead className="px-2">Organization</TableHead>
                  <TableHead className="px-2">Status</TableHead>
                  <TableHead className="px-2">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      No tenants
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(t => (
                    <TableRow
                      key={t.id}
                      onClick={() => handleViewTenant(t)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell className="px-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          aria-label={`Select ${t.name}`}
                        />
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-gray-500">{t.adminEmail}</div>
                      </TableCell>
                      <TableCell className="px-2">
                        <Badge
                          variant={
                            t.status === "active"
                              ? "default"
                              : t.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 text-sm text-gray-500">
                        {t.createdAt ? format(new Date(t.createdAt), "PP") : ""}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex-1">
          {selectedTenant ? (
            viewMode === "edit" ? (
              <Card>
                <CardHeader className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setViewMode("view")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle>Edit Tenant</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div>
                        <FormLabel>Organization</FormLabel>
                        <Input value={selectedTenant.name} disabled className="bg-gray-100" />
                      </div>
                      <div>
                        <FormLabel>Admin Email</FormLabel>
                        <Input value={selectedTenant.adminEmail} disabled className="bg-gray-100" />
                      </div>
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
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
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setViewMode("view")}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateTenantStatus.isPending}>
                          Save
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle>{selectedTenant.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Organization ID:</span> {selectedTenant.orgId}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Admin Email:</span> {selectedTenant.adminEmail}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Status:</span> {selectedTenant.status}
                  </div>
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button size="sm" onClick={handleEditTenant}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resendEmail.mutateAsync(selectedTenant.id)}
                      disabled={resendEmail.isPending}
                    >
                      <Mail className="h-4 w-4 mr-1" /> Resend Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleQuickStatusChange(
                          selectedTenant.status === "active" ? "suspended" : "active"
                        )
                      }
                      disabled={updateTenantStatus.isPending}
                    >
                      {selectedTenant.status === "active" ? (
                        <Pause className="h-4 w-4 mr-1" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      )}
                      {selectedTenant.status === "active" ? "Suspend" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteTenant(selectedTenant.id)}
                      disabled={deleteTenant.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleModule(selectedTenant, "email")}
                      disabled={updateModules.isPending}
                    >
                      <Plug className="h-4 w-4 mr-1" />
                      {selectedTenant.enabledModules?.includes("email")
                        ? "Disable Email"
                        : "Enable Email"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              Select a tenant to view details
            </div>
          )}
        </div>
      </div>
    </TenantLayout>
  );
}
