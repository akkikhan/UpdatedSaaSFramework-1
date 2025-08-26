import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download, 
  Eye, 
  Filter, 
  RefreshCw, 
  Settings,
  TrendingUp,
  Zap
} from "lucide-react";
import { format } from "date-fns";

interface PerformanceMetric {
  id: string;
  tenantId: string | null;
  metricType: string;
  metricName: string;
  value: string;
  unit: string;
  labels: any;
  timestamp: string;
  aggregationWindow: string;
}

interface AlertEvent {
  id: string;
  alertRuleId: string;
  tenantId: string | null;
  severity: string;
  message: string;
  metricValue: string;
  threshold: string;
  status: string;
  timestamp: string;
  details: any;
}

interface AlertRule {
  id: string;
  tenantId: string | null;
  name: string;
  description: string;
  metricType: string;
  condition: string;
  threshold: string;
  timeWindow: string;
  severity: string;
  isEnabled: boolean;
}

interface SystemHealth {
  id: string;
  service: string;
  status: string;
  responseTime: number | null;
  details: any;
  lastChecked: string;
  timestamp: string;
}

export default function MonitoringDashboard() {
  const [selectedMetricType, setSelectedMetricType] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 24h ago
    endDate: new Date().toISOString().split('T')[0]
  });

  // Performance metrics query
  const metricsQuery = useQuery({
    queryKey: ["/api/monitoring/metrics", selectedMetricType, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedMetricType) params.append("metricType", selectedMetricType);
      params.append("startDate", dateRange.startDate);
      params.append("endDate", dateRange.endDate);
      params.append("limit", "200");
      
      const response = await fetch(`/api/monitoring/metrics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json() as Promise<PerformanceMetric[]>;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Alert events query
  const alertsQuery = useQuery({
    queryKey: ["/api/monitoring/alerts"],
    queryFn: async () => {
      const response = await fetch("/api/monitoring/alerts?limit=50");
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return response.json() as Promise<AlertEvent[]>;
    },
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  // Alert rules query
  const rulesQuery = useQuery({
    queryKey: ["/api/monitoring/alert-rules"],
    queryFn: async () => {
      const response = await fetch("/api/monitoring/alert-rules");
      if (!response.ok) throw new Error("Failed to fetch alert rules");
      return response.json() as Promise<AlertRule[]>;
    }
  });

  // System health query
  const healthQuery = useQuery({
    queryKey: ["/api/monitoring/health"],
    queryFn: async () => {
      const response = await fetch("/api/monitoring/health");
      if (!response.ok) throw new Error("Failed to fetch system health");
      return response.json() as Promise<SystemHealth[]>;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'degraded':
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  const calculateAverageResponseTime = () => {
    const responseTimeMetrics = metricsQuery.data?.filter(m => m.metricType === 'api_response_time') || [];
    if (responseTimeMetrics.length === 0) return 0;
    const sum = responseTimeMetrics.reduce((acc, m) => acc + parseFloat(m.value), 0);
    return Math.round(sum / responseTimeMetrics.length);
  };

  const calculateErrorRate = () => {
    const errorMetrics = metricsQuery.data?.filter(m => m.metricType === 'error_rate') || [];
    if (errorMetrics.length === 0) return 0;
    const sum = errorMetrics.reduce((acc, m) => acc + parseFloat(m.value), 0);
    return (sum / errorMetrics.length).toFixed(2);
  };

  const exportComplianceReport = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: 'json'
      });
      
      const response = await fetch(`/api/monitoring/compliance-report?${params}`);
      if (!response.ok) throw new Error("Failed to export report");
      
      const report = await response.json();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${dateRange.startDate}-to-${dateRange.endDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export compliance report:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Monitoring Dashboard</h1>
          <p className="text-slate-600 mt-1">Real-time system performance and alerting</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportComplianceReport}
            data-testid="export-compliance-report"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateAverageResponseTime()}ms</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateErrorRate()}%</div>
            <p className="text-xs text-muted-foreground">Average error rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alertsQuery.data?.filter(a => a.status === 'active').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthQuery.data?.filter(h => h.status === 'healthy').length || 0}/
              {healthQuery.data?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Services healthy</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics" data-testid="tab-metrics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="health" data-testid="tab-health">
            <Activity className="h-4 w-4 mr-2" />
            Health
          </TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules">
            <Settings className="h-4 w-4 mr-2" />
            Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => metricsQuery.refetch()}
                    disabled={metricsQuery.isLoading}
                    data-testid="refresh-metrics"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${metricsQuery.isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-lg">
                <Filter className="h-4 w-4 text-slate-500" />
                <Select value={selectedMetricType} onValueChange={setSelectedMetricType}>
                  <SelectTrigger className="max-w-xs" data-testid="select-metric-type">
                    <SelectValue placeholder="Filter by metric type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All metrics</SelectItem>
                    <SelectItem value="api_response_time">API Response Time</SelectItem>
                    <SelectItem value="error_rate">Error Rate</SelectItem>
                    <SelectItem value="memory_usage">Memory Usage</SelectItem>
                    <SelectItem value="cpu_usage">CPU Usage</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="max-w-xs"
                  data-testid="start-date"
                />
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="max-w-xs"
                  data-testid="end-date"
                />
              </div>

              {/* Metrics List */}
              <div className="space-y-3">
                {metricsQuery.isLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading metrics...</div>
                ) : metricsQuery.data?.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No metrics found</div>
                ) : (
                  metricsQuery.data?.slice(0, 20).map((metric) => (
                    <Card key={metric.id} className="border-l-4 border-l-blue-400" data-testid={`metric-${metric.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                              <Zap className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {metric.metricType}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {metric.value} {metric.unit}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-800">
                                <span className="font-medium">{metric.metricName}</span>
                              </p>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                {format(new Date(metric.timestamp), 'MMM d, yyyy h:mm a')}
                                {metric.labels?.endpoint && (
                                  <span className="ml-2">Endpoint: {metric.labels.endpoint}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alert Events
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alertsQuery.refetch()}
                  disabled={alertsQuery.isLoading}
                  data-testid="refresh-alerts"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${alertsQuery.isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {alertsQuery.isLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading alerts...</div>
                ) : alertsQuery.data?.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No alerts found</div>
                ) : (
                  alertsQuery.data?.map((alert) => (
                    <Card key={alert.id} className="border-l-4 border-l-orange-400" data-testid={`alert-${alert.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                              {getSeverityIcon(alert.severity)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(alert.severity)}>
                                  {alert.severity.toUpperCase()}
                                </Badge>
                                <Badge className={getStatusColor(alert.status)}>
                                  {alert.status.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-800">
                                <span className="font-medium">{alert.message}</span>
                              </p>
                              <p className="text-xs text-slate-600">
                                Value: {alert.metricValue} | Threshold: {alert.threshold}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                {format(new Date(alert.timestamp), 'MMM d, yyyy h:mm a')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health Status
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => healthQuery.refetch()}
                  disabled={healthQuery.isLoading}
                  data-testid="refresh-health"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${healthQuery.isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthQuery.data?.map((health) => (
                  <Card key={health.id} data-testid={`health-${health.service}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{health.service.toUpperCase()}</p>
                          <p className="text-xs text-slate-500">
                            {health.responseTime ? `${health.responseTime}ms` : 'N/A'}
                          </p>
                        </div>
                        <Badge className={getStatusColor(health.status)}>
                          {health.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Last checked: {format(new Date(health.lastChecked), 'h:mm a')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Alert Rules Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {rulesQuery.data?.map((rule) => (
                  <Card key={rule.id} data-testid={`rule-${rule.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{rule.name}</span>
                            <Badge variant={rule.isEnabled ? "default" : "secondary"}>
                              {rule.isEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                            <Badge className={getStatusColor(rule.severity)}>
                              {rule.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600">{rule.description}</p>
                          <p className="text-xs text-slate-500">
                            {rule.metricType} {rule.condition} {rule.threshold} (window: {rule.timeWindow})
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
