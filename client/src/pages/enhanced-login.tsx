import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Lock, Clock, AlertTriangle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  mfaCode: z.string().optional(),
});

type LoginData = z.infer<typeof loginSchema>;

interface LoginResponse {
  success?: boolean;
  token?: string;
  user?: any;
  requiresMFA?: boolean;
  mfaTypes?: string[];
  lockedUntil?: string;
  error?: string;
}

export default function EnhancedLogin() {
  const { orgId } = useParams();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [mfaTypes, setMfaTypes] = useState<string[]>([]);
  const [lockoutInfo, setLockoutInfo] = useState<{
    lockedUntil?: string;
    message?: string;
  }>({});

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      mfaCode: "",
    },
  });

  const onSubmit = async (data: LoginData) => {
    if (!orgId) return;
    
    try {
      setLoading(true);
      setError(null);

      // First get tenant by orgId
      const tenantResponse = await fetch(`/api/tenants/by-org-id/${orgId}`);
      if (!tenantResponse.ok) {
        throw new Error('Tenant not found');
      }
      const tenant = await tenantResponse.json();

      // Enhanced login with MFA support
      const loginResponse = await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          tenantId: tenant.id,
          mfaCode: data.mfaCode
        }),
      });

      const result: LoginResponse = await loginResponse.json();

      if (loginResponse.status === 202 && result.requiresMFA) {
        // MFA required
        setShowMFA(true);
        setMfaTypes(result.mfaTypes || []);
        setError("Multi-factor authentication required. Please enter your verification code.");
        return;
      }

      if (loginResponse.status === 423 && result.lockedUntil) {
        // Account locked
        setLockoutInfo({
          lockedUntil: result.lockedUntil,
          message: result.error
        });
        setError(result.error || "Account is temporarily locked");
        return;
      }

      if (!loginResponse.ok) {
        throw new Error(result.error || 'Login failed');
      }

      if (result.token) {
        // Store token and redirect
        localStorage.setItem('tenant_token', result.token);
        localStorage.setItem('tenant_user', JSON.stringify(result.user));
        setLocation(`/tenant/${orgId}/dashboard`);
      }

    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSAMLLogin = async () => {
    if (!orgId) return;

    try {
      const tenantResponse = await fetch(`/api/tenants/by-org-id/${orgId}`);
      if (!tenantResponse.ok) {
        throw new Error('Tenant not found');
      }
      const tenant = await tenantResponse.json();

      const samlResponse = await fetch(`/api/v2/auth/saml/${tenant.id}/login`);
      if (!samlResponse.ok) {
        throw new Error('SAML SSO not configured for this tenant');
      }

      const { loginUrl } = await samlResponse.json();
      window.location.href = loginUrl;
    } catch (err: any) {
      setError(err.message || "SAML login failed");
    }
  };

  const getMFATypeDisplay = (type: string) => {
    switch (type) {
      case 'totp':
        return 'Authenticator App';
      case 'sms':
        return 'SMS';
      case 'email':
        return 'Email';
      default:
        return type.toUpperCase();
    }
  };

  const formatLockoutTime = (lockedUntil: string) => {
    const unlockTime = new Date(lockedUntil);
    const now = new Date();
    const diffMs = unlockTime.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    
    if (diffMins <= 0) return "Account should be unlocked now";
    if (diffMins < 60) return `Account unlocks in ${diffMins} minute(s)`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `Account unlocks in ${hours}h ${mins}m`;
  };

  // Auto-refresh lockout countdown
  useEffect(() => {
    if (lockoutInfo.lockedUntil) {
      const interval = setInterval(() => {
        const unlockTime = new Date(lockoutInfo.lockedUntil!);
        if (new Date() >= unlockTime) {
          setLockoutInfo({});
          setError(null);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockoutInfo.lockedUntil]);

  const isAccountLocked = lockoutInfo.lockedUntil && new Date(lockoutInfo.lockedUntil) > new Date();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              {isAccountLocked ? (
                <Lock className="h-6 w-6 text-white" />
              ) : showMFA ? (
                <Shield className="h-6 w-6 text-white" />
              ) : (
                <span className="text-white font-bold text-lg">
                  {orgId?.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            
            <CardTitle className="text-2xl">
              {isAccountLocked ? "Account Locked" : showMFA ? "Multi-Factor Authentication" : "Welcome back"}
            </CardTitle>
            
            <CardDescription>
              {isAccountLocked 
                ? "Your account is temporarily locked due to security reasons"
                : showMFA 
                ? "Please enter your verification code to continue"
                : `Sign in to your ${orgId} tenant portal`
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isAccountLocked ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {lockoutInfo.message}
                  </AlertDescription>
                </Alert>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm text-orange-800">
                    {formatLockoutTime(lockoutInfo.lockedUntil!)}
                  </p>
                </div>
                
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full"
                >
                  Refresh Page
                </Button>
              </div>
            ) : (
              <>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {showMFA && mfaTypes.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {mfaTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {getMFATypeDisplay(type)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {!showMFA && (
                      <>
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
                      </>
                    )}

                    {showMFA && (
                      <FormField
                        control={form.control}
                        name="mfaCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Verification Code</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                {...field}
                                data-testid="input-mfa-code"
                                className="text-center text-lg tracking-widest"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                      data-testid="button-login"
                    >
                      {loading ? "Signing in..." : showMFA ? "Verify & Sign In" : "Sign In"}
                    </Button>
                  </form>
                </Form>

                {!showMFA && (
                  <>
                    <div className="relative my-4">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">
                        OR
                      </span>
                    </div>

                    <Button
                      onClick={handleSAMLLogin}
                      variant="outline"
                      className="w-full"
                      data-testid="button-saml-login"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Sign in with SSO
                    </Button>
                  </>
                )}

                {showMFA && (
                  <Button
                    onClick={() => {
                      setShowMFA(false);
                      setError(null);
                      form.resetField("mfaCode");
                    }}
                    variant="outline"
                    className="w-full mt-2"
                  >
                    Back to Login
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-4 text-sm text-muted-foreground">
          <p>Having trouble? Contact your administrator</p>
        </div>
      </div>
    </div>
  );
}
