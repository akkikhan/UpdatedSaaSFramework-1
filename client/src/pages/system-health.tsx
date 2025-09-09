import { BarChart3, Gauge, Server, AlertTriangle, Mail } from "lucide-react";
import StatsCard from "@/components/ui/stats-card";
import { useHealthStatus } from "@/hooks/use-stats";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const formatUptime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}h ${mins}m`;
};

const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function SystemHealthPage() {
  const { data: healthStatus } = useHealthStatus();
  const { toast } = useToast();
  const [recipient, setRecipient] = useState("");

  const sendTestEmail = useMutation({
    mutationFn: (to?: string) => api.sendTestEmail(to),
    onSuccess: res => {
      toast({ title: "Test email sent", description: `Sent to ${res.to}` });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to send test email",
        description: err?.message || "SMTP error",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="aspire-page-container">
      {/* Aspire Page Header */}
      <div className="aspire-page-header">
        <div className="aspire-header-content">
          <div className="aspire-header-text">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="aspire-page-title">System Health</h1>
                <p className="aspire-page-subtitle">
                  Monitor system performance and health metrics
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="aspire-content-wrapper">
        <div className="aspire-main-card">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <Input
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="Send to… (optional)"
                className="max-w-sm"
                type="email"
              />
              <Button
                type="button"
                onClick={() => sendTestEmail.mutate(recipient || undefined)}
                disabled={sendTestEmail.isPending}
                className="flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {sendTestEmail.isPending ? "Sending…" : "Send Test Email"}
              </Button>
              <span className="text-sm text-slate-500">
                Sends to custom recipient or ADMIN_EMAIL if empty
              </span>
            </div>
            {/* System Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="API Requests"
                value="12.4K"
                icon={BarChart3}
                iconColor="text-blue-600"
                backgroundColor="bg-blue-100"
              />
              <StatsCard
                title="Response Time"
                value="124ms"
                icon={Gauge}
                iconColor="text-green-600"
                backgroundColor="bg-green-100"
              />
              <StatsCard
                title="Uptime"
                value={healthStatus ? formatUptime(healthStatus.system.uptime) : "--"}
                icon={Server}
                iconColor="text-green-600"
                backgroundColor="bg-green-100"
              />
              <StatsCard
                title="Error Rate"
                value="0.1%"
                icon={AlertTriangle}
                iconColor="text-yellow-600"
                backgroundColor="bg-yellow-100"
              />
            </div>

            {/* Service Status */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Service Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="system-status-operational"></div>
                    <div>
                      <h4 className="font-medium text-slate-800">API Gateway</h4>
                      <p className="text-sm text-slate-500">
                        Port 8080 - Reverse proxy and routing
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-green-600 font-medium text-sm">Operational</span>
                    <p className="text-xs text-slate-500">99.9% uptime</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="system-status-operational"></div>
                    <div>
                      <h4 className="font-medium text-slate-800">Authentication API</h4>
                      <p className="text-sm text-slate-500">
                        Port 7011 - JWT auth and user management
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-green-600 font-medium text-sm">Operational</span>
                    <p className="text-xs text-slate-500">99.8% uptime</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="system-status-operational"></div>
                    <div>
                      <h4 className="font-medium text-slate-800">RBAC API</h4>
                      <p className="text-sm text-slate-500">Port 7002 - Roles and permissions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-green-600 font-medium text-sm">Operational</span>
                    <p className="text-xs text-slate-500">99.9% uptime</p>
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    healthStatus?.services.email === "operational"
                      ? "border-slate-200"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={
                        healthStatus?.services.email === "operational"
                          ? "system-status-operational"
                          : "system-status-warning"
                      }
                    ></div>
                    <div>
                      <h4 className="font-medium text-slate-800">Notification API</h4>
                      <p className="text-sm text-slate-500">Port 7015 - Email service</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-medium text-sm ${
                        healthStatus?.services.email === "operational"
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}
                    >
                      {healthStatus?.services.email === "operational"
                        ? "Operational"
                        : "Check Config"}
                    </span>
                    <p className="text-xs text-slate-500">97.2% uptime</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div
                      className={
                        healthStatus?.services.database === "operational"
                          ? "system-status-operational"
                          : "system-status-error"
                      }
                    ></div>
                    <div>
                      <h4 className="font-medium text-slate-800">PostgreSQL Database</h4>
                      <p className="text-sm text-slate-500">Primary data storage</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-medium text-sm ${
                        healthStatus?.services.database === "operational"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {healthStatus?.services.database === "operational" ? "Operational" : "Error"}
                    </span>
                    <p className="text-xs text-slate-500">99.9% uptime</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Average Response Time</span>
                    <span className="font-medium text-slate-800">124ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">95th Percentile</span>
                    <span className="font-medium text-slate-800">280ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Requests per Second</span>
                    <span className="font-medium text-slate-800">145</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Active Connections</span>
                    <span className="font-medium text-slate-800">23</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Resource Usage</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">CPU Usage</span>
                    <span className="font-medium text-slate-800">24%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Memory Usage</span>
                    <span className="font-medium text-slate-800">
                      {healthStatus ? formatBytes(healthStatus.system.memory.rss) : "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Database Connections</span>
                    <span className="font-medium text-slate-800">8/100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Storage Usage</span>
                    <span className="font-medium text-slate-800">15.2 GB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
