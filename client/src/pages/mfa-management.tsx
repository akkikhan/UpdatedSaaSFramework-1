import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Shield, 
  Smartphone, 
  Mail, 
  QrCode, 
  Key, 
  CheckCircle, 
  XCircle, 
  Plus,
  Trash2,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MFAMethod {
  id: string;
  mfaType: string;
  isEnabled: boolean;
  isVerified: boolean;
  lastUsed: string | null;
  createdAt: string;
}

interface TOTPSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export default function MFAManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Get current MFA settings
  const { data: mfaMethods, isLoading } = useQuery({
    queryKey: ["/api/v2/auth/mfa"],
    queryFn: async () => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/auth/mfa", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch MFA settings");
      }
      
      return response.json() as Promise<MFAMethod[]>;
    },
  });

  // Setup TOTP
  const setupTOTP = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/auth/mfa/totp/setup", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to setup TOTP");
      }
      
      return response.json() as Promise<TOTPSetup>;
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setShowTOTPSetup(true);
      toast({
        title: "TOTP Setup Started",
        description: "Scan the QR code with your authenticator app",
      });
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify TOTP
  const verifyTOTP = useMutation({
    mutationFn: async (token: string) => {
      const authToken = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/auth/mfa/totp/verify", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Verification failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/auth/mfa"] });
      setShowTOTPSetup(false);
      setShowBackupCodes(true);
      setVerificationCode("");
      toast({
        title: "TOTP Enabled",
        description: "Two-factor authentication has been successfully enabled",
      });
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Disable MFA
  const disableMFA = useMutation({
    mutationFn: async (mfaType: string) => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch(`/api/v2/auth/mfa/${mfaType}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to disable MFA");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/auth/mfa"] });
      toast({
        title: "MFA Disabled",
        description: "Multi-factor authentication has been disabled",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Disable MFA",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getMFAIcon = (type: string) => {
    switch (type) {
      case 'totp':
        return <Shield className="h-5 w-5" />;
      case 'sms':
        return <Smartphone className="h-5 w-5" />;
      case 'email':
        return <Mail className="h-5 w-5" />;
      default:
        return <Key className="h-5 w-5" />;
    }
  };

  const getMFADisplayName = (type: string) => {
    switch (type) {
      case 'totp':
        return 'Authenticator App';
      case 'sms':
        return 'SMS Authentication';
      case 'email':
        return 'Email Authentication';
      default:
        return type.toUpperCase();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Backup code copied to clipboard",
    });
  };

  const handleVerifyTOTP = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }
    verifyTOTP.mutate(verificationCode);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Multi-Factor Authentication</h1>
          <p className="text-slate-600 mt-1">Loading MFA settings...</p>
        </div>
      </div>
    );
  }

  const enabledMethods = mfaMethods?.filter(m => m.isEnabled && m.isVerified) || [];
  const hasMFA = enabledMethods.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Multi-Factor Authentication</h1>
        <p className="text-slate-600 mt-1">
          Secure your account with an additional layer of protection
        </p>
      </div>

      {/* MFA Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasMFA ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                {hasMFA ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </div>
              <div>
                <CardTitle className="text-lg">
                  {hasMFA ? "MFA Enabled" : "MFA Not Enabled"}
                </CardTitle>
                <CardDescription>
                  {hasMFA 
                    ? `You have ${enabledMethods.length} MFA method(s) enabled`
                    : "Your account is not protected by multi-factor authentication"
                  }
                </CardDescription>
              </div>
            </div>
            {!hasMFA && (
              <Badge variant="destructive">Vulnerable</Badge>
            )}
          </div>
        </CardHeader>

        {!hasMFA && (
          <CardContent>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Enable multi-factor authentication to significantly improve your account security.
                Even if your password is compromised, MFA helps prevent unauthorized access.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Current MFA Methods */}
      {enabledMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active MFA Methods</CardTitle>
            <CardDescription>
              Methods currently protecting your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {enabledMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                      {getMFAIcon(method.mfaType)}
                    </div>
                    <div>
                      <p className="font-medium">{getMFADisplayName(method.mfaType)}</p>
                      <p className="text-sm text-muted-foreground">
                        {method.lastUsed 
                          ? `Last used: ${format(new Date(method.lastUsed), 'MMM d, yyyy h:mm a')}`
                          : 'Never used'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Active</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disableMFA.mutate(method.mfaType)}
                      disabled={disableMFA.isPending}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Disable
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available MFA Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Available MFA Methods</CardTitle>
          <CardDescription>
            Choose from the following authentication methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* TOTP Method */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Authenticator App (TOTP)</p>
                  <p className="text-sm text-muted-foreground">
                    Use apps like Google Authenticator, Authy, or 1Password
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {enabledMethods.some(m => m.mfaType === 'totp') ? (
                  <Badge variant="secondary">Enabled</Badge>
                ) : (
                  <Button
                    onClick={() => setupTOTP.mutate()}
                    disabled={setupTOTP.isPending}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Set Up
                  </Button>
                )}
              </div>
            </div>

            {/* SMS Method (Future) */}
            <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-400 rounded-lg">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">SMS Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Receive verification codes via text message
                  </p>
                </div>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>

            {/* Email Method (Future) */}
            <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-400 rounded-lg">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Email Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Receive verification codes via email
                  </p>
                </div>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TOTP Setup Dialog */}
      <Dialog open={showTOTPSetup} onOpenChange={setShowTOTPSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Authenticator App</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the verification code
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {setupTOTP.data && (
              <>
                <div className="flex justify-center p-4 bg-white border rounded-lg">
                  <img 
                    src={setupTOTP.data.qrCodeUrl} 
                    alt="QR Code" 
                    className="w-48 h-48"
                  />
                </div>
                
                <div className="text-center">
                  <Label htmlFor="verification-code">Enter verification code from your app</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="text-center text-lg tracking-widest mt-2"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowTOTPSetup(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleVerifyTOTP}
                    disabled={verifyTOTP.isPending || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {verifyTOTP.isPending ? "Verifying..." : "Enable TOTP"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup Codes</DialogTitle>
            <DialogDescription>
              Save these backup codes in a secure location. Each code can only be used once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                These codes can be used to access your account if you lose access to your authenticator app.
                Store them securely and do not share them with anyone.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-lg">
              {backupCodes.map((code, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <code className="text-sm font-mono">{code}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(code)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button onClick={() => setShowBackupCodes(false)} className="w-full">
              I've Saved My Backup Codes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
