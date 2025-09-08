import { Link, useParams } from "wouter";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useTenant } from "@/hooks/use-tenants";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const azureSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client secret is required"),
  callbackUrl: z.string().url().optional().or(z.literal("")),
});

type AzureForm = z.infer<typeof azureSchema>;

const auth0Schema = z.object({
  domain: z.string().min(1, "Domain is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client secret is required"),
});

type Auth0Form = z.infer<typeof auth0Schema>;

export default function TenantSSOConfigPage() {
  const { tenantId } = useParams();
  const { data: tenant, isLoading } = useTenant(tenantId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) {
    return <div className="p-6">Loading tenant data...</div>;
  }

  if (!tenant) {
    return <div className="p-6">Tenant not found</div>;
  }

  const authProviders = ((tenant.moduleConfigs as any)?.auth?.providers || []) as any[];
  const existingAzure = authProviders.find(p => p.type === "azure-ad");
  const existingAuth0 = authProviders.find(p => p.type === "auth0");

  const azureForm = useForm<AzureForm>({
    resolver: zodResolver(azureSchema),
    defaultValues: {
      tenantId: existingAzure?.config?.tenantId || "",
      clientId: existingAzure?.config?.clientId || "",
      clientSecret: "",
      callbackUrl: existingAzure?.config?.callbackUrl || "",
    },
  });

  const auth0Form = useForm<Auth0Form>({
    resolver: zodResolver(auth0Schema),
    defaultValues: {
      domain: existingAuth0?.config?.domain || "",
      clientId: existingAuth0?.config?.clientId || "",
      clientSecret: "",
    },
  });

  const azureMutation = useMutation({
    mutationFn: (data: AzureForm) =>
      api.configureTenantAzureAD(tenantId as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId] });
      toast({ title: "Azure AD configured" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to configure Azure AD",
        variant: "destructive",
      });
    },
  });

  const auth0Mutation = useMutation({
    mutationFn: async (data: Auth0Form) => {
      const providers = authProviders.filter(p => p.type !== "auth0");
      providers.push({
        type: "auth0",
        name: "Auth0",
        enabled: true,
        priority: 1,
        config: data,
      });
      const enabledModules = Array.isArray(tenant.enabledModules)
        ? [...tenant.enabledModules]
        : [];
      if (!enabledModules.includes("auth")) enabledModules.push("auth");
      await api.updateTenantModules(tenantId as string, {
        enabledModules,
        moduleConfigs: {
          ...tenant.moduleConfigs,
          auth: { ...(tenant.moduleConfigs as any)?.auth, providers },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId] });
      toast({ title: "Auth0 configured" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to configure Auth0",
        variant: "destructive",
      });
    },
  });

  const statusFor = (type: string) =>
    authProviders.some(p => p.type === type) ? "Active" : "Inactive";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Tenants
          </Button>
        </Link>
        <Link href={`/tenants/${tenant.id}/attention`}>
          <Button variant="ghost">Tenant Settings</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">SSO Configuration</h1>
          <p className="text-slate-600">Manage authentication providers for {tenant.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Azure AD</span>
            <Badge variant={statusFor("azure-ad") === "Active" ? "default" : "destructive"}>
              {statusFor("azure-ad")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...azureForm}>
            <form
              onSubmit={azureForm.handleSubmit(data => azureMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={azureForm.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={azureForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={azureForm.control}
                name="clientSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Secret</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={azureForm.control}
                name="callbackUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Callback URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={azureMutation.isPending}>
                Save Azure AD Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Auth0</span>
            <Badge variant={statusFor("auth0") === "Active" ? "default" : "destructive"}>
              {statusFor("auth0")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...auth0Form}>
            <form
              onSubmit={auth0Form.handleSubmit(data => auth0Mutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={auth0Form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={auth0Form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={auth0Form.control}
                name="clientSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Secret</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={auth0Mutation.isPending}>
                Save Auth0 Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

