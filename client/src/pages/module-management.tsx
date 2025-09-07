import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MODULE_DEPENDENCIES } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Settings,
  Shield,
  Key,
  Cloud,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  Search,
  FileText,
  Bell,
  Bot,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  orgId: string;
  adminEmail: string;
  status: string;
  enabledModules: string[];
  moduleConfigs: Record<string, any>;
}

const moduleUpdateSchema = z.object({
  enabledModules: z.array(z.string()),
  moduleConfigs: z.record(z.any()).optional(),
  notifyTenant: z.boolean().optional(),
});

type ModuleUpdateFormData = z.infer<typeof moduleUpdateSchema>;

const availableModules = [
  {
    id: "auth",
    name: "Core Authentication",
    description: "JWT-based authentication with user management",
    icon: Key,
    category: "Authentication",
    required: true,
  },
  {
    id: "rbac",
    name: "Role-Based Access Control",
    description: "Advanced role and permission management system",
    icon: Shield,
    category: "Authorization",
    required: true,
  },
  {
    id: "azure-ad",
    name: "Azure Active Directory",
    description: "Single sign-on with Microsoft Azure AD",
    icon: Cloud,
    category: "SSO",
    configurable: true,
  },
  {
    id: "auth0",
    name: "Auth0 Integration",
    description: "Universal authentication with Auth0 platform",
    icon: Users,
    category: "SSO",
    configurable: true,
  },
  {
    id: "saml",
    name: "SAML SSO",
    description: "SAML-based single sign-on integration",
    icon: Settings,
    category: "SSO",
    configurable: true,
  },
  {
    id: "logging",
    name: "Logging & Monitoring",
    description: "Comprehensive audit trail and security monitoring",
    icon: FileText,
    category: "Operations",
    configurable: true,
    priority: "high",
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Multi-channel messaging and alerts system",
    icon: Bell,
    category: "Communication",
    configurable: true,
    priority: "medium",
  },
  {
    id: "ai-copilot",
    name: "AI Copilot",
    description: "Intelligent automation and user assistance",
    icon: Bot,
    category: "AI/ML",
    configurable: true,
    priority: "low",
  },
];

// Define module dependency relationships. Key is module requiring other modules.

