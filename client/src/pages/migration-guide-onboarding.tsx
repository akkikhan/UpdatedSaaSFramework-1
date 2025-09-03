// Step-by-step migration from existing onboarding wizard to comprehensive interface
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import {
  TenantOnboardingConfig,
  TenantOnboardingConfigSchema,
  validateTenantOnboardingConfig,
} from "../../../shared/tenant-config-interface";
import { transformTenantFormData } from "@/utils/tenant-form-transform";
import { useCreateTenant } from "@/hooks/use-tenants";
import { useToast } from "@/hooks/use-toast";

// MIGRATION STEP 1: Update your existing onboarding wizard component
export default function UpdatedOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedModules, setSelectedModules] = useState<string[]>(["auth", "rbac"]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createTenant = useCreateTenant();

  // MIGRATION STEP 2: Replace your existing form schema with the comprehensive one
  const form = useForm<TenantOnboardingConfig>({
    resolver: zodResolver(TenantOnboardingConfigSchema), // ✅ Use shared schema
    defaultValues: {
      // Basic info (your existing fields)
      name: "",
      orgId: "",
      adminEmail: "",
      adminName: "",

      // Enhanced fields (new)
      website: "",
      industry: "technology",
      size: "startup",

      // Module configurations (comprehensive)
      modules: {
        auth: {
          enabled: true,
          providers: ["local"],
          providerConfigs: {
            local: {
              passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireNumbers: true,
              },
            },
          },
        },
        rbac: {
          enabled: true,
          permissionTemplate: "standard",
          businessType: "general",
        },
      },

      // Onboarding settings
      onboarding: {
        sendWelcomeEmail: true,
        enableTutorial: true,
        requireSetup: true,
      },
    },
  });

  // MIGRATION STEP 3: Update your module toggle logic
  const handleModuleToggle = (moduleId: string, enabled: boolean) => {
    if (enabled && !selectedModules.includes(moduleId)) {
      setSelectedModules([...selectedModules, moduleId]);

      // Set default configuration for the module
      const defaultConfigs: Record<string, any> = {
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

      if (defaultConfigs[moduleId]) {
        form.setValue(`modules.${moduleId}` as any, defaultConfigs[moduleId]);
      }
    } else if (!enabled) {
      setSelectedModules(selectedModules.filter(id => id !== moduleId));
      form.setValue(`modules.${moduleId}` as any, undefined);
    }
  };

  // MIGRATION STEP 4: Enhanced validation for each step
  const validateCurrentStep = async () => {
    if (currentStep === 0) {
      // Basic information validation
      return await form.trigger(["name", "orgId", "adminEmail", "adminName"]);
    }

    if (currentStep === 1) {
      // Module configuration validation
      const fieldsToValidate: string[] = [];

      // Auth module validation
      if (selectedModules.includes("auth")) {
        fieldsToValidate.push("modules.auth.providers");

        const providers = form.getValues("modules.auth.providers") || [];
        if (providers.includes("azure-ad")) {
          fieldsToValidate.push(
            "modules.auth.providerConfigs.azureAd.tenantId",
            "modules.auth.providerConfigs.azureAd.clientId",
            "modules.auth.providerConfigs.azureAd.clientSecret"
          );
        }
        if (providers.includes("auth0")) {
          fieldsToValidate.push(
            "modules.auth.providerConfigs.auth0.domain",
            "modules.auth.providerConfigs.auth0.clientId",
            "modules.auth.providerConfigs.auth0.clientSecret"
          );
        }
      }

      // Notifications module validation
      if (selectedModules.includes("notifications")) {
        fieldsToValidate.push("modules.notifications.email.fromEmail");
      }

      return await form.trigger(fieldsToValidate as any);
    }

    return true;
  };

  // MIGRATION STEP 5: Updated submit function with transformation
  const onSubmit = async (data: TenantOnboardingConfig) => {
    try {
      console.log("📝 Form data before transformation:", data);

      // Apply transformation for backward compatibility
      const transformedData = transformTenantFormData(data);
      console.log("🔄 Transformed data:", transformedData);

      // Validate the final configuration
      const validatedData = validateTenantOnboardingConfig(transformedData);
      console.log("✅ Validated data:", validatedData);

      // Create tenant with comprehensive configuration
      await createTenant.mutateAsync(validatedData);

      toast({
        title: "Tenant created successfully!",
        description: `${data.name} has been configured with ${selectedModules.length} modules.`,
      });

      // Redirect to success page
      setLocation("/tenants/success");
    } catch (error: any) {
      console.error("❌ Tenant creation failed:", error);

      // Enhanced error handling with detailed feedback
      let errorMessage = "Please check your configuration and try again.";

      if (error?.errors) {
        // Zod validation errors - show specific field errors
        const errorList = error.errors.map(
          (err: any) => `${err.path?.join?.(".") || "Field"}: ${err.message}`
        );
        errorMessage = `Configuration errors:\n• ${errorList.join("\n• ")}`;
      } else if (error?.response?.data?.errors) {
        // API validation errors
        const apiErrors = error.response.data.errors.map(
          (err: any) => `${err.path?.join?.(".") || "Field"}: ${err.message}`
        );
        errorMessage = `API validation errors:\n• ${apiErrors.join("\n• ")}`;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Failed to create tenant",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // MIGRATION STEP 6: Enhanced step navigation
  const handleNext = async () => {
    const isValid = await validateCurrentStep();

    if (isValid && currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else if (!isValid) {
      toast({
        title: "Please complete required fields",
        description: "Some required configuration is missing.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Your existing JSX structure can remain the same, just update the form fields
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Your existing header, progress indicator, etc. */}

      {/* Step Content - Replace with comprehensive forms */}
      {currentStep === 0 && <BasicInfoForm form={form} />}

      {currentStep === 1 && (
        <ModuleConfigurationForm
          form={form}
          selectedModules={selectedModules}
          onModuleToggle={handleModuleToggle}
        />
      )}

      {currentStep === 2 && (
        <ReviewConfigurationForm form={form} selectedModules={selectedModules} />
      )}

      {/* Your existing navigation buttons */}
    </div>
  );
}

// MIGRATION STEP 7: Enhanced form components
const BasicInfoForm: React.FC<{ form: any }> = ({ form }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Your existing basic info fields + enhanced fields */}
      <div>
        <label className="block text-sm font-medium mb-1">Organization Name *</label>
        <input
          {...form.register("name")}
          className="w-full p-3 border rounded-lg"
          placeholder="Acme Corporation"
        />
        {form.formState.errors.name && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Add industry and size fields for better targeting */}
      <div>
        <label className="block text-sm font-medium mb-1">Industry</label>
        <select {...form.register("industry")} className="w-full p-3 border rounded-lg">
          <option value="technology">Technology</option>
          <option value="healthcare">Healthcare</option>
          <option value="finance">Finance</option>
          <option value="education">Education</option>
          <option value="retail">Retail</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Company Size</label>
        <select {...form.register("size")} className="w-full p-3 border rounded-lg">
          <option value="startup">Startup (1-10)</option>
          <option value="small">Small (11-50)</option>
          <option value="medium">Medium (51-200)</option>
          <option value="large">Large (201-1000)</option>
          <option value="enterprise">Enterprise (1000+)</option>
        </select>
      </div>
    </div>
  </div>
);

const ModuleConfigurationForm: React.FC<{
  form: any;
  selectedModules: string[];
  onModuleToggle: (moduleId: string, enabled: boolean) => void;
}> = ({ form, selectedModules, onModuleToggle }) => {
  return (
    <div className="space-y-8">
      {/* Module selection grid */}
      <ModuleSelectionGrid selectedModules={selectedModules} onModuleToggle={onModuleToggle} />

      {/* Dynamic configuration forms based on selections */}
      {selectedModules.includes("auth") && <AuthenticationConfig form={form} />}

      {selectedModules.includes("notifications") && <NotificationsConfig form={form} />}

      {/* Add other module configs as needed */}
    </div>
  );
};

// Simplified module selection for migration
const ModuleSelectionGrid: React.FC<{
  selectedModules: string[];
  onModuleToggle: (moduleId: string, enabled: boolean) => void;
}> = ({ selectedModules, onModuleToggle }) => {
  const modules = [
    { id: "auth", name: "Authentication", desc: "User login and security", required: true },
    { id: "rbac", name: "RBAC", desc: "Roles and permissions", required: true },
    { id: "logging", name: "Logging", desc: "Application monitoring", required: false },
    { id: "notifications", name: "Notifications", desc: "Email and alerts", required: false },
    { id: "aiCopilot", name: "AI Copilot", desc: "AI assistance", required: false },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {modules.map(module => {
        const isSelected = selectedModules.includes(module.id);
        return (
          <div
            key={module.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
            } ${module.required ? "opacity-75" : ""}`}
            onClick={() => !module.required && onModuleToggle(module.id, !isSelected)}
          >
            <h3 className="font-medium">{module.name}</h3>
            <p className="text-sm text-gray-600">{module.desc}</p>
            {module.required && <span className="text-xs text-blue-600">Required</span>}
          </div>
        );
      })}
    </div>
  );
};

// Simplified auth config for migration
const AuthenticationConfig: React.FC<{ form: any }> = ({ form }) => (
  <div className="border rounded-lg p-6 bg-blue-50">
    <h3 className="font-medium mb-4">Authentication Configuration</h3>

    {/* Provider selection */}
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Select Providers:</label>
      <div className="grid grid-cols-2 gap-2">
        {["local", "azure-ad", "auth0", "saml"].map(provider => (
          <label key={provider} className="flex items-center gap-2">
            <input type="checkbox" value={provider} {...form.register("modules.auth.providers")} />
            <span className="text-sm">{provider}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Provider-specific configs would go here */}
    <div className="text-sm text-blue-700">
      💡 Provider-specific configurations will be added based on your selections
    </div>
  </div>
);

const NotificationsConfig: React.FC<{ form: any }> = ({ form }) => (
  <div className="border rounded-lg p-6 bg-orange-50">
    <h3 className="font-medium mb-4">Notifications Configuration</h3>

    <div>
      <label className="block text-sm font-medium mb-1">From Email Address *</label>
      <input
        {...form.register("modules.notifications.email.fromEmail")}
        type="email"
        className="w-full p-2 border rounded"
        placeholder="noreply@yourcompany.com"
      />
      {form.formState.errors.modules?.notifications?.email?.fromEmail && (
        <p className="text-red-500 text-sm mt-1">Valid email address required</p>
      )}
    </div>
  </div>
);

const ReviewConfigurationForm: React.FC<{
  form: any;
  selectedModules: string[];
}> = ({ form, selectedModules }) => {
  const formValues = form.getValues();

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="font-medium mb-4">Configuration Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-sm mb-2">Organization</h4>
            <p>Name: {formValues.name}</p>
            <p>ID: {formValues.orgId}</p>
            <p>Admin: {formValues.adminEmail}</p>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Enabled Modules</h4>
            <div className="flex flex-wrap gap-1">
              {selectedModules.map(module => (
                <span key={module} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {module}
                </span>
              ))}
            </div>
          </div>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">View Full Configuration</summary>
          <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto max-h-32">
            {JSON.stringify(formValues, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export { UpdatedOnboardingWizard };
