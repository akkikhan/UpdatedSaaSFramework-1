import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateTenant } from "@/hooks/use-tenants";

const formSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  orgId: z.string().min(2, "Organization ID must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Organization ID can only contain lowercase letters, numbers, and hyphens"),
  adminEmail: z.string().email("Please enter a valid email address"),
  sendEmail: z.boolean().default(true),
  enabledModules: z.array(z.enum(["auth", "rbac", "azure-ad", "auth0"])).default(["auth", "rbac"]),
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
  }).default({}),
});

type FormData = z.infer<typeof formSchema>;

interface AddTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddTenantModal({ open, onOpenChange }: AddTenantModalProps) {
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
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  // Auto-generate org ID from org name
  const handleNameChange = (value: string) => {
    const orgId = value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    form.setValue('orgId', orgId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="add-tenant-modal">
        <DialogHeader>
          <DialogTitle>Add New Tenant</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name *</FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orgId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization ID (URL Slug) *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="acme-corp"
                      {...field}
                      data-testid="input-org-id"
                    />
                  </FormControl>
                  <FormDescription>
                    Used in URLs: /tenant/{"{orgId}"}/login
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
                      type="email"
                      placeholder="admin@acme.com"
                      {...field}
                      data-testid="input-admin-email"
                    />
                  </FormControl>
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
                    <FormLabel>Send onboarding email immediately</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <Separator className="my-6" />

            {/* Module Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Authentication & Authorization Modules</h3>
              
              <FormField
                control={form.control}
                name="enabledModules"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-1 gap-4">
                      {/* Core Auth Module */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center space-x-2">
                            <Checkbox checked={true} disabled />
                            <span>Core Authentication (Required)</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-slate-600">Basic JWT authentication and user management</p>
                        </CardContent>
                      </Card>

                      {/* RBAC Module */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center space-x-2">
                            <FormField
                              control={form.control}
                              name="enabledModules"
                              render={({ field }) => (
                                <Checkbox
                                  checked={field.value?.includes("rbac")}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current.filter(m => m !== "rbac"), "rbac"]);
                                    } else {
                                      field.onChange(current.filter(m => m !== "rbac"));
                                    }
                                  }}
                                  data-testid="checkbox-rbac-module"
                                />
                              )}
                            />
                            <span>Role-Based Access Control (RBAC)</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-slate-600">Advanced role and permission management system</p>
                        </CardContent>
                      </Card>

                      {/* Azure AD Module */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center space-x-2">
                            <FormField
                              control={form.control}
                              name="enabledModules"
                              render={({ field }) => (
                                <Checkbox
                                  checked={field.value?.includes("azure-ad")}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current.filter(m => m !== "azure-ad"), "azure-ad"]);
                                    } else {
                                      field.onChange(current.filter(m => m !== "azure-ad"));
                                    }
                                  }}
                                  data-testid="checkbox-azure-ad-module"
                                />
                              )}
                            />
                            <span>Azure Active Directory Integration</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-slate-600 mb-3">Single sign-on with Microsoft Azure AD</p>
                          
                          {form.watch("enabledModules")?.includes("azure-ad") && (
                            <div className="space-y-3 border-t pt-3">
                              <FormField
                                control={form.control}
                                name="moduleConfigs.azure-ad.tenantId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Azure Tenant ID *</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                        {...field}
                                        data-testid="input-azure-tenant-id"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="moduleConfigs.azure-ad.clientId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Client ID *</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Application (client) ID"
                                        {...field}
                                        data-testid="input-azure-client-id"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="moduleConfigs.azure-ad.clientSecret"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Client Secret *</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="password"
                                        placeholder="Client secret value"
                                        {...field}
                                        data-testid="input-azure-client-secret"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Auth0 Module */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center space-x-2">
                            <FormField
                              control={form.control}
                              name="enabledModules"
                              render={({ field }) => (
                                <Checkbox
                                  checked={field.value?.includes("auth0")}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current.filter(m => m !== "auth0"), "auth0"]);
                                    } else {
                                      field.onChange(current.filter(m => m !== "auth0"));
                                    }
                                  }}
                                  data-testid="checkbox-auth0-module"
                                />
                              )}
                            />
                            <span>Auth0 Integration</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-slate-600 mb-3">Universal authentication with Auth0</p>
                          
                          {form.watch("enabledModules")?.includes("auth0") && (
                            <div className="space-y-3 border-t pt-3">
                              <FormField
                                control={form.control}
                                name="moduleConfigs.auth0.domain"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Domain *</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="your-tenant.auth0.com"
                                        {...field}
                                        data-testid="input-auth0-domain"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="moduleConfigs.auth0.clientId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Client ID *</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Auth0 Application Client ID"
                                        {...field}
                                        data-testid="input-auth0-client-id"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="moduleConfigs.auth0.clientSecret"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Client Secret *</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="password"
                                        placeholder="Auth0 Application Client Secret"
                                        {...field}
                                        data-testid="input-auth0-client-secret"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
      </DialogContent>
    </Dialog>
  );
}
