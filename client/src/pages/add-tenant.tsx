import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
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
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Key, Mail, Settings } from "lucide-react";
import { useCreateTenant } from "@/hooks/use-tenants";

const formSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  orgId: z.string().min(2, "Organization ID must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Organization ID can only contain lowercase letters, numbers, and hyphens"),
  adminEmail: z.string().email("Please enter a valid email address"),
  sendEmail: z.boolean().default(true),
  enabledModules: z.array(z.enum(["auth", "rbac", "azure-ad", "auth0", "saml"])).default(["auth", "rbac"]),
  moduleConfigs: z.object({
    "azure-ad": z.object({
      tenantId: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      domain: z.string().optional(),
    }).optional(),
    "auth0": z.object({
      domain: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
    }).optional(),
    "saml": z.object({
      entryPoint: z.string().optional(),
      issuer: z.string().optional(),
      cert: z.string().optional(),
    }).optional(),
  }).default({}),
});

type FormData = z.infer<typeof formSchema>;

export default function AddTenantPage() {
  const [, setLocation] = useLocation();
  const createTenant = useCreateTenant();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      orgId: "",
      adminEmail: "",
      sendEmail: true,
      enabledModules: ["auth", "rbac"],
      moduleConfigs: {},
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createTenant.mutateAsync(data);
      setLocation("/tenants");
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  // Auto-generate org ID from org name
  const handleNameChange = (value: string) => {
    const autoOrgId = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    if (!form.getValues("orgId") || form.getValues("orgId") === autoOrgId.slice(0, -1)) {
      form.setValue("orgId", autoOrgId);
    }
  };

  const watchedModules = form.watch("enabledModules");

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/tenants")}
            className="flex items-center gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tenants
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Add New Tenant</h1>
            <p className="text-slate-600">Create a new tenant organization with authentication modules</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Enter the organization details and admin contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Corporation"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleNameChange(e.target.value);
                            }}
                            data-testid="input-org-name"
                          />
                        </FormControl>
                        <FormDescription>
                          The display name for this organization
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
                        <FormLabel>Organization ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="acme-corp"
                            {...field}
                            data-testid="input-org-id"
                          />
                        </FormControl>
                        <FormDescription>
                          Unique identifier (lowercase, numbers, hyphens only)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Administrator Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@acme.com"
                          {...field}
                          data-testid="input-admin-email"
                        />
                      </FormControl>
                      <FormDescription>
                        Primary contact and initial admin user for this tenant
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sendEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-send-email"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Send Welcome Email</FormLabel>
                        <FormDescription>
                          Automatically send onboarding instructions and API keys to the admin
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/tenants")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTenant.isPending}
                data-testid="button-create-tenant"
              >
                {createTenant.isPending ? "Creating..." : "Create Tenant"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}