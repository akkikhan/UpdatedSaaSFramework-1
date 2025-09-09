import React, { useState, useEffect } from "react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Settings,
  CheckCircle,
  Users,
  Shield,
  Bell,
  Bot,
  Activity,
  Lock,
  Globe,
  FileText,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MODULES_INFO, type TenantCreationData } from "../../../shared/types";
import { useCreateTenant } from "@/hooks/use-tenants";
import { useToast } from "@/hooks/use-toast";
import { transformTenantFormData } from "@/utils/tenant-form-transform";

// Wizard form schema
const AUTH_PROVIDER = z.enum(["local", "azure-ad", "auth0", "saml"]);
const LOG_LEVEL = z.enum(["error", "warn", "info", "debug", "trace"]);
const NOTIFICATION_CHANNEL = z.enum(["email", "sms", "webhook"]);

const WIZARD_FORM_SCHEMA = z
  .object({
    name: z.string().min(1, "Organization name is required"),
    orgId: z
      .string()
      .min(1, "Organization ID is required")
      .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
    adminEmail: z.string().email("Valid email address required"),
    adminName: z.string().min(1, "Admin name is required"),
    sendEmail: z.boolean().optional(),
    companyWebsite: z.string().optional(),
    enabledModules: z.array(z.string()).optional(),
    moduleConfigs: z.object({
      authentication: z.object({
        providers: z.array(AUTH_PROVIDER).default([]),
        azureAd: z
          .object({
            tenantId: z.string().min(1, "Tenant ID is required"),
            clientId: z.string().min(1, "Client ID is required"),
            clientSecret: z.string().min(1, "Client secret is required"),
          })
          .partial(),
        auth0: z
          .object({
            domain: z.string().min(1, "Domain is required"),
            clientId: z.string().min(1, "Client ID is required"),
            clientSecret: z.string().min(1, "Client secret is required"),
            audience: z.string().optional(),
          })
          .partial(),
        saml: z
          .object({
            entryPoint: z.string().min(1, "Entry Point URL is required"),
            issuer: z.string().min(1, "Issuer is required"),
            cert: z.string().min(1, "Certificate is required"),
            callbackUrl: z.string().min(1, "Callback URL is required"),
          })
          .partial(),
      }),
      rbac: z.object({
        permissionTemplate: z.string().min(1, "Permission template is required"),
        businessType: z.string().min(1, "Business type is required"),
        defaultRoles: z.array(z.string()).min(1, "Select at least one default role"),
        customPermissions: z.string().optional(),
      }),
      logging: z.object({
        levels: z.array(LOG_LEVEL).min(1, "Select at least one log level"),
        notificationChannels: z.array(NOTIFICATION_CHANNEL).optional(),
      }),
    }),
    metadata: z
      .object({
        adminName: z.string().optional(),
        companyWebsite: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Authentication provider config validation
    if (data.enabledModules?.includes("auth")) {
      const auth = data.moduleConfigs?.authentication;
      if (!auth.providers || auth.providers.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Select at least one authentication provider",
          path: ["moduleConfigs", "authentication", "providers"],
        });
      }
      if (auth.providers?.includes("azure-ad")) {
        if (!auth.azureAd?.tenantId) {
          ctx.addIssue({
            code: "custom",
            message: "Tenant ID is required",
            path: ["moduleConfigs", "authentication", "azureAd", "tenantId"],
          });
        }
        if (!auth.azureAd?.clientId) {
          ctx.addIssue({
            code: "custom",
            message: "Client ID is required",
            path: ["moduleConfigs", "authentication", "azureAd", "clientId"],
          });
        }
        if (!auth.azureAd?.clientSecret) {
          ctx.addIssue({
            code: "custom",
            message: "Client secret is required",
            path: ["moduleConfigs", "authentication", "azureAd", "clientSecret"],
          });
        }
      }
      if (auth.providers?.includes("auth0")) {
        if (!auth.auth0?.domain) {
          ctx.addIssue({
            code: "custom",
            message: "Domain is required",
            path: ["moduleConfigs", "authentication", "auth0", "domain"],
          });
        }
        if (!auth.auth0?.clientId) {
          ctx.addIssue({
            code: "custom",
            message: "Client ID is required",
            path: ["moduleConfigs", "authentication", "auth0", "clientId"],
          });
        }
        if (!auth.auth0?.clientSecret) {
          ctx.addIssue({
            code: "custom",
            message: "Client secret is required",
            path: ["moduleConfigs", "authentication", "auth0", "clientSecret"],
          });
        }
      }
      if (auth.providers?.includes("saml")) {
        if (!auth.saml?.entryPoint) {
          ctx.addIssue({
            code: "custom",
            message: "Entry Point URL is required",
            path: ["moduleConfigs", "authentication", "saml", "entryPoint"],
          });
        }
        if (!auth.saml?.issuer) {
          ctx.addIssue({
            code: "custom",
            message: "Issuer is required",
            path: ["moduleConfigs", "authentication", "saml", "issuer"],
          });
        }
        if (!auth.saml?.cert) {
          ctx.addIssue({
            code: "custom",
            message: "Certificate is required",
            path: ["moduleConfigs", "authentication", "saml", "cert"],
          });
        }
        if (!auth.saml?.callbackUrl) {
          ctx.addIssue({
            code: "custom",
            message: "Callback URL is required",
            path: ["moduleConfigs", "authentication", "saml", "callbackUrl"],
          });
        }
      }
    }

    // RBAC config validation
    if (data.enabledModules?.includes("rbac")) {
      const rbac = data.moduleConfigs?.rbac;
      if (!rbac.permissionTemplate) {
        ctx.addIssue({
          code: "custom",
          message: "Permission template is required",
          path: ["moduleConfigs", "rbac", "permissionTemplate"],
        });
      }
      if (!rbac.businessType) {
        ctx.addIssue({
          code: "custom",
          message: "Business type is required",
          path: ["moduleConfigs", "rbac", "businessType"],
        });
      }
      if (!rbac.defaultRoles || rbac.defaultRoles.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Select at least one default role",
          path: ["moduleConfigs", "rbac", "defaultRoles"],
        });
      }
    }

    // Logging config validation
    if (data.enabledModules?.includes("logging")) {
      const logging = data.moduleConfigs?.logging;
      if (!logging.levels || logging.levels.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Select at least one log level",
          path: ["moduleConfigs", "logging", "levels"],
        });
      }
    }
  });

