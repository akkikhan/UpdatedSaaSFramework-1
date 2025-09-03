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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  validateTenantCreation,
  type TenantCreationData,
  type ModuleId,
} from "../../../shared/types";
import { transformTenantFormData } from "@/utils/tenant-form-transform";
import { useCreateTenant } from "@/hooks/use-tenants";
import { useToast } from "@/hooks/use-toast";

// Use shared schema for form validation - ensures frontend/backend compatibility
type FormData = TenantCreationData;

const STEPS = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Organization details and admin information",
    icon: Building2,
  },
  {
    id: "modules",
    title: "Module Selection",
    description: "Choose which modules to enable for your tenant",
    icon: Settings,
  },
  {
    id: "configuration",
    title: "Configuration",
    description: "Configure selected modules",
    icon: Zap,
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

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createTenant = useCreateTenant();

  const form = useForm<FormData>({
    resolver: zodResolver(TENANT_CREATION_SCHEMA),
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
  const watchedAuthProviders = form.watch("moduleConfigs.auth.providers") || [];

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];

    if (currentStep === 0) {
      fieldsToValidate = ["name", "orgId", "adminEmail", "adminName"];
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
      console.log("📝 Form data before transformation:", data);

      // Use the transformation utility to ensure correct format
      const transformedData = transformTenantFormData(data);

      // Validate against shared schema
      const validatedData = validateTenantCreation(transformedData);
      console.log("✅ Validation passed:", validatedData);

      await createTenant.mutateAsync(validatedData);

      toast({
        title: "Tenant created successfully!",
        description: `Onboarding email has been sent to ${data.adminEmail}`,
      });

      // Redirect to success page
      setLocation("/tenants/success");
    } catch (error: any) {
      console.error("❌ Tenant creation error:", error);

      // Show detailed validation errors if available
      let errorMessage = "Please try again or contact support";

      if (error?.errors) {
        // Zod validation errors
        const errorDetails = error.errors
          .map((err: any) => `${err.path?.join?.(".") || "Field"}: ${err.message}`)
          .join("\n");
        errorMessage = `Validation errors:\n${errorDetails}`;
      } else if (error?.response?.data?.message) {
        // API error message
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        // General error message
        errorMessage = error.message;
      }

      toast({
        title: "Failed to create tenant",
        description: errorMessage,
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
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>✅ Type-Safe Integration:</strong> This form uses shared schemas to ensure
            frontend and backend use identical data structures. No more 400 validation errors!
          </p>
        </div>
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
              <Card className="min-h-[500px]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {React.createElement(STEPS[currentStep].icon, { className: "w-6 h-6" })}
                    {STEPS[currentStep].title}
                  </CardTitle>
                  <CardDescription>{STEPS[currentStep].description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Step content will be rendered here */}
                  {currentStep === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Acme Corporation" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="orgId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization ID</FormLabel>
                            <FormControl>
                              <Input placeholder="acme-corp" {...field} />
                            </FormControl>
                            <FormDescription>
                              Used in URLs and API endpoints. Only lowercase letters, numbers, and
                              hyphens.
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
                            <FormLabel>Admin Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="admin@acme.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="adminName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Admin Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="metadata.companyWebsite"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Company Website (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://acme.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Step 1: Module Selection - This would render the module selection UI */}
                  {currentStep === 1 && (
                    <div>
                      <p className="text-center text-slate-500 py-8">
                        Module selection UI would be rendered here.
                        <br />
                        For now, proceed to test the schema validation fix.
                      </p>
                    </div>
                  )}

                  {/* Step 2: Configuration - This would render the configuration UI */}
                  {currentStep === 2 && (
                    <div>
                      <p className="text-center text-slate-500 py-8">
                        Module configuration UI would be rendered here.
                      </p>
                    </div>
                  )}

                  {/* Step 3: Review */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Configuration Summary</h3>
                        <pre className="text-sm bg-white p-3 rounded border overflow-auto">
                          {JSON.stringify(form.getValues(), null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
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
              <Button
                type="submit"
                disabled={createTenant.isPending}
                className="flex items-center gap-2"
              >
                {createTenant.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
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
