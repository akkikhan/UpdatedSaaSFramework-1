import { useEffect, useState } from "react";
import { startAzure } from "@saas-framework/auth-client";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTenantLogin } from "@/hooks/use-tenant-auth";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function TenantLogin() {
  const { orgId } = useParams();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const login = useTenantLogin();
  const [tenantName, setTenantName] = useState<string>("");
  const [brandLogoUrl, setBrandLogoUrl] = useState<string>("");
  const [ssoOnly, setSsoOnly] = useState<boolean>(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    (async () => {
      try {
        if (!orgId) return;
        const res = await fetch(`/api/tenants/by-org-id/${orgId}`);
        if (!res.ok) return;
        const data = await res.json();
        setTenantName(data?.name || orgId || "");
        const logo = data?.metadata?.logoUrl || data?.metadata?.brandLogo || "";
        if (logo) setBrandLogoUrl(logo);
        const allowFallback = data?.moduleConfigs?.auth?.allowFallback;
        if (allowFallback === false) setSsoOnly(true);
      } catch {}
    })();
  }, [orgId]);

  const onSubmit = async (data: LoginData) => {
    if (!orgId) return;

    try {
      setError(null);
      const result = await login.mutateAsync({ ...data, orgId });
      // If first login with temp password, force change in-portal
      if ((result as any)?.user?.metadata?.mustChangePassword) {
        setLocation(`/tenant/${orgId}/password/change`);
        return;
      }
      setLocation(`/tenant/${orgId}/dashboard`);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="relative">
          {login.isPending && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-md">
              <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
            </div>
          )}
          <CardHeader className="text-center">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt="Tenant logo" className="w-12 h-12 rounded-lg object-cover mx-auto mb-4 ring-1 ring-slate-200" />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">
                  {(tenantName || orgId || "").substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your {(tenantName || orgId)} tenant portal</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Microsoft SSO */}
            <div className="mb-6">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
                  if (!orgId) return;
                  const returnUrl = `${window.location.origin}/tenant/${orgId}/dashboard`;
                  await startAzure(orgId, { returnUrl });
                }}
              >
                Sign in with Microsoft
              </Button>
              <div className="text-center text-xs text-slate-500 mt-2">Single sign-on via Microsoft Entra ID (Azure AD)</div>
            </div>

            {!ssoOnly && (
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <div className="text-xs text-slate-500">Or use email</div>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
            )}

            {!ssoOnly && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@acme.com"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={login.isPending}
                    data-testid="button-login"
                  >
                    {login.isPending ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-6 text-center text-xs text-slate-600 space-y-2">
              {!ssoOnly && (
                <p>If you were issued a temporary password, you’ll be prompted to change it after signing in.</p>
              )}
              {ssoOnly && (
                <p>Only Microsoft single sign‑on is available for this tenant.</p>
              )}
              <p>
                <a
                  href={`/tenant/${orgId}/password/forgot`}
                  className="text-blue-600 hover:underline"
                >
                  Forgot your password?
                </a>
              </p>
              <p className="opacity-75">By signing in you agree to our Terms and Privacy Policy.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
