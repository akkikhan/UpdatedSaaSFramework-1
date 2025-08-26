import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Shield, Database, Clock, TrendingUp, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface ComplianceSummary {
  timeframe: string;
  totalAuditEvents: number;
  rbacChanges: number;
  dataAccessEvents: number;
  authEvents: number;
  highRiskEvents: number;
  securityEvents: number;
  criticalSecurityEvents: number;
  complianceFrameworks: string[];
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

interface AuditLog {
  id: string;
  eventType: string;
  eventCategory: string;
  action: string;
  outcome: string;
  riskLevel: string;
  complianceFrameworks: string[];
  entityType: string;
  entityName: string;
  timestamp: string;
  tenantName: string;
  ipAddress: string;
}

interface SecurityEvent {
  id: string;
  eventType: string;
  severity: string;
  source: string;
  isResolved: boolean;
  timestamp: string;
  tenantName: string;
  ipAddress: string;
}

export default function ComplianceDashboard() {
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<number>(30);

  const { data: summary, isLoading: summaryLoading } = useQuery<ComplianceSummary>({
    queryKey: ['/api/compliance/summary', selectedFramework, selectedTimeframe],
    queryFn: async () => {
      const params = new URLSearchParams({
        days: selectedTimeframe.toString(),
        ...(selectedFramework && { framework: selectedFramework })
      });
      const res = await fetch(`/api/compliance/summary?${params}`);
      return res.json();
    },
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/compliance/audit-logs', selectedFramework],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '20',
        ...(selectedFramework && { framework: selectedFramework })
      });
      const res = await fetch(`/api/compliance/audit-logs?${params}`);
      return res.json();
    },
  });

  const { data: securityEvents, isLoading: securityLoading } = useQuery<SecurityEvent[]>({
    queryKey: ['/api/compliance/security-events'],
    queryFn: async () => {
      const res = await fetch('/api/compliance/security-events?limit=10');
      return res.json();
    },
  });

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'alert': return 'bg-orange-500 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-compliance">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading compliance dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="compliance-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="title-compliance">Compliance Dashboard</h1>
          <p className="text-gray-600">Monitor audit logs, security events, and regulatory compliance</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={selectedTimeframe === 7 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTimeframe(7)}
            data-testid="button-timeframe-7d"
          >
            7 Days
          </Button>
          <Button
            variant={selectedTimeframe === 30 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTimeframe(30)}
            data-testid="button-timeframe-30d"
          >
            30 Days
          </Button>
          <Button
            variant={selectedTimeframe === 90 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTimeframe(90)}
            data-testid="button-timeframe-90d"
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card data-testid="card-total-events">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Audit Events</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-events">{summary.totalAuditEvents}</div>
              <p className="text-xs text-muted-foreground">Past {summary.timeframe}</p>
            </CardContent>
          </Card>

          <Card data-testid="card-rbac-changes">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">RBAC Changes</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-rbac-changes">{summary.rbacChanges}</div>
              <p className="text-xs text-muted-foreground">Role & permission changes</p>
            </CardContent>
          </Card>

          <Card data-testid="card-high-risk">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Events</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-high-risk">{summary.highRiskEvents}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>

          <Card data-testid="card-security-events">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-security-events">{summary.securityEvents}</div>
              <p className="text-xs text-muted-foreground">{summary.criticalSecurityEvents} critical</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance Frameworks Filter */}
      {summary && summary.complianceFrameworks.length > 0 && (
        <Card data-testid="card-frameworks">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Compliance Frameworks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedFramework === '' ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFramework('')}
                data-testid="button-framework-all"
              >
                All Frameworks
              </Button>
              {summary.complianceFrameworks.map((framework) => (
                <Button
                  key={framework}
                  variant={selectedFramework === framework ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFramework(framework)}
                  data-testid={`button-framework-${framework}`}
                >
                  {framework.toUpperCase()}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="audit-logs" className="space-y-4">
        <TabsList data-testid="tabs-compliance">
          <TabsTrigger value="audit-logs" data-testid="tab-audit-logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="security-events" data-testid="tab-security-events">Security Events</TabsTrigger>
          <TabsTrigger value="risk-analysis" data-testid="tab-risk-analysis">Risk Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="audit-logs" className="space-y-4">
          <Card data-testid="card-audit-logs">
            <CardHeader>
              <CardTitle>Recent Audit Events</CardTitle>
              <CardDescription>Comprehensive audit trail for compliance monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="text-center py-4" data-testid="loading-audit-logs">Loading audit logs...</div>
              ) : auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 space-y-2" data-testid={`audit-log-${log.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getRiskBadgeColor(log.riskLevel)} data-testid={`badge-risk-${log.riskLevel}`}>
                            {log.riskLevel.toUpperCase()}
                          </Badge>
                          <span className="font-semibold" data-testid={`text-action-${log.id}`}>{log.action}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span data-testid={`text-timestamp-${log.id}`}>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Entity:</span> {log.entityType} - {log.entityName}
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Tenant:</span> {log.tenantName || 'System'}
                        {log.ipAddress && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-gray-600">IP:</span> {log.ipAddress}
                          </>
                        )}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {log.complianceFrameworks.map((framework) => (
                          <Badge key={framework} variant="secondary" className="text-xs" data-testid={`badge-framework-${framework}`}>
                            {framework.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500" data-testid="empty-audit-logs">
                  No audit logs found for the selected criteria
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security-events" className="space-y-4">
          <Card data-testid="card-security-events-detail">
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>Security incidents and threat detection alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {securityLoading ? (
                <div className="text-center py-4" data-testid="loading-security-events">Loading security events...</div>
              ) : securityEvents && securityEvents.length > 0 ? (
                <div className="space-y-3">
                  {securityEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 space-y-2" data-testid={`security-event-${event.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityBadgeColor(event.severity)} data-testid={`badge-severity-${event.severity}`}>
                            {event.severity.toUpperCase()}
                          </Badge>
                          <span className="font-semibold" data-testid={`text-event-type-${event.id}`}>{event.eventType}</span>
                          {event.isResolved && (
                            <Badge variant="outline" className="text-green-600 border-green-600" data-testid={`badge-resolved-${event.id}`}>
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span data-testid={`text-event-timestamp-${event.id}`}>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Source:</span> {event.source}
                        <span className="mx-2">•</span>
                        <span className="text-gray-600">Tenant:</span> {event.tenantName || 'System'}
                        {event.ipAddress && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-gray-600">IP:</span> {event.ipAddress}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500" data-testid="empty-security-events">
                  No security events found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk-analysis" className="space-y-4">
          <Card data-testid="card-risk-analysis">
            <CardHeader>
              <CardTitle>Risk Distribution Analysis</CardTitle>
              <CardDescription>Breakdown of events by risk level</CardDescription>
            </CardHeader>
            <CardContent>
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg" data-testid="risk-low">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-risk-low">{summary.riskDistribution.low}</div>
                    <div className="text-sm text-gray-600">Low Risk</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg" data-testid="risk-medium">
                    <div className="text-2xl font-bold text-yellow-600" data-testid="text-risk-medium">{summary.riskDistribution.medium}</div>
                    <div className="text-sm text-gray-600">Medium Risk</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg" data-testid="risk-high">
                    <div className="text-2xl font-bold text-orange-600" data-testid="text-risk-high">{summary.riskDistribution.high}</div>
                    <div className="text-sm text-gray-600">High Risk</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg" data-testid="risk-critical">
                    <div className="text-2xl font-bold text-red-600" data-testid="text-risk-critical">{summary.riskDistribution.critical}</div>
                    <div className="text-sm text-gray-600">Critical Risk</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}