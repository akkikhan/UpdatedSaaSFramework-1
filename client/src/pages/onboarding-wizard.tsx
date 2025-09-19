import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Mail,
  Settings,
  Key,
  CheckCircle,
  Users,
  Shield,
  Globe,
  Zap,
  FileText,
  Bell,
  Bot,
  Activity,
  Lock,
  Cloud,
  Database,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  TENANT_CREATION_SCHEMA,
  MODULES_INFO,
  MODULE_IDS,
  createAuthProviderObject,
  type TenantCreationData,
  type ModuleId,
} from "../../../shared/types";
import { useCreateTenant } from "@/hooks/use-tenants";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Use a relaxed schema for the wizard to allow provider "string[]" during form filling
// Some environments may not expose `.extend` on imported schemas; define a local schema explicitly.
const WIZARD_FORM_SCHEMA = z.object({
  name: z.string().min(1, "Organization name is required"),
  orgId: z
    .string()
    .min(1, "Organization ID is required")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  adminEmail: z.string().email("Valid email address required"),
  adminName: z.string().min(1, "Admin name is required"),
  sendEmail: z.boolean().optional(),
  enabledModules: z.array(z.string()).optional(),
  moduleConfigs: z.any().optional(),
  metadata: z
    .object({
      adminName: z.string().optional(),
      companyWebsite: z.string().optional(),
    })
    .optional(),
});

type FormData = TenantCreationData;

const STEPS = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Enter organization details and admin contact",
    icon: Building2,
  },
  {
    id: "modules",
    title: "Select Modules",
    description: "Choose the modules you want to enable",
    icon: Shield,
  },
  {
    id: "configuration",
    title: "Configure Modules",
    description: "Configure the selected modules",
    icon: Settings,
  },
  {
    id: "review",
    title: "Review & Create",
    description: "Review your configuration and create the tenant",
    icon: CheckCircle,
  },
];

// Use shared module definitions - ensures consistency with backend
const MODULES = Object.values(MODULES_INFO);