export default function ModuleManagementPage() {
  const [searchTenant, setSearchTenant] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [editingModules, setEditingModules] = useState(false);
  const { toast } = useToast();

  const form = useForm<ModuleUpdateFormData>({
    resolver: zodResolver(moduleUpdateSchema),
    defaultValues: {
      enabledModules: ["auth", "rbac"],
      moduleConfigs: {},
      notifyTenant: false,
    },
  });

  // Get all tenants
  const tenantsQuery = useQuery({
    queryKey: ["/api/tenants"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tenants");
      return (await res.json()) as Tenant[];
    },
  });

  // Preselect tenant from query param (?tenantId=...)
  const searchParams = new URLSearchParams(window.location.search);
  const preselectId = searchParams.get("tenantId");
  if (preselectId && tenantsQuery.data && !selectedTenant) {
    const found = tenantsQuery.data.find(t => t.id === preselectId);
    if (found) {
      handleTenantSelect(found);
    }
  }

  // Update tenant modules mutation
  const updateModulesMutation = useMutation({
    mutationFn: async (data: { tenantId: string; modules: ModuleUpdateFormData; notify?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/tenants/${data.tenantId}/modules`, data.modules);
      return res.json();
    },
    onSuccess: async (_, variables) => {
      const previous = selectedTenant?.enabledModules || [];
      const current = variables.modules.enabledModules || [];

      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({
        title: "Modules Updated",
        description: "Tenant modules have been successfully updated.",
      });
      setEditingModules(false);
      // Update selected tenant
      if (selectedTenant?.id === variables.tenantId) {
        const updatedTenant = tenantsQuery.data?.find(t => t.id === variables.tenantId);
        if (updatedTenant) {
          setSelectedTenant(updatedTenant);
        }
      }

      if (variables.notify) {
        const enabledDiff = current.filter(m => !previous.includes(m));
        const disabledDiff = previous.filter(m => !current.includes(m));

        try {
          await apiRequest("POST", `/api/tenants/${variables.tenantId}/notify-module-change`, {
            enabled: enabledDiff,
            disabled: disabledDiff,
          });
          // Flag the tenant portal to display snackbar notifications on next login
          localStorage.setItem(
            `notifyModules-${variables.tenantId}`,
            Date.now().toString()
          );
          toast({
            title: "Tenant Notified",
            description: "Notification and email sent.",
          });
        } catch (e: any) {
          toast({
            title: "Notification Failed",
            description: e?.message || "Could not notify tenant",
            variant: "destructive",
          });
        }
      }
    },
    onError: error => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update modules",
        variant: "destructive",
      });
    },
  });

  const filteredTenants =
    tenantsQuery.data?.filter(
      tenant =>
        tenant.name.toLowerCase().includes(searchTenant.toLowerCase()) ||
        tenant.orgId.toLowerCase().includes(searchTenant.toLowerCase()) ||
        tenant.adminEmail.toLowerCase().includes(searchTenant.toLowerCase())
    ) || [];

  const handleTenantSelect = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    form.reset({
      enabledModules: tenant.enabledModules || ["auth", "rbac"],
      moduleConfigs: tenant.moduleConfigs || {},
      notifyTenant: false,
    });
    setEditingModules(false);
  };

  const onSubmit = (data: ModuleUpdateFormData) => {
    if (!selectedTenant) return;

    const { notifyTenant, ...rest } = data;
    let payload = { ...rest };
    const addedDeps = new Set<string>();

    for (const [mod, deps] of Object.entries(MODULE_DEPENDENCIES)) {
      if (payload.enabledModules.includes(mod)) {
        deps.forEach(dep => {
          if (!payload.enabledModules.includes(dep)) {
            payload.enabledModules.push(dep);
            addedDeps.add(dep);
          }
        });
      }
    }

    if (addedDeps.size > 0) {
      toast({
        title: "Dependencies added",
        description: `${Array.from(addedDeps).join(", ")} enabled due to dependencies.`,
      });
    }

    updateModulesMutation.mutate({
      tenantId: selectedTenant.id,
      modules: payload,
      notify: notifyTenant,
    });
  };

  const getModuleStatus = (moduleId: string) => {
    if (!selectedTenant) return false;
    return selectedTenant.enabledModules?.includes(moduleId) || false;
  };

  const getModuleIcon = (moduleId: string) => {
    const module = availableModules.find(m => m.id === moduleId);
    return module?.icon || Settings;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Module Management</h1>
        <p className="text-slate-600 mt-1">
          Configure authentication and authorization modules for tenants
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Tenant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search tenants..."
                value={searchTenant}
                onChange={e => setSearchTenant(e.target.value)}
                className="pl-10"
                data-testid="input-search-tenants"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tenantsQuery.isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading tenants...</div>
              ) : filteredTenants.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {searchTenant ? "No tenants found" : "No tenants available"}
                </div>
              ) : (
                filteredTenants.map(tenant => (
                  <Card
                    key={tenant.id}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                      selectedTenant?.id === tenant.id ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => handleTenantSelect(tenant)}
                    data-testid={`tenant-card-${tenant.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-slate-800">{tenant.name}</h3>
                          <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                            {tenant.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{tenant.orgId}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(tenant.enabledModules || ["auth", "rbac"]).map(module => (
                            <Badge key={module} variant="outline" className="text-xs">
                              {module}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Module Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTenant ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Modules for {selectedTenant.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      {!editingModules ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingModules(true)}
                          data-testid="button-edit-modules"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Modules
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingModules(false);
                              form.reset({
                                enabledModules: selectedTenant.enabledModules || ["auth", "rbac"],
                                moduleConfigs: selectedTenant.moduleConfigs || {},
                                notifyTenant: false,
                              });
                            }}
                            data-testid="button-cancel-edit"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={updateModulesMutation.isPending}
                            data-testid="button-save-modules"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {updateModulesMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid gap-4">
                        {(editingModules
                          ? availableModules
                          : availableModules.filter(m => getModuleStatus(m.id))).map(module => {
                          const Icon = module.icon;
                          const isEnabled = editingModules
                            ? form.watch("enabledModules")?.includes(module.id)
                            : getModuleStatus(module.id);

                          return (
                            <Card
                              key={module.id}
                              className="border-2"
                              data-testid={`module-card-${module.id}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3">
                                    <div
                                      className={`p-2 rounded-lg ${isEnabled ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"}`}
                                    >
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-medium">{module.name}</h3>
                                        <Badge variant="secondary" className="text-xs">
                                          {module.category}
                                        </Badge>
                                        {module.required && (
                                          <Badge variant="outline" className="text-xs">
                                            Required
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-600">{module.description}</p>

                                      {isEnabled &&
                                        module.configurable &&
                                        selectedTenant.moduleConfigs?.[module.id] && (
                                          <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600">
                                            <strong>Configuration:</strong>
                                            <pre className="mt-1">
                                              {JSON.stringify(
                                                selectedTenant.moduleConfigs[module.id],
                                                null,
                                                2
                                              )}
                                            </pre>
                                          </div>
                                        )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {isEnabled ? (
                                      <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-slate-400" />
                                    )}

                                    {editingModules && (
                                      <FormField
                                        control={form.control}
                                        name="enabledModules"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormControl>
                                              <Switch
                                                checked={field.value?.includes(module.id)}
                                                onCheckedChange={checked => {
                                                  const current = field.value || [];
                                                  if (!checked) {
                                                    if (module.required) {
                                                      toast({
                                                        title: "Required Module",
                                                        description: `${module.name} cannot be disabled.`,
                                                        variant: "destructive",
                                                      });
                                                      return;
                                                    }

                                                    const dependents = Object.entries(MODULE_DEPENDENCIES)
                                                      .filter(([mod, deps]) => deps.includes(module.id))
                                                      .map(([mod]) => mod)
                                                      .filter(mod => current.includes(mod));

                                                    if (dependents.length > 0) {
                                                      toast({
                                                        title: "Dependency conflict",
                                                        description: `${module.name} is required by ${dependents.join(', ')}. Disable dependent modules first.`,
                                                        variant: "destructive",
                                                      });
                                                      return;
                                                    }

                                                    field.onChange(current.filter(id => id !== module.id));
                                                  } else {
                                                    const deps = MODULE_DEPENDENCIES[module.id] || [];
                                                    const additions = deps.filter(dep => !current.includes(dep));
                                                    if (additions.length > 0) {
                                                      toast({
                                                        title: "Dependencies added",
                                                        description: `${additions.join(", ")} enabled due to dependency.`,
                                                      });
                                                    }
                                                    field.onChange([
                                                      ...current,
                                                      module.id,
                                                      ...additions,
                                                    ]);
                                                  }
                                                }}
                                                data-testid={`switch-${module.id}`}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      <FormField
                        control={form.control}
                        name="notifyTenant"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Notify tenant about changes
                              </FormLabel>
                            </div>
                            <FormDescription>
                              Emails and dashboard alerts are sent after a short delay.
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Logging Settings (Platform Admin editable) */}
              {selectedTenant.enabledModules?.includes("logging") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Logging Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm">Levels</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(["error", "warning", "info", "debug"] as const).map(lvl => (
                                <FormField
                                  key={lvl}
                                  control={form.control}
                                  name="moduleConfigs.logging.levels"
                                  render={({ field }) => {
                                    const list: string[] = Array.isArray(field.value)
                                      ? (field.value as string[])
                                      : ["error", "warning", "info"];
                                    const checked = list.includes(lvl);
                                    return (
                                      <button
                                        type="button"
                                        className={`px-2 py-1 rounded text-xs border ${
                                          checked
                                            ? "bg-blue-50 border-blue-300"
                                            : "bg-slate-50 border-slate-200"
                                        }`}
                                        onClick={() => {
                                          const next = checked
                                            ? list.filter(v => v !== lvl)
                                            : Array.from(new Set([...list, lvl]));
                                          form.setValue("moduleConfigs.logging.levels", next);
                                        }}
                                      >
                                        {lvl}
                                      </button>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm">Destinations</Label>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary">database</Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Database only for v1. External sinks coming soon.
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm">Retention Days</Label>
                            <FormField
                              control={form.control}
                              name="moduleConfigs.logging.retentionDays"
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min={1}
                                  max={365}
                                  value={field.value ?? 30}
                                  onChange={e =>
                                    field.onChange(parseInt(e.target.value || "30", 10))
                                  }
                                />
                              )}
                            />
                            <div className="mt-2 flex items-center gap-2">
                              <FormField
                                control={form.control}
                                name="moduleConfigs.logging.redactionEnabled"
                                render={({ field }) => (
                                  <>
                                    <input
                                      id="admin-redaction"
                                      type="checkbox"
                                      checked={!!field.value}
                                      onChange={e => field.onChange(e.target.checked)}
                                    />
                                    <Label htmlFor="admin-redaction" className="text-xs">
                                      Enable PII redaction
                                    </Label>
                                  </>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button type="submit" disabled={updateModulesMutation.isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            {updateModulesMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        Tip: Use Tenant Portal to view the Logging API key and try the Quickstart.
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await apiRequest("POST", "/api/admin/logging/test-event", {
                              tenantId: selectedTenant.id,
                              level: "info",
                              category: "admin-test",
                              message: "Logging test from Platform Admin",
                            });
                            toast({ title: "Sent", description: "Test log event created" });
                          } catch (e: any) {
                            toast({
                              title: "Failed",
                              description: e?.message || "Could not send test event",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Send Test Event
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Module Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Module Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">
                        {selectedTenant.enabledModules?.length || 0}
                      </div>
                      <div className="text-sm text-green-600">Enabled Modules</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700">
                        {availableModules.length}
                      </div>
                      <div className="text-sm text-blue-600">Available Modules</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-700">
                        {selectedTenant.enabledModules?.filter(
                          m => availableModules.find(am => am.id === m)?.category === "SSO"
                        ).length || 0}
                      </div>
                      <div className="text-sm text-purple-600">SSO Modules</div>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <div className="text-2xl font-bold text-amber-700">
                        {Object.keys(selectedTenant.moduleConfigs || {}).length}
                      </div>
                      <div className="text-sm text-amber-600">Configured</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <Settings className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium mb-2">No Tenant Selected</h3>
                <p>Select a tenant from the list to manage their modules</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
