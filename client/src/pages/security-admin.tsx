import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  User, 
  Lock, 
  Unlock,
  Filter, 
  RefreshCw,
  Activity,
  Map
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface LoginAttempt {
  id: string;
  email: string;
  tenantId: string | null;
  ipAddress: string;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  mfaVerified: boolean;
  timestamp: string;
  geolocation: any;
}

interface AccountLockout {
  id: string;
  email: string;
  reason: string;
  lockedAt: string;
  expiresAt: string | null;
  unlockAttempts: number;
  unlockedAt: string | null;
  unlockedBy: string | null;
}

export default function SecurityAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [loginFilters, setLoginFilters] = useState({
    email: "",
    success: "",
    limit: 50,
    offset: 0
  });

  const [lockoutFilters, setLockoutFilters] = useState({
    email: "",
    activeOnly: true,
    limit: 50,
    offset: 0
  });

  // Get login attempts
  const loginAttemptsQuery = useQuery({
    queryKey: ["/api/v2/auth/admin/login-attempts", loginFilters],
    queryFn: async () => {
      const token = localStorage.getItem('tenant_token');
      const params = new URLSearchParams();
      if (loginFilters.email) params.append("email", loginFilters.email);
      if (loginFilters.success) params.append("success", loginFilters.success);
      params.append("limit", loginFilters.limit.toString());
      params.append("offset", loginFilters.offset.toString());
      
      const response = await fetch(`/api/v2/auth/admin/login-attempts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch login attempts");
      }
      
      return response.json() as Promise<LoginAttempt[]>;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get account lockouts
  const lockoutsQuery = useQuery({
    queryKey: ["/api/v2/auth/admin/lockouts", lockoutFilters],
    queryFn: async () => {
      const token = localStorage.getItem('tenant_token');
      const params = new URLSearchParams();
      if (lockoutFilters.email) params.append("email", lockoutFilters.email);
      params.append("activeOnly", lockoutFilters.activeOnly.toString());
      params.append("limit", lockoutFilters.limit.toString());
      params.append("offset", lockoutFilters.offset.toString());
      
      const response = await fetch(`/api/v2/auth/admin/lockouts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch account lockouts");
      }
      
      return response.json() as Promise<AccountLockout[]>;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Unlock account mutation
  const unlockAccount = useMutation({
    mutationFn: async (email: string) => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/auth/admin/unlock", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to unlock account");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/auth/admin/lockouts"] });
      toast({
        title: "Account Unlocked",
        description: "The account has been successfully unlocked",
      });
    },
    onError: (error) => {
      toast({
        title: "Unlock Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (success: boolean) => {
    return success 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getFailureReasonDisplay = (reason: string | null) => {
    switch (reason) {
      case 'invalid_password':
        return 'Invalid Password';
      case 'invalid_credentials':
        return 'Invalid Credentials';
      case 'account_locked':
        return 'Account Locked';
      case 'mfa_required':
        return 'MFA Required';
      case 'invalid_mfa':
        return 'Invalid MFA Code';
      case 'rate_limited':
        return 'Rate Limited';
      case 'system_error':
        return 'System Error';
      default:
        return reason || 'Unknown';
    }
  };

  const getRiskLevel = (attempt: LoginAttempt) => {
    if (!attempt.success) {
      if (attempt.failureReason === 'invalid_password' || attempt.failureReason === 'invalid_mfa') {
        return 'high';
      }
      if (attempt.failureReason === 'rate_limited') {
        return 'critical';
      }
      return 'medium';
    }
    return 'low';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateSecurityMetrics = () => {
    if (!loginAttemptsQuery.data) return null;

    const attempts = loginAttemptsQuery.data;
    const last24h = attempts.filter(a => 
      new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const totalAttempts = last24h.length;
    const failedAttempts = last24h.filter(a => !a.success).length;
    const uniqueIPs = new Set(last24h.map(a => a.ipAddress)).size;
    const mfaAttempts = last24h.filter(a => a.mfaVerified).length;

    return {
      totalAttempts,
      failedAttempts,
      failureRate: totalAttempts > 0 ? (failedAttempts / totalAttempts * 100).toFixed(1) : '0',
      uniqueIPs,
      mfaAttempts
    };
  };

  const metrics = calculateSecurityMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Security Administration</h1>
        <p className="text-slate-600 mt-1">Monitor authentication security and manage account access</p>
      </div>

      {/* Security Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Login Attempts (24h)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalAttempts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.failedAttempts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failure Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.failureRate}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
              <Map className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.uniqueIPs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MFA Logins</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.mfaAttempts}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="attempts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="attempts" data-testid="tab-login-attempts">
            <Activity className="h-4 w-4 mr-2" />
            Login Attempts
          </TabsTrigger>
          <TabsTrigger value="lockouts" data-testid="tab-account-lockouts">
            <Lock className="h-4 w-4 mr-2" />
            Account Lockouts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attempts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Authentication Log
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loginAttemptsQuery.refetch()}
                    disabled={loginAttemptsQuery.isLoading}
                    data-testid="refresh-login-attempts"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loginAttemptsQuery.isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-lg">
                <Filter className="h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Filter by email..."
                  value={loginFilters.email}
                  onChange={(e) => setLoginFilters(prev => ({ ...prev, email: e.target.value }))}
                  className="max-w-xs"
                  data-testid="filter-email"
                />
                <Select 
                  value={loginFilters.success} 
                  onValueChange={(value) => setLoginFilters(prev => ({ ...prev, success: value }))}
                >
                  <SelectTrigger className="max-w-xs" data-testid="filter-success">
                    <SelectValue placeholder="Filter by status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All attempts</SelectItem>
                    <SelectItem value="true">Successful</SelectItem>
                    <SelectItem value="false">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Login Attempts List */}
              <div className="space-y-3">
                {loginAttemptsQuery.isLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading login attempts...</div>
                ) : loginAttemptsQuery.data?.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No login attempts found</div>
                ) : (
                  loginAttemptsQuery.data?.map((attempt) => {
                    const riskLevel = getRiskLevel(attempt);
                    return (
                      <Card key={attempt.id} className="border-l-4 border-l-blue-400" data-testid={`attempt-${attempt.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${attempt.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {attempt.success ? <Shield className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge className={getStatusColor(attempt.success)}>
                                    {attempt.success ? 'SUCCESS' : 'FAILED'}
                                  </Badge>
                                  <Badge className={getRiskColor(riskLevel)}>
                                    {riskLevel.toUpperCase()} RISK
                                  </Badge>
                                  {attempt.mfaVerified && (
                                    <Badge variant="outline">MFA</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-800">
                                  <span className="font-medium">{attempt.email}</span>
                                  {!attempt.success && attempt.failureReason && (
                                    <span className="text-red-600 ml-2">
                                      • {getFailureReasonDisplay(attempt.failureReason)}
                                    </span>
                                  )}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(attempt.timestamp), 'MMM d, yyyy h:mm:ss a')}
                                  </span>
                                  <span>IP: {attempt.ipAddress}</span>
                                  {attempt.userAgent && (
                                    <span className="truncate max-w-xs">
                                      {attempt.userAgent}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lockouts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Account Lockouts
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => lockoutsQuery.refetch()}
                    disabled={lockoutsQuery.isLoading}
                    data-testid="refresh-lockouts"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${lockoutsQuery.isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-lg">
                <Filter className="h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Filter by email..."
                  value={lockoutFilters.email}
                  onChange={(e) => setLockoutFilters(prev => ({ ...prev, email: e.target.value }))}
                  className="max-w-xs"
                  data-testid="filter-lockout-email"
                />
                <Select 
                  value={lockoutFilters.activeOnly.toString()} 
                  onValueChange={(value) => setLockoutFilters(prev => ({ ...prev, activeOnly: value === 'true' }))}
                >
                  <SelectTrigger className="max-w-xs" data-testid="filter-active-only">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active lockouts only</SelectItem>
                    <SelectItem value="false">All lockouts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lockouts List */}
              <div className="space-y-3">
                {lockoutsQuery.isLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading account lockouts...</div>
                ) : lockoutsQuery.data?.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No account lockouts found</div>
                ) : (
                  lockoutsQuery.data?.map((lockout) => {
                    const isActive = !lockout.unlockedAt && (!lockout.expiresAt || new Date(lockout.expiresAt) > new Date());
                    return (
                      <Card key={lockout.id} className="border-l-4 border-l-orange-400" data-testid={`lockout-${lockout.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${isActive ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge className={isActive ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                                    {isActive ? 'LOCKED' : 'UNLOCKED'}
                                  </Badge>
                                  <Badge variant="outline">
                                    {lockout.reason.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-800">
                                  <span className="font-medium">{lockout.email}</span>
                                </p>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Locked: {format(new Date(lockout.lockedAt), 'MMM d, yyyy h:mm a')}
                                  </span>
                                  {lockout.expiresAt && (
                                    <span>
                                      Expires: {format(new Date(lockout.expiresAt), 'MMM d, yyyy h:mm a')}
                                    </span>
                                  )}
                                  {lockout.unlockedAt && (
                                    <span>
                                      Unlocked: {format(new Date(lockout.unlockedAt), 'MMM d, yyyy h:mm a')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isActive && (
                                <Button
                                  size="sm"
                                  onClick={() => unlockAccount.mutate(lockout.email)}
                                  disabled={unlockAccount.isPending}
                                >
                                  <Unlock className="h-3 w-3 mr-1" />
                                  Unlock
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