// Map string icon names from MODULES_INFO to actual Lucide components
const ICONS: Record<string, React.ComponentType<any>> = {
  Lock,
  Shield,
  FileText,
  Bell,
  Bot,
  Users,
  Activity,
  Globe,
  Zap,
  Key,
  Cloud,
  Database,
  Building2,
  Settings,
  CheckCircle,
};

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createTenant = useCreateTenant();
  // Dynamic RBAC options from Platform Admin config APIs (hooks must be top-level)
  const { data: permissionTemplates = [] } = useQuery({
    queryKey: ["/api/rbac-config/permission-templates"],
    queryFn: async () => {
      const token = localStorage.getItem("platformAdminToken") || "";
      const res = await fetch("/api/rbac-config/permission-templates", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [] as any[];
      return res.json();
    },
  });
  const { data: businessTypes = [] } = useQuery({
    queryKey: ["/api/rbac-config/business-types"],
    queryFn: async () => {
      const token = localStorage.getItem("platformAdminToken") || "";
      const res = await fetch("/api/rbac-config/business-types", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [] as any[];
      return res.json();
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(WIZARD_FORM_SCHEMA as any),
    defaultValues: {
      name: "",
      orgId: "",
      adminEmail: "",
      adminName: "",
      sendEmail: true,
      enabledModules: [],
      moduleConfigs: {},
      metadata: {
        adminName: "",
        companyWebsite: "",
      },
    },
  });

  const watchedModules = form.watch("enabledModules") || [];
  // Align with shared schema key: "auth" (not "authentication")
  const watchedAuthProviders = form.watch("moduleConfigs.auth.providers");
  const watchedRBAC = watchedModules.includes("rbac");
  const watchedRBACConfig = form.watch("moduleConfigs.rbac") as any;

  useEffect(() => {
    if (!watchedRBAC) return;
    const templates = (permissionTemplates as any[]) || [];
    const businessCatalog = (businessTypes as any[]) || [];
    const current = (form.getValues("moduleConfigs.rbac") as any) || {};
    const next = { ...current };
    let shouldUpdate = false;

    if (templates.length && !current.permissionTemplateId && !current.permissionTemplate) {
      const templateForSeed = templates.find((t: any) => t?.isDefault) ?? templates[0];
      if (templateForSeed?.id) {
        next.permissionTemplateId = templateForSeed.id;
        next.permissionTemplate = templateForSeed.name || templateForSeed.id;
      }
      shouldUpdate = true;
    }

    if (businessCatalog.length && !current.businessTypeId && !current.businessType) {
      const businessForSeed = businessCatalog.find((b: any) => b?.isDefault) ?? businessCatalog[0];
      if (businessForSeed?.id) {
        next.businessTypeId = businessForSeed.id;
        next.businessType = businessForSeed.name || businessForSeed.id;
      }
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      form.setValue("moduleConfigs.rbac" as any, next as any, { shouldDirty: false });
    }
  }, [watchedRBAC, permissionTemplates, businessTypes, form]);

  const resolveTemplateName = (identifier?: string | null) => {
    const value = (identifier || "").toString();
    if (!value) return "standard";
    const templates = (permissionTemplates as any[]) || [];
    const match = Array.isArray(templates)
      ? templates.find(template => {
          const id = (template.id || "").toString();
          const name = (template.name || "").toString();
          return id === value || name.toLowerCase() === value.toLowerCase();
        })
      : null;
    return match?.name || match?.id || value || "standard";
  };

  const resolveBusinessTypeName = (identifier?: string | null) => {
    const value = (identifier || "").toString();
    if (!value) return "general";
    const catalog = (businessTypes as any[]) || [];
    const match = Array.isArray(catalog)
      ? catalog.find(type => {
          const id = (type.id || "").toString();
          const name = (type.name || "").toString();
          return id === value || name.toLowerCase() === value.toLowerCase();
        })
      : null;
    return match?.name || match?.id || value || "general";
  };

  const rbacTemplateDisplay = resolveTemplateName(
    watchedRBACConfig?.permissionTemplateId || watchedRBACConfig?.permissionTemplate
  );
  const rbacBusinessDisplay = resolveBusinessTypeName(
    watchedRBACConfig?.businessTypeId || watchedRBACConfig?.businessType
  );
  const rbacDefaultRoles = Array.isArray(watchedRBACConfig?.defaultRoles)
    ? (watchedRBACConfig.defaultRoles as string[])
    : [];

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];

    if (currentStep === 0) {
      fieldsToValidate = ["name", "orgId", "adminEmail", "adminName"];
    }

    // Inter-step validations and auto-fixes
    if (currentStep === 1) {
      const mods = (form.getValues("enabledModules") || []) as string[];
      if (mods.includes("rbac") && !mods.includes("auth")) {
        // Auto-enable auth if RBAC selected
        form.setValue("enabledModules", Array.from(new Set([...mods, "auth"])));
        toast({
          title: "RBAC requires Authentication",
          description: "Authentication has been enabled automatically.",
        });
      }
      // Ensure auth has at least one provider for smoother start
      const providers = form.getValues("moduleConfigs.auth.providers") as any[] | undefined;
      const hasAuth = (form.getValues("enabledModules") || []).includes("auth");
      if (hasAuth && (!providers || providers.length === 0)) {
        form.setValue("moduleConfigs.auth.providers", ["local"] as any);
      }
    }
    if (currentStep === 2) {
      const mods = (form.getValues("enabledModules") || []) as string[];
      if (mods.includes("rbac")) {
        const roles =
          (form.getValues("moduleConfigs.rbac.defaultRoles") as string[] | undefined) || [];
        if (roles.length === 0) {
          form.setValue(
            "moduleConfigs.rbac.defaultRoles" as any,
            ["Admin", "Manager", "Viewer"] as any
          );
          toast({
            title: "Default roles added",
            description: "We added Admin, Manager, Viewer to get you started.",
          });
        }
      }
    }

    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Module configs transformation: keep keys aligned with shared schema
      const transformedModuleConfigs: any = {};
      Object.entries(data.moduleConfigs || {}).forEach(([key, value]) => {
        // Normalize internal form keys to shared schema keys
        const transformedKey = key === "aiCopilot" ? ("ai-copilot" as const) : (key as string);

        if (transformedKey === "auth" && value && typeof value === "object") {
          const authConfig = value as any;
          const transformedAuth: any = { ...authConfig };

          // Transform providers from simple strings to complex objects
          if (authConfig.providers && Array.isArray(authConfig.providers)) {
            transformedAuth.providers = authConfig.providers.map(
              (providerType: string, index: number) => {
                // Get provider-specific config
                let config: any = {};

                // Map provider keys to form field names within moduleConfigs.auth
                const configKeyMap: Record<string, string> = {
                  "azure-ad": "azureAd",
                  auth0: "auth0",
                  local: "local",
                  saml: "saml",
                };

                const formConfigKey = configKeyMap[providerType];
                if (formConfigKey && authConfig[formConfigKey]) {
                  config = authConfig[formConfigKey];
                }

                return {
                  type: providerType,
                  name: providerType
                    .split("-")
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" "),
                  priority: index + 1,
                  config,
                  userMapping: {
                    emailField: "email",
                    nameField: "name",
                  },
                  enabled: true,
                };
              }
            );

            // Remove the individual provider config objects since they're now in providers array
            delete transformedAuth.auth0;
            delete transformedAuth.azureAd;
            delete transformedAuth.local;
            delete transformedAuth.saml;
          }

          transformedModuleConfigs[transformedKey] = transformedAuth;
        } else {
          // Pass-through other module configs (rbac, logging, etc.)
          transformedModuleConfigs[transformedKey] = value;
        }
      });

      // Enforce dependency at submit time as well
      const selected = Array.from(new Set([...(data.enabledModules || [])])) as string[];
      if (selected.includes("rbac") && !selected.includes("auth")) {
        selected.push("auth");
      }

      // Transform the data to match the API format
      const transformedData = {
        name: data.name,
        orgId: data.orgId,
        adminEmail: data.adminEmail,
        adminName: data.adminName,
        sendEmail: data.sendEmail,
        enabledModules: selected,
        moduleConfigs: transformedModuleConfigs,
        metadata: {
          adminName: data.adminName,
          companyWebsite: data.companyWebsite,
        },
      };

      const tenant = await createTenant.mutateAsync(transformedData as any);

      try {
        sessionStorage.setItem(
          "newTenantData",
          JSON.stringify({
            id: tenant.id,
            name: tenant.name,
            orgId: tenant.orgId,
            adminEmail: tenant.adminEmail,
            emailSent: data.sendEmail !== false,
          })
        );
      } catch {}

      toast({
        title: "Tenant created successfully!",
        description: `Onboarding email has been sent to ${data.adminEmail}`,
      });

      // Redirect to success page
      setLocation("/tenants/success");
    } catch (error) {
      toast({
        title: "Failed to create tenant",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Tenant Onboarding</h1>
        <p className="text-slate-600 mt-2">Set up a new tenant with guided configuration</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  index <= currentStep ? "text-blue-600" : "text-slate-400"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    index < currentStep
                      ? "bg-blue-600 text-white"
                      : index === currentStep
                        ? "bg-blue-100 text-blue-600 border-2 border-blue-600"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs font-medium">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {React.createElement(STEPS[currentStep].icon, { className: "w-5 h-5" })}
                    {STEPS[currentStep].title}
                  </CardTitle>
                  <CardDescription>{STEPS[currentStep].description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Step 1: Basic Information */}
                  {currentStep === 0 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Name *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Acme Corporation"
                                  className="w-full"
                                />
                              </FormControl>
                              <FormDescription>The display name for this tenant</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="orgId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization ID *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="acme-corp" className="w-full" />
                              </FormControl>
                              <FormDescription>
                                Unique identifier (lowercase, hyphens only)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="adminName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Admin Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="John Doe" className="w-full" />
                              </FormControl>
                              <FormDescription>Primary administrator's full name</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="adminEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Admin Email *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="admin@acme.com"
                                  className="w-full"
                                />
                              </FormControl>
                              <FormDescription>Email for onboarding instructions</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Info Banner about Temporary Password */}
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <Shield className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-blue-700">
                              A secure temporary password will be generated and sent to the admin
                              email address. The admin will be required to change it on first login.
                            </p>
                          </div>
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="companyWebsite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Website (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="url"
                                placeholder="https://acme.com"
                                className="w-full"
                              />
                            </FormControl>
                            <FormDescription>Your organization's website URL</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sendEmail"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-slate-50">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Send onboarding email</FormLabel>
                              <FormDescription>
                                Send setup instructions and API keys to the admin email
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Step 2: Module Selection */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="mb-4">
                        <p className="text-sm text-slate-600">
                          Select the modules you want to enable for this tenant. You can always add
                          or remove modules later.
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="enabledModules"
                        render={({ field }) => (
                          <FormItem>
                            <div className="space-y-4">
                              {MODULES.map(module => {
                                const Icon =
                                  typeof module.icon === "string"
                                    ? ICONS[module.icon] || Settings
                                    : (module.icon as any);
                                const isSelected = field.value?.includes(module.id) || false;

                                const handleToggle = () => {
                                  const currentValue = field.value || [];
                                  const newValue = isSelected
                                    ? currentValue.filter(v => v !== module.id)
                                    : [...currentValue, module.id];
                                  field.onChange(newValue);

                                  // Dependency handling: RBAC -> Auth
                                  if (!isSelected && module.id === "rbac") {
                                    const mods = newValue as string[];
                                    if (!mods.includes("auth")) {
                                      const withAuth = Array.from(
                                        new Set([...(mods as string[]), "auth"])
                                      );
                                      field.onChange(withAuth);
                                      toast({
                                        title: "Authentication enabled",
                                        description:
                                          "RBAC depends on Authentication. Enabled automatically.",
                                      });
                                    }
                                    // Seed default RBAC config if missing
                                    const currentRBAC = form.getValues("moduleConfigs.rbac");
                                    if (!currentRBAC) {
                                      const templates = (permissionTemplates as any[]) || [];
                                      const businessCatalog = (businessTypes as any[]) || [];
                                      const templateForSeed =
                                        templates.find((t: any) => t?.isDefault) ?? templates[0];
                                      const businessForSeed =
                                        businessCatalog.find((b: any) => b?.isDefault) ??
                                        businessCatalog[0];

                                      const seed: Record<string, any> = {};
                                      if (templateForSeed?.id) {
                                        seed.permissionTemplateId = templateForSeed.id;
                                        seed.permissionTemplate =
                                          templateForSeed.name || templateForSeed.id;
                                      } else {
                                        seed.permissionTemplate = "standard";
                                      }
                                      if (businessForSeed?.id) {
                                        seed.businessTypeId = businessForSeed.id;
                                        seed.businessType =
                                          businessForSeed.name || businessForSeed.id;
                                      } else {
                                        seed.businessType = "general";
                                      }

                                      form.setValue("moduleConfigs.rbac" as any, seed as any);
                                    }
                                  }

                                  // Prevent disabling Auth when RBAC is selected
                                  if (
                                    isSelected &&
                                    module.id === "auth" &&
                                    (form.getValues("enabledModules") || []).includes("rbac")
                                  ) {
                                    toast({
                                      title: "Cannot disable Authentication",
                                      description:
                                        "RBAC requires Authentication. Disable RBAC first.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                };

                                return (
                                  <div
                                    key={module.id}
                                    className={`relative rounded-lg border-2 p-4 transition-all cursor-pointer hover:shadow-md ${
                                      isSelected
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                                    onClick={handleToggle}
                                  >
                                    <div className="flex items-start space-x-4">
                                      <div
                                        className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center text-white`}
                                      >
                                        <Icon className="w-6 h-6" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <h4 className="font-semibold text-slate-900">
                                            {module.name}
                                          </h4>
                                          <div
                                            className={`w-4 h-4 border rounded ${
                                              isSelected
                                                ? "bg-blue-500 border-blue-500"
                                                : "border-gray-300"
                                            } flex items-center justify-center`}
                                          >
                                            {isSelected && (
                                              <div className="w-2 h-2 bg-white rounded-sm"></div>
                                            )}
                                          </div>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">
                                          {module.description}
                                        </p>
                                        {module.providers && (
                                          <div className="flex flex-wrap gap-2 mt-2">
                                            {module.providers.map(provider => (
                                              <Badge
                                                key={provider}
                                                variant="secondary"
                                                className="text-xs"
                                              >
                                                {provider}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {watchedRBAC && !watchedModules.includes("auth") && (
                              <Alert className="mt-3">
                                <AlertDescription>
                                  RBAC requires Authentication. The wizard will enable Auth
                                  automatically.
                                </AlertDescription>
                              </Alert>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Step 3: Module Configuration */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      {watchedModules.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <Settings className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                          <p>No modules selected. Go back to select modules to configure.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Authentication Module Configuration */}
                          {watchedModules.includes("auth") && (
                            <div className="space-y-4">
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Lock className="w-5 h-5" />
                                Authentication Configuration
                              </h3>
                              <p className="text-sm text-slate-600 -mt-2">
                                Optional during onboarding. You can configure providers later in the
                                tenant portal. Fields marked "SSO-required" are needed for SSO to
                                work immediately.
                              </p>

                              <FormField
                                control={form.control}
                                name="moduleConfigs.auth.providers"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Select Authentication Providers</FormLabel>
                                    <div className="grid grid-cols-2 gap-4">
                                      {["auth0", "azure-ad", "local", "saml"].map(provider => {
                                        const currentProviders = field.value || [];
                                        const isSelected = currentProviders.includes(
                                          provider as any
                                        );

                                        const handleToggle = () => {
                                          const newValue = isSelected
                                            ? currentProviders.filter(v => v !== provider)
                                            : [...currentProviders, provider];
                                          field.onChange(newValue);
                                        };

                                        return (
                                          <div
                                            key={provider}
                                            className={`border rounded-lg p-3 cursor-pointer hover:border-blue-300 transition-colors ${
                                              isSelected
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-slate-200"
                                            }`}
                                            onClick={handleToggle}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium capitalize">
                                                {provider.replace("-", " ").toUpperCase()}
                                              </span>
                                              <div
                                                className={`w-4 h-4 border rounded ${
                                                  isSelected
                                                    ? "bg-blue-500 border-blue-500"
                                                    : "border-gray-300"
                                                } flex items-center justify-center`}
                                              >
                                                {isSelected && (
                                                  <div className="w-2 h-2 bg-white rounded-sm"></div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Auth0 Configuration */}
                              {watchedAuthProviders?.includes("auth0") && (
                                <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                                  <h4 className="font-medium">Auth0 Configuration</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name="moduleConfigs.auth.auth0.domain"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            Domain{" "}
                                            <Badge className="ml-2" variant="secondary">
                                              SSO-required
                                            </Badge>
                                          </FormLabel>
                                          <FormControl>
                                            <Input {...field} placeholder="your-tenant.auth0.com" />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="moduleConfigs.auth.auth0.clientId"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            Client ID{" "}
                                            <Badge className="ml-2" variant="secondary">
                                              SSO-required
                                            </Badge>
                                          </FormLabel>
                                          <FormControl>
                                            <Input {...field} placeholder="Your Auth0 Client ID" />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="moduleConfigs.auth.auth0.clientSecret"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            Client Secret{" "}
                                            <Badge className="ml-2" variant="secondary">
                                              SSO-required
                                            </Badge>
                                          </FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              type="password"
                                              placeholder="Your Auth0 Client Secret"
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Azure AD Configuration */}
                              {watchedAuthProviders?.includes("azure-ad") && (
                                <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                                  <h4 className="font-medium">Azure AD Configuration</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name="moduleConfigs.auth.azureAd.tenantId"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            Tenant ID{" "}
                                            <Badge className="ml-2" variant="secondary">
                                              SSO-required
                                            </Badge>
                                          </FormLabel>
                                          <FormControl>
                                            <Input {...field} placeholder="Your Azure Tenant ID" />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="moduleConfigs.auth.azureAd.clientId"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            Client ID{" "}
                                            <Badge className="ml-2" variant="secondary">
                                              SSO-required
                                            </Badge>
                                          </FormLabel>
                                          <FormControl>
                                            <Input {...field} placeholder="Your Azure Client ID" />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="moduleConfigs.auth.azureAd.clientSecret"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            Client Secret{" "}
                                            <Badge className="ml-2" variant="secondary">
                                              SSO-required
                                            </Badge>
                                          </FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              type="password"
                                              placeholder="Your Azure Client Secret"
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* RBAC Configuration */}
                          {watchedModules.includes("rbac") && (
                            <div className="space-y-5">
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                RBAC Configuration
                              </h3>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="moduleConfigs.rbac.permissionTemplateId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Permission Template</FormLabel>
                                      <Select
                                        value={(field.value as string) || ""}
                                        onValueChange={value => {
                                          field.onChange(value);
                                          const template = (permissionTemplates as any[]).find(
                                            t => {
                                              const name = (t.name || "").toString();
                                              return (
                                                (t.id && t.id === value) ||
                                                name.toLowerCase() === value.toLowerCase()
                                              );
                                            }
                                          );
                                          if (template?.name) {
                                            form.setValue(
                                              "moduleConfigs.rbac.permissionTemplate" as any,
                                              template.name as any
                                            );
                                          } else if (value) {
                                            form.setValue(
                                              "moduleConfigs.rbac.permissionTemplate" as any,
                                              value as any
                                            );
                                          } else {
                                            form.setValue(
                                              "moduleConfigs.rbac.permissionTemplate" as any,
                                              undefined as any
                                            );
                                          }
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(permissionTemplates as any[]).length
                                            ? (permissionTemplates as any[]).map(t => (
                                                <SelectItem
                                                  key={t.id}
                                                  value={(t.id || t.name || "").toString()}
                                                >
                                                  {t.name || t.id}
                                                </SelectItem>
                                              ))
                                            : [
                                                <SelectItem key="standard" value="standard">
                                                  Standard
                                                </SelectItem>,
                                                <SelectItem key="enterprise" value="enterprise">
                                                  Enterprise
                                                </SelectItem>,
                                                <SelectItem key="custom" value="custom">
                                                  Custom
                                                </SelectItem>,
                                              ]}
                                        </SelectContent>
                                      </Select>
                                      <FormDescription>
                                        Choose a base set of permissions for default roles
                                      </FormDescription>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="moduleConfigs.rbac.businessTypeId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Business Type</FormLabel>
                                      <Select
                                        value={(field.value as string) || ""}
                                        onValueChange={value => {
                                          field.onChange(value);
                                          const business = (businessTypes as any[]).find(bt => {
                                            const name = (bt.name || "").toString();
                                            return (
                                              (bt.id && bt.id === value) ||
                                              name.toLowerCase() === value.toLowerCase()
                                            );
                                          });
                                          if (business?.name) {
                                            form.setValue(
                                              "moduleConfigs.rbac.businessType" as any,
                                              business.name as any
                                            );
                                          } else if (value) {
                                            form.setValue(
                                              "moduleConfigs.rbac.businessType" as any,
                                              value as any
                                            );
                                          } else {
                                            form.setValue(
                                              "moduleConfigs.rbac.businessType" as any,
                                              undefined as any
                                            );
                                          }
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select business type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(businessTypes as any[]).length
                                            ? (businessTypes as any[]).map(bt => (
                                                <SelectItem
                                                  key={bt.id}
                                                  value={(bt.id || bt.name || "").toString()}
                                                >
                                                  {bt.name || bt.id}
                                                </SelectItem>
                                              ))
                                            : [
                                                <SelectItem key="general" value="general">
                                                  General
                                                </SelectItem>,
                                                <SelectItem key="healthcare" value="healthcare">
                                                  Healthcare
                                                </SelectItem>,
                                                <SelectItem key="finance" value="finance">
                                                  Finance
                                                </SelectItem>,
                                                <SelectItem key="education" value="education">
                                                  Education
                                                </SelectItem>,
                                                <SelectItem key="government" value="government">
                                                  Government
                                                </SelectItem>,
                                              ]}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                              </div>

                              {/* Template preview */}
                              <div className="border rounded-lg p-4 bg-slate-50">
                                <p className="text-sm text-slate-700 mb-2">Template Preview</p>
                                {Array.isArray(permissionTemplates) &&
                                permissionTemplates.length > 0 ? (
                                  (() => {
                                    const templateIdentifier =
                                      (watchedRBACConfig?.permissionTemplateId as
                                        | string
                                        | undefined) ||
                                      (watchedRBACConfig?.permissionTemplate as
                                        | string
                                        | undefined) ||
                                      "";
                                    const match = (permissionTemplates as any[]).find(t => {
                                      const id = (t.id || "").toString();
                                      const name = (t.name || "").toString();
                                      return (
                                        id === templateIdentifier ||
                                        name.toLowerCase() === templateIdentifier.toLowerCase()
                                      );
                                    });
                                    const permissions = Array.isArray(match?.permissions)
                                      ? (match.permissions as string[])
                                      : [];
                                    const preview = permissions.slice(0, 12);
                                    return preview.length ? (
                                      <div className="flex flex-wrap gap-2">
                                        {preview.map(permission => (
                                          <Badge
                                            key={permission}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {permission}
                                          </Badge>
                                        ))}
                                        {permissions.length > preview.length && (
                                          <Badge variant="secondary" className="text-xs">
                                            +{permissions.length - preview.length} more
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-slate-500 text-sm">
                                        No permissions listed for this template.
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <div className="text-slate-500 text-sm">
                                    Templates will appear here.
                                  </div>
                                )}
                              </div>

                              {/* Default Roles tag editor */}
                              <FormField
                                control={form.control}
                                name="moduleConfigs.rbac.defaultRoles"
                                render={({ field }) => {
                                  const roles: string[] = Array.isArray(field.value)
                                    ? (field.value as string[])
                                    : [];
                                  const [input, setInput] = React.useState("");
                                  const addRole = () => {
                                    const v = input.trim();
                                    if (!v) return;
                                    const next = Array.from(new Set([...(roles as string[]), v]));
                                    field.onChange(next);
                                    setInput("");
                                  };
                                  const removeRole = (name: string) => {
                                    field.onChange((roles as string[]).filter(r => r !== name));
                                  };
                                  return (
                                    <FormItem>
                                      <FormLabel>Default Roles</FormLabel>
                                      <div className="flex flex-wrap gap-2">
                                        {roles.map(r => (
                                          <Badge key={r} variant="secondary" className="px-2 py-1">
                                            <span className="mr-2">{r}</span>
                                            <button
                                              type="button"
                                              className="text-slate-500 hover:text-slate-700"
                                              onClick={() => removeRole(r)}
                                              aria-label={`Remove ${r}`}
                                            >
                                              ×
                                            </button>
                                          </Badge>
                                        ))}
                                      </div>
                                      <div className="flex gap-2 mt-2">
                                        <Input
                                          value={input}
                                          onChange={e => setInput(e.target.value)}
                                          placeholder="Add a role (e.g., Auditor)"
                                          onKeyDown={e => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              addRole();
                                            }
                                          }}
                                        />
                                        <Button type="button" onClick={addRole} variant="secondary">
                                          Add
                                        </Button>
                                      </div>
                                      <FormDescription>
                                        These roles will be created for the tenant. Permissions come
                                        from the selected template and can be refined later.
                                      </FormDescription>
                                    </FormItem>
                                  );
                                }}
                              />

                              {/* Optional custom permissions */}
                              <FormField
                                control={form.control}
                                name="moduleConfigs.rbac.customPermissions"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Custom Permissions (optional)</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="comma,separated,permissions"
                                        value={
                                          (Array.isArray(field.value)
                                            ? field.value.join(",")
                                            : "") as any
                                        }
                                        onChange={e =>
                                          field.onChange(
                                            e.target.value
                                              .split(",")
                                              .map(s => s.trim())
                                              .filter(Boolean)
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Extra permissions to add during creation
                                    </FormDescription>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}

                          {/* Logging Configuration */}
                          {watchedModules.includes("logging") && (
                            <div className="space-y-4">
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                Logging Configuration
                              </h3>

                              <FormField
                                control={form.control}
                                name="moduleConfigs.logging.levels"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Log Levels</FormLabel>
                                    <div className="grid grid-cols-3 gap-4">
                                      {["error", "warn", "info", "debug", "trace"].map(level => {
                                        const currentLevels = field.value || [];
                                        const isSelected = currentLevels.includes(level as any);

                                        const handleToggle = () => {
                                          const newValue = isSelected
                                            ? currentLevels.filter(v => v !== level)
                                            : [...currentLevels, level];
                                          field.onChange(newValue);
                                        };

                                        return (
                                          <div
                                            key={level}
                                            className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded"
                                            onClick={handleToggle}
                                          >
                                            <div
                                              className={`w-4 h-4 border rounded ${
                                                isSelected
                                                  ? "bg-blue-500 border-blue-500"
                                                  : "border-gray-300"
                                              } flex items-center justify-center`}
                                            >
                                              {isSelected && (
                                                <div className="w-2 h-2 bg-white rounded-sm"></div>
                                              )}
                                            </div>
                                            <Label className="capitalize cursor-pointer">
                                              {level}
                                            </Label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <FormDescription>
                                      Select which log levels to capture
                                    </FormDescription>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}

                          {/* Notifications Configuration */}
                          {watchedModules.includes("notifications") && (
                            <div className="space-y-4">
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Bell className="w-5 h-5" />
                                Notifications Configuration
                              </h3>

                              <FormField
                                control={form.control}
                                name="moduleConfigs.notifications.channels"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Notification Channels</FormLabel>
                                    <div className="grid grid-cols-2 gap-4">
                                      {["email", "sms", "push", "webhook"].map(channel => {
                                        const currentChannels = field.value || [];
                                        const isSelected = currentChannels.includes(channel as any);

                                        const handleToggle = () => {
                                          const newValue = isSelected
                                            ? currentChannels.filter(v => v !== channel)
                                            : [...currentChannels, channel];
                                          field.onChange(newValue);
                                        };

                                        return (
                                          <div
                                            key={channel}
                                            className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded"
                                            onClick={handleToggle}
                                          >
                                            <div
                                              className={`w-4 h-4 border rounded ${
                                                isSelected
                                                  ? "bg-blue-500 border-blue-500"
                                                  : "border-gray-300"
                                              } flex items-center justify-center`}
                                            >
                                              {isSelected && (
                                                <div className="w-2 h-2 bg-white rounded-sm"></div>
                                              )}
                                            </div>
                                            <Label className="capitalize cursor-pointer">
                                              {channel}
                                            </Label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}

                          {/* AI Copilot Configuration */}
                          {watchedModules.includes("aiCopilot") && (
                            <div className="space-y-4">
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Bot className="w-5 h-5" />
                                AI Copilot Configuration
                              </h3>

                              <FormField
                                control={form.control}
                                name="moduleConfigs.aiCopilot.provider"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>AI Provider</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select AI provider" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="openai">OpenAI</SelectItem>
                                        <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
                                        <SelectItem value="anthropic">Anthropic</SelectItem>
                                        <SelectItem value="google">Google AI</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="moduleConfigs.aiCopilot.model"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Model</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g., gpt-4, claude-3" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4: Review */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                        <h3 className="font-semibold text-lg">Summary</h3>

                        <div className="space-y-3">
                          <div>
                            <span className="text-sm text-slate-600">Organization:</span>
                            <p className="font-medium">{form.getValues("name")}</p>
                          </div>

                          <div>
                            <span className="text-sm text-slate-600">Organization ID:</span>
                            <p className="font-mono text-sm">{form.getValues("orgId")}</p>
                          </div>

                          <div>
                            <span className="text-sm text-slate-600">Admin:</span>
                            <p className="font-medium">
                              {form.getValues("adminName")} ({form.getValues("adminEmail")})
                            </p>
                          </div>

                          <div>
                            <span className="text-sm text-slate-600">Selected Modules:</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {watchedModules.map(moduleId => {
                                const module = MODULES.find(m => m.id === moduleId);
                                return (
                                  <Badge key={moduleId} variant="secondary">
                                    {module?.name}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>

                          {watchedModules.includes("auth") && watchedAuthProviders?.length > 0 && (
                            <div>
                              <span className="text-sm text-slate-600">
                                Authentication Providers:
                              </span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {watchedAuthProviders.map(provider => (
                                  <Badge key={provider} variant="outline">
                                    {provider.replace("-", " ").toUpperCase()}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {watchedModules.includes("rbac") && (
                            <div>
                              <span className="text-sm text-slate-600">RBAC:</span>
                              <div className="mt-2 space-y-1 text-sm">
                                <div>
                                  Template: <strong>{rbacTemplateDisplay}</strong>
                                </div>
                                <div>
                                  Business Type: <strong>{rbacBusinessDisplay}</strong>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span>Default Roles:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {rbacDefaultRoles.length ? (
                                      rbacDefaultRoles.map(role => (
                                        <Badge key={role} variant="secondary">
                                          {role}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-slate-500">None</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>What happens next:</strong> After clicking "Onboard Tenant", an
                          email will be sent to {form.getValues("adminEmail")} with:
                        </p>
                        <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
                          <li>Integration guides for selected modules</li>
                          <li>API keys and credentials</li>
                          <li>Tenant portal access link</li>
                          <li>Tenant ID and configuration details</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext} className="flex items-center gap-2">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={createTenant.isPending}
                  className="flex items-center gap-2"
                >
                  {createTenant.isPending ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Onboard Tenant
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
