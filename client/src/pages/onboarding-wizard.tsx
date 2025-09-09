import React, { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { MODULES_INFO } from "../../../shared/types";
import {
  MODULES as MODULE_CONFIG_DEFINITIONS,
  AUTH_PROVIDERS,
} from "../../../shared/modules-config";
import { useCreateTenant } from "@/hooks/use-tenants";
import { useToast } from "@/hooks/use-toast";

// Wizard form schema
const WIZARD_FORM_SCHEMA = z.object({
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
  moduleConfigs: z.any().optional(),
  metadata: z
    .object({
      adminName: z.string().optional(),
      companyWebsite: z.string().optional(),
    })
    .optional(),
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

const MODULE_CONFIG_DEFS = MODULE_CONFIG_DEFINITIONS.map(m => ({
  ...m,
  id: m.id === "authentication" ? "auth" : m.id,
}));

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
      moduleConfigs: {},
      metadata: {
        adminName: "",
        companyWebsite: "",
      },
    },
  });

  const watchedModules = form.watch("enabledModules") || [];
  const watchedAuthProvider = form.watch(
    "moduleConfigs.auth.selectedProvider"
  );

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
      const transformedData = {
        name: data.name,
        orgId: data.orgId,
        adminEmail: data.adminEmail,
        adminName: data.adminName,
        sendEmail: data.sendEmail,
        enabledModules: data.enabledModules || [],
        moduleConfigs: data.moduleConfigs || {},
        metadata: {
          adminName: data.adminName,
          companyWebsite: data.companyWebsite || data.metadata?.companyWebsite,
        },
      };

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
                              watchedModules.map(moduleId => {
                                const def = MODULE_CONFIG_DEFS.find(
                                  m => m.id === moduleId
                                );
                                if (!def?.configFields?.length) return null;
                                return (
                                  <div
                                    key={moduleId}
                                    className="space-y-4 border rounded-lg p-6"
                                  >
                                    <h4 className="text-lg font-medium">
                                      {def.name} Configuration
                                    </h4>
                                    <div className="grid gap-4 md:grid-cols-2">
                                      {def.configFields.map(field => {
                                        const fieldName = `moduleConfigs.${moduleId}.${field.key}` as const;
                                        return (
                                          <FormField
                                            key={field.key}
                                            control={form.control}
                                            name={fieldName as any}
                                            rules={{
                                              required: field.required
                                                ? `${field.label} is required`
                                                : false,
                                            }}
                                            render={({ field: rf }) => (
                                              <FormItem>
                                                <FormLabel>
                                                  {field.label}
                                                  {field.required && " *"}
                                                </FormLabel>
                                                <FormControl>
                                                  {field.type === "select" ? (
                                                    <Select
                                                      onValueChange={rf.onChange}
                                                      defaultValue={rf.value}
                                                    >
                                                      <SelectTrigger>
                                                        <SelectValue placeholder={`Select ${field.label}`} />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {field.options?.map(opt => (
                                                          <SelectItem key={opt} value={opt}>
                                                            {opt}
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                  ) : (
                                                    <Input
                                                      type={
                                                        field.type === "password"
                                                          ? "password"
                                                          : "text"
                                                      }
                                                      placeholder={field.placeholder}
                                                      {...rf}
                                                    />
                                                  )}
                                                </FormControl>
                                                {field.description && (
                                                  <FormDescription>
                                                    {field.description}
                                                  </FormDescription>
                                                )}
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        );
                                      })}
                                    </div>

                                    {moduleId === "auth" && watchedAuthProvider && (
                                      <div className="grid gap-4 md:grid-cols-2 mt-4">
                                        {AUTH_PROVIDERS.find(
                                          p => p.id === watchedAuthProvider
                                        )?.configFields?.map(pf => {
                                          const providerField = `moduleConfigs.auth.providerSettings.${watchedAuthProvider}.${pf.key}` as const;
                                          return (
                                            <FormField
                                              key={pf.key}
                                              control={form.control}
                                              name={providerField as any}
                                              rules={{
                                                required: pf.required
                                                  ? `${pf.label} is required`
                                                  : false,
                                              }}
                                              render={({ field: rf }) => (
                                                <FormItem>
                                                  <FormLabel>
                                                    {pf.label}
                                                    {pf.required && " *"}
                                                  </FormLabel>
                                                  <FormControl>
                                                    {pf.type === "select" ? (
                                                      <Select
                                                        onValueChange={rf.onChange}
                                                        defaultValue={rf.value}
                                                      >
                                                        <SelectTrigger>
                                                          <SelectValue placeholder={`Select ${pf.label}`} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          {pf.options?.map(opt => (
                                                            <SelectItem
                                                              key={opt}
                                                              value={opt}
                                                            >
                                                              {opt}
                                                            </SelectItem>
                                                          ))}
                                                        </SelectContent>
                                                      </Select>
                                                    ) : (
                                                      <Input
                                                        type={
                                                          pf.type === "password"
                                                            ? "password"
                                                            : "text"
                                                        }
                                                        placeholder={pf.placeholder}
                                                        {...rf}
                                                      />
                                                    )}
                                                  </FormControl>
                                                  {pf.description && (
                                                    <FormDescription>
                                                      {pf.description}
                                                    </FormDescription>
                                                  )}
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
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
