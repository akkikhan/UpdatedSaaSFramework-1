import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import {
  TenantOnboardingConfig,
  TenantOnboardingConfigSchema,
  validateTenantOnboardingConfig,
} from "../../../shared/tenant-config-interface";
import DynamicModuleForm from "@/components/forms/DynamicModuleForm";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Step {
  id: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Organization details and admin information",
  },
  {
    id: "modules",
    title: "Module Configuration",
    description: "Select and configure modules for your tenant",
  },
  {
    id: "review",
    title: "Review & Create",
    description: "Review configuration and create tenant",
  },
];

export default function ComprehensiveTenantOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedModules, setSelectedModules] = useState<string[]>(["auth", "rbac"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<TenantOnboardingConfig>({
    resolver: zodResolver(TenantOnboardingConfigSchema),
    defaultValues: {
      name: "",
      orgId: "",
      adminEmail: "",
      adminName: "",
      description: "",
      website: "",
      industry: "technology",
      size: "startup",
      timezone: "UTC",
      locale: "en-US",
      modules: {
        auth: {
          enabled: true,
          providers: ["local"],
          providerConfigs: {},
        },
        rbac: {
          enabled: true,
          permissionTemplate: "standard",
          businessType: "general",
        },
      },
      onboarding: {
        sendWelcomeEmail: true,
        enableTutorial: true,
        requireSetup: true,
      },
    },
  });

  const handleModuleToggle = (moduleId: string, enabled: boolean) => {
    if (enabled && !selectedModules.includes(moduleId)) {
      setSelectedModules([...selectedModules, moduleId]);

      // Set default configuration for newly enabled module
      const defaultConfig = getDefaultModuleConfig(moduleId);
      if (defaultConfig) {
        form.setValue(`modules.${moduleId}` as any, defaultConfig);
      }
    } else if (!enabled && selectedModules.includes(moduleId)) {
      setSelectedModules(selectedModules.filter(id => id !== moduleId));

      // Clear module configuration
      form.setValue(`modules.${moduleId}` as any, undefined);
    }
  };

  const getDefaultModuleConfig = (moduleId: string) => {
    const defaults: Record<string, any> = {
      auth: {
        enabled: true,
        providers: ["local"],
        providerConfigs: { local: {} },
      },
      rbac: {
        enabled: true,
        permissionTemplate: "standard",
        businessType: "general",
      },
      logging: {
        enabled: true,
        levels: ["error", "warn", "info"],
        destinations: { database: { enabled: true } },
      },
      notifications: {
        enabled: true,
        channels: ["email"],
        email: {
          enabled: true,
          provider: "smtp",
          fromEmail: form.getValues("adminEmail") || "",
        },
      },
      aiCopilot: {
        enabled: true,
        provider: "openai",
        capabilities: { chatSupport: true },
      },
    };

    return defaults[moduleId];
  };

  const validateCurrentStep = async () => {
    if (currentStep === 0) {
      // Validate basic information
      const isValid = await form.trigger(["name", "orgId", "adminEmail", "adminName"]);
      return isValid;
    }

    if (currentStep === 1) {
      // Validate module configurations
      const requiredFields = getRequiredFieldsForModules(selectedModules);
      const isValid = await form.trigger(requiredFields as any);
      return isValid;
    }

    return true;
  };

  const getRequiredFieldsForModules = (modules: string[]): string[] => {
    const fields: string[] = [];

    if (modules.includes("auth")) {
      fields.push("modules.auth.providers");
      const providers = form.getValues("modules.auth.providers") || [];

      if (providers.includes("azure-ad")) {
        fields.push(
          "modules.auth.providerConfigs.azureAd.tenantId",
          "modules.auth.providerConfigs.azureAd.clientId",
          "modules.auth.providerConfigs.azureAd.clientSecret"
        );
      }

      if (providers.includes("auth0")) {
        fields.push(
          "modules.auth.providerConfigs.auth0.domain",
          "modules.auth.providerConfigs.auth0.clientId",
          "modules.auth.providerConfigs.auth0.clientSecret"
        );
      }
    }

    if (modules.includes("notifications")) {
      fields.push("modules.notifications.email.fromEmail");
    }

    return fields;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();

    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: TenantOnboardingConfig) => {
    try {
      setIsSubmitting(true);

      console.log("🚀 Submitting tenant configuration:", data);

      // Validate the complete configuration
      const validatedConfig = validateTenantOnboardingConfig(data);

      // Here you would call your API
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create tenant");
      }

      const result = await response.json();

      toast({
        title: "Tenant created successfully!",
        description: `Organization "${data.name}" has been set up with your selected modules.`,
      });

      // Redirect to success page
      setLocation(`/tenants/success?id=${result.id}`);
    } catch (error: any) {
      console.error("❌ Tenant creation failed:", error);

      toast({
        title: "Failed to create tenant",
        description: error.message || "Please check your configuration and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Comprehensive Tenant Onboarding</h1>
        <p className="text-gray-600 mt-2">
          Set up your organization with tailored module configurations
        </p>

        {/* Type Safety Indicator */}
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">Type-Safe Configuration</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            This form uses a unified interface that ensures perfect alignment between frontend and
            backend. All configurations are validated before submission.
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <Progress value={progress} className="h-2 mb-4" />
        <div className="flex justify-between">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`text-center ${index <= currentStep ? "text-blue-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-medium ${
                  index < currentStep
                    ? "bg-blue-600 text-white"
                    : index === currentStep
                      ? "bg-blue-100 text-blue-600 border-2 border-blue-600"
                      : "bg-gray-200 text-gray-400"
                }`}
              >
                {index + 1}
              </div>
              <div className="text-xs font-medium">{step.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 0: Basic Information */}
              {currentStep === 0 && <BasicInformationStep form={form} />}

              {/* Step 1: Module Configuration */}
              {currentStep === 1 && (
                <DynamicModuleForm
                  form={form}
                  selectedModules={selectedModules}
                  onModuleToggle={handleModuleToggle}
                />
              )}

              {/* Step 2: Review */}
              {currentStep === 2 && <ReviewStep form={form} selectedModules={selectedModules} />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
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
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Create Tenant
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

// Basic Information Step Component
const BasicInformationStep: React.FC<{
  form: UseFormReturn<TenantOnboardingConfig>;
}> = ({ form }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Information</CardTitle>
        <CardDescription>Basic details about your organization and administrator</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Organization Name *</label>
            <input
              {...form.register("name")}
              className="w-full p-2 border rounded-md"
              placeholder="Acme Corporation"
            />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Organization ID *</label>
            <input
              {...form.register("orgId")}
              className="w-full p-2 border rounded-md"
              placeholder="acme-corp"
            />
            <p className="text-xs text-gray-500 mt-1">Used in URLs and API endpoints</p>
            {form.formState.errors.orgId && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.orgId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Admin Email *</label>
            <input
              {...form.register("adminEmail")}
              type="email"
              className="w-full p-2 border rounded-md"
              placeholder="admin@acme.com"
            />
            {form.formState.errors.adminEmail && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.adminEmail.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Admin Name *</label>
            <input
              {...form.register("adminName")}
              className="w-full p-2 border rounded-md"
              placeholder="John Doe"
            />
            {form.formState.errors.adminName && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.adminName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <input
              {...form.register("website")}
              className="w-full p-2 border rounded-md"
              placeholder="https://acme.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Industry</label>
            <select {...form.register("industry")} className="w-full p-2 border rounded-md">
              <option value="technology">Technology</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="education">Education</option>
              <option value="government">Government</option>
              <option value="retail">Retail</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Review Step Component
const ReviewStep: React.FC<{
  form: UseFormReturn<TenantOnboardingConfig>;
  selectedModules: string[];
}> = ({ form, selectedModules }) => {
  const formValues = form.getValues();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Configuration</CardTitle>
        <CardDescription>Please review your tenant configuration before creation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Organization Summary */}
        <div>
          <h3 className="font-medium mb-2">Organization Details</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <p>
              <strong>Name:</strong> {formValues.name}
            </p>
            <p>
              <strong>ID:</strong> {formValues.orgId}
            </p>
            <p>
              <strong>Admin:</strong> {formValues.adminEmail}
            </p>
            {formValues.website && (
              <p>
                <strong>Website:</strong> {formValues.website}
              </p>
            )}
          </div>
        </div>

        {/* Selected Modules */}
        <div>
          <h3 className="font-medium mb-2">Enabled Modules</h3>
          <div className="flex flex-wrap gap-2">
            {selectedModules.map(moduleId => (
              <span
                key={moduleId}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {moduleId}
              </span>
            ))}
          </div>
        </div>

        {/* Configuration Summary */}
        <div>
          <h3 className="font-medium mb-2">Configuration Summary</h3>
          <div className="bg-gray-50 p-4 rounded-md max-h-64 overflow-y-auto">
            <pre className="text-xs">{JSON.stringify(formValues, null, 2)}</pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
