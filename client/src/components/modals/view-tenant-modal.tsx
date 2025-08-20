import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Tenant } from "@/lib/api";

interface ViewTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
}

export default function ViewTenantModal({ open, onOpenChange, tenant }: ViewTenantModalProps) {
  const [showApiKeys, setShowApiKeys] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="view-tenant-modal">
        <DialogHeader>
          <DialogTitle>Tenant Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Organization Name</label>
                <p className="text-slate-900 font-medium">{tenant.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Organization ID</label>
                <p className="text-slate-900 font-mono">{tenant.orgId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Admin Email</label>
                <p className="text-slate-900">{tenant.adminEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <Badge 
                  variant={tenant.status === 'active' ? 'default' : tenant.status === 'pending' ? 'secondary' : 'destructive'}
                  data-testid={`tenant-status-${tenant.status}`}
                >
                  {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Created</label>
                <p className="text-slate-900">{new Date(tenant.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Portal URL</label>
                <p className="text-slate-900 font-mono text-sm">
                  /tenant/{tenant.orgId}/login
                </p>
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">API Keys</CardTitle>
                <Button
                  variant="ghost"
                  onClick={() => setShowApiKeys(!showApiKeys)}
                  data-testid="button-toggle-keys"
                >
                  {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showApiKeys ? "Hide" : "Show"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Authentication API Key</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono">
                    {showApiKeys ? tenant.authApiKey : '•'.repeat(32)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(tenant.authApiKey, 'Auth API Key')}
                    data-testid="button-copy-auth"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">RBAC API Key</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono">
                    {showApiKeys ? tenant.rbacApiKey : '•'.repeat(32)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(tenant.rbacApiKey, 'RBAC API Key')}
                    data-testid="button-copy-rbac"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Example */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integration Example</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm overflow-x-auto">
                <code>{`import { SaaSAuth, SaaSRBAC } from '@saas-framework/auth';

const auth = new SaaSAuth({
  apiKey: '${showApiKeys ? tenant.authApiKey : 'YOUR_AUTH_API_KEY'}',
  baseUrl: 'https://api.yourplatform.com/api/v2/auth'
});

const rbac = new SaaSRBAC({
  apiKey: '${showApiKeys ? tenant.rbacApiKey : 'YOUR_RBAC_API_KEY'}',
  baseUrl: 'https://api.yourplatform.com/api/v2/rbac'
});`}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}