type FormData = z.infer<typeof WIZARD_FORM_SCHEMA>;

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

const MODULES = Object.values(MODULES_INFO);

const ICONS: Record<string, React.ComponentType<any>> = {
  Lock,
  Shield,
  Bell,
  Bot,
  Users,
  Activity,
  Building2,
  Settings,
  CheckCircle,
};

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createTenant = useCreateTenant();

  const form = useForm<FormData>({
    resolver: zodResolver(WIZARD_FORM_SCHEMA),
    defaultValues: {
      name: "",
      orgId: "",
      adminEmail: "",
      adminName: "",
      sendEmail: true,
      companyWebsite: "",
      enabledModules: [],
      moduleConfigs: {
        authentication: { providers: [] },
        rbac: {
          permissionTemplate: "",
          businessType: "",
          defaultRoles: [],
          customPermissions: "",
        },
        logging: { levels: [], notificationChannels: [] },
      },
      metadata: {
        adminName: "",
        companyWebsite: "",
      },
    },
  });

  const watchedModules = form.watch("enabledModules") || [];

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];

    if (currentStep === 0) {
      fieldsToValidate = ["name", "orgId", "adminEmail", "adminName"];
    }

    let isValid;
    if (fieldsToValidate.length > 0) {
      isValid = await form.trigger(fieldsToValidate as any);
    } else {
      isValid = await form.trigger();
    }

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
      const transformedData = transformTenantFormData(data);
      const result = await createTenant.mutateAsync(transformedData as any);

      toast({
        title: "Tenant created successfully!",
        description: result?.emailSent
          ? `Onboarding email has been sent to ${data.adminEmail}`
          : "Tenant created but failed to send onboarding email",
        variant: result?.emailSent ? undefined : "destructive",
      });

      setLocation("/tenants");
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
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-80 bg-gray-50 border-r border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">Tenant Setup</h1>
            <p className="text-sm text-gray-600 mt-1">Configure your new organization</p>
          </div>

          <div className="p-6">
            {/* Progress Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-500">
                  {currentStep + 1} of {STEPS.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step Navigation */}
            <nav className="space-y-2">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const isAccessible = index <= currentStep;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center p-3 rounded-md transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-50 border border-blue-200 text-blue-700"
                        : isCompleted
                          ? "bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
                          : isAccessible
                            ? "border border-gray-200 text-gray-700 hover:bg-gray-50"
                            : "border border-gray-100 text-gray-400"
                    }`}
                    onClick={() => isAccessible && setCurrentStep(index)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        isCompleted
                          ? "bg-green-600 text-white"
                          : isActive
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{step.title}</div>
                      <div className="text-xs opacity-75">{step.description}</div>
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="p-8">
            {/* Dynamic Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                {React.createElement(STEPS[currentStep].icon, {
                  className: "w-6 h-6 text-blue-600",
                })}
                {STEPS[currentStep].title}
              </h2>
              <p className="text-gray-600 mt-2">{STEPS[currentStep].description}</p>
            </div>

            {/* Form Content */}
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
                    <Card className="border border-gray-200 shadow-sm bg-white">
                      <CardContent className="p-8 space-y-6">
                        {/* Step 1: Basic Information */}
                        {currentStep === 0 && (
                          <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                                    <FormDescription>
                                      The display name for this tenant
                                    </FormDescription>
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
                                      <Input
                                        {...field}
                                        placeholder="acme-corp"
                                        className="w-full"
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Unique identifier (lowercase, hyphens only)
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              <FormField
                                control={form.control}
                                name="adminName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Admin Name *</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="John Doe" className="w-full" />
                                    </FormControl>
                                    <FormDescription>
                                      Primary administrator's full name
                                    </FormDescription>
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
                                    <FormDescription>
                                      Email for onboarding instructions
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
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
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-200 p-4 bg-gray-50">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
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
                            <FormField
                              control={form.control}
                              name="enabledModules"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                                      };

                                      return (
                                        <div
                                          key={module.id}
                                          className={`relative rounded-xl border-2 p-6 transition-all cursor-pointer hover:shadow-lg hover:scale-105 min-h-[180px] ${
                                            isSelected
                                              ? "border-blue-500 bg-blue-50 shadow-md"
                                              : "border-slate-200 hover:border-slate-300 bg-white"
                                          }`}
                                          onClick={handleToggle}
                                        >
                                          <div className="flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-4">
                                              <div
                                                className={`w-14 h-14 rounded-xl ${module.color} flex items-center justify-center text-white shadow-lg`}
                                              >
                                                <Icon className="w-7 h-7" />
                                              </div>
                                              <div
                                                className={`w-5 h-5 border-2 rounded-full ${
                                                  isSelected
                                                    ? "bg-blue-500 border-blue-500"
                                                    : "border-gray-300"
                                                } flex items-center justify-center transition-all`}
                                              >
                                                {isSelected && (
                                                  <CheckCircle className="w-3 h-3 text-white" />
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex-1">
                                              <h4 className="font-bold text-slate-900 text-lg mb-2">
                                                {module.name}
                                              </h4>
                                              <p className="text-sm text-slate-600 leading-relaxed">
                                                {module.description}
                                              </p>
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
                              <>
                                {watchedModules.includes("auth") && (
                                  <AuthModuleConfig form={form} />
                                )}
                                {watchedModules.includes("rbac") && (
                                  <RBACModuleConfig form={form} />
                                )}
                                {watchedModules.includes("logging") && (
                                  <LoggingModuleConfig form={form} />
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Step 4: Review */}
                        {currentStep === 3 && (
                          <div className="space-y-6">
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
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-sm text-blue-800">
                                <strong>What happens next:</strong> After clicking "Onboard Tenant",
                                an email will be sent to {form.getValues("adminEmail")} with:
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
                <div className="flex justify-between pt-6 border-t border-gray-200 bg-white p-6 rounded-lg">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className="flex items-center gap-2 px-6"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>

                  {currentStep < STEPS.length - 1 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-2 px-6"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Button
                        type="submit"
                        disabled={createTenant.isPending}
                        className="flex items-center gap-2 px-6 bg-green-600 hover:bg-green-700"
                      >
                        {createTenant.isPending ? (
                          "Creating..."
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
        </div>
      </div>
    </div>
  );
}

// ----------------------------
// Module configuration forms
// ----------------------------

const AuthModuleConfig: React.FC<{ form: any }> = ({ form }) => {
  const selectedProviders =
    form.watch("moduleConfigs.authentication.providers") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Authentication Configuration
        </CardTitle>
        <CardDescription>
          Configure authentication providers and settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="moduleConfigs.authentication.providers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Authentication Providers</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "local", name: "Username/Password", desc: "Traditional email/password" },
                  { id: "azure-ad", name: "Azure AD", desc: "Microsoft Azure Active Directory" },
                  { id: "auth0", name: "Auth0", desc: "Auth0 identity platform" },
                  { id: "saml", name: "SAML", desc: "SAML 2.0 Single Sign-On" },
                ].map(provider => {
                  const isSelected = field.value?.includes(provider.id) || false;
                  return (
                    <div
                      key={provider.id}
                      className={`border rounded-lg p-3 cursor-pointer ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      }`}
                      onClick={() => {
                        const current = field.value || [];
                        const updated = isSelected
                          ? current.filter((p: string) => p !== provider.id)
                          : [...current, provider.id];
                        field.onChange(updated);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox checked={isSelected} readOnly />
                        <div>
                          <div className="font-medium text-sm">{provider.name}</div>
                          <div className="text-xs text-gray-600">{provider.desc}</div>
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

        {selectedProviders.includes("azure-ad") && <AzureADConfig form={form} />}
        {selectedProviders.includes("auth0") && <Auth0Config form={form} />}
        {selectedProviders.includes("saml") && <SAMLConfig form={form} />}
        {selectedProviders.includes("local") && <LocalAuthConfig />}
      </CardContent>
    </Card>
  );
};

const AzureADConfig: React.FC<{ form: any }> = ({ form }) => (
  <div className="border rounded-lg p-4 bg-blue-50">
    <h4 className="font-medium mb-4 flex items-center gap-2">
      <Globe className="w-4 h-4" /> Azure AD Configuration
    </h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="moduleConfigs.authentication.azureAd.tenantId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tenant ID *</FormLabel>
            <FormControl>
              <Input placeholder="00000000-0000-0000-0000-000000000000" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="moduleConfigs.authentication.azureAd.clientId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client ID *</FormLabel>
            <FormControl>
              <Input placeholder="Application (client) ID" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="moduleConfigs.authentication.azureAd.clientSecret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client Secret *</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Client secret value" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  </div>
);

const Auth0Config: React.FC<{ form: any }> = ({ form }) => (
  <div className="border rounded-lg p-4 bg-orange-50">
    <h4 className="font-medium mb-4">Auth0 Configuration</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="moduleConfigs.authentication.auth0.domain"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Domain *</FormLabel>
            <FormControl>
              <Input placeholder="your-domain.auth0.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="moduleConfigs.authentication.auth0.clientId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client ID *</FormLabel>
            <FormControl>
              <Input placeholder="Client ID" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="moduleConfigs.authentication.auth0.clientSecret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client Secret *</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Client Secret" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="moduleConfigs.authentication.auth0.audience"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Audience</FormLabel>
            <FormControl>
              <Input placeholder="https://api.example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  </div>
);

const SAMLConfig: React.FC<{ form: any }> = ({ form }) => (
  <div className="border rounded-lg p-4 bg-green-50">
    <h4 className="font-medium mb-4">SAML Configuration</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="moduleConfigs.authentication.saml.entryPoint"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Entry Point URL *</FormLabel>
            <FormControl>
              <Input placeholder="https://idp.example.com/saml/sso" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="moduleConfigs.authentication.saml.issuer"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Issuer *</FormLabel>
            <FormControl>
              <Input placeholder="urn:your-app" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
    <FormField
      control={form.control}
      name="moduleConfigs.authentication.saml.cert"
      render={({ field }) => (
        <FormItem className="mt-4">
          <FormLabel>Certificate (PEM) *</FormLabel>
          <FormControl>
            <Textarea placeholder="-----BEGIN CERTIFICATE-----" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

const LocalAuthConfig: React.FC = () => (
  <div className="border rounded-lg p-4 bg-gray-50">
    <Alert>
      <CheckCircle className="h-4 w-4" />
      <AlertDescription>
        Default password policies will be applied. Advanced settings can be
        configured after deployment.
      </AlertDescription>
    </Alert>
  </div>
);

const RBACModuleConfig: React.FC<{ form: any }> = ({ form }) => {
  const roles = form.watch("moduleConfigs.rbac.defaultRoles") || [];
  const [roleInput, setRoleInput] = useState("");

  const addRole = () => {
    const value = roleInput.trim();
    if (!value) return;
    form.setValue("moduleConfigs.rbac.defaultRoles", [...roles, value]);
    setRoleInput("");
  };

  const removeRole = (role: string) => {
    form.setValue(
      "moduleConfigs.rbac.defaultRoles",
      roles.filter((r: string) => r !== role)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" /> RBAC Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="moduleConfigs.rbac.permissionTemplate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Permission Template</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose a base set of permissions for default roles
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="moduleConfigs.rbac.businessType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <FormLabel>Template Preview</FormLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            {["Admin", "Manager", "Viewer"].map(role => (
              <Card key={role} className="p-4">
                <div className="font-medium">{role}</div>
                <div className="text-xs text-slate-600">
                  {role} role permissions
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <FormLabel>Default Roles</FormLabel>
          <div className="flex gap-2 mt-2">
            <Input
              value={roleInput}
              onChange={e => setRoleInput(e.target.value)}
              placeholder="Add a role"
            />
            <Button type="button" variant="secondary" onClick={addRole}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {roles.map((role: string) => (
              <Badge key={role} variant="secondary" className="flex items-center gap-1">
                {role}
                <button
                  type="button"
                  className="ml-1"
                  onClick={() => removeRole(role)}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="moduleConfigs.rbac.customPermissions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Permissions (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="permission_one, permission_two" {...field} />
              </FormControl>
              <FormDescription>
                Comma separated list of additional permissions
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

const LoggingModuleConfig: React.FC<{ form: any }> = ({ form }) => {
  const logLevels = [
    { id: "error", label: "Error" },
    { id: "warn", label: "Warn" },
    { id: "info", label: "Info" },
    { id: "debug", label: "Debug" },
    { id: "trace", label: "Trace" },
  ];

  const channels = [
    { id: "email", label: "Email" },
    { id: "sms", label: "SMS" },
    { id: "webhook", label: "Webhook" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" /> Logging Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="moduleConfigs.logging.levels"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select log levels to capture</FormLabel>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {logLevels.map(level => {
                  const isChecked = field.value?.includes(level.id);
                  return (
                    <div key={level.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`level-${level.id}`}
                        checked={isChecked}
                        onCheckedChange={checked => {
                          const current = field.value || [];
                          const updated = checked
                            ? [...current, level.id]
                            : current.filter((l: string) => l !== level.id);
                          field.onChange(updated);
                        }}
                      />
                      <Label htmlFor={`level-${level.id}`}>{level.label}</Label>
                    </div>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="moduleConfigs.logging.notificationChannels"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notification Channels</FormLabel>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {channels.map(ch => {
                  const isChecked = field.value?.includes(ch.id);
                  return (
                    <div key={ch.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`channel-${ch.id}`}
                        checked={isChecked}
                        onCheckedChange={checked => {
                          const current = field.value || [];
                          const updated = checked
                            ? [...current, ch.id]
                            : current.filter((l: string) => l !== ch.id);
                          field.onChange(updated);
                        }}
                      />
                      <Label htmlFor={`channel-${ch.id}`}>{ch.label}</Label>
                    </div>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
