import axios, { AxiosInstance } from 'axios';

export interface AICopilotConfig {
  apiKey: string;
  baseUrl: string;
  tenantId?: string;
  aiProvider?: 'openai' | 'azure-openai' | 'anthropic' | 'custom';
}

export interface RiskAnalysisRequest {
  type: 'transaction' | 'user-behavior' | 'data-access' | 'system-event';
  data: {
    amount?: number;
    fromAccount?: string;
    toAccount?: string;
    location?: string;
    time?: Date;
    userId?: string;
    userBehavior?: any;
    ipAddress?: string;
    deviceFingerprint?: string;
    previousActivity?: any[];
    [key: string]: any;
  };
  context?: {
    industry?: 'banking' | 'insurance' | 'healthcare' | 'fintech' | 'general';
    riskTolerance?: 'low' | 'medium' | 'high';
    complianceFrameworks?: string[];
  };
}

export interface RiskAnalysisResult {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  factors: {
    factor: string;
    impact: number;
    reason: string;
  }[];
  recommendations: {
    action: string;
    priority: 'low' | 'medium' | 'high' | 'immediate';
    description: string;
    automatable?: boolean;
  }[];
  complianceFlags?: {
    framework: string;
    severity: 'info' | 'warning' | 'violation';
    message: string;
  }[];
}

export interface ComplianceAnalysisRequest {
  type: 'transaction' | 'data-processing' | 'user-access' | 'system-change';
  data: any;
  regulations: string[]; // ['SOX', 'PCI', 'GDPR', 'HIPAA', etc.]
  jurisdiction?: string;
}

export interface ComplianceAnalysisResult {
  compliant: boolean;
  overallScore: number; // 0-100
  violations: {
    regulation: string;
    severity: 'minor' | 'major' | 'critical';
    rule: string;
    description: string;
    remediation: string;
  }[];
  recommendations: {
    regulation: string;
    action: string;
    priority: 'low' | 'medium' | 'high';
    timeline: string;
  }[];
  auditTrail: {
    timestamp: Date;
    action: string;
    result: string;
  }[];
}

export interface FraudDetectionRequest {
  transactionData: {
    amount: number;
    currency: string;
    merchantCategory?: string;
    location?: {
      country: string;
      city?: string;
      coordinates?: { lat: number; lng: number };
    };
    paymentMethod: {
      type: 'card' | 'bank_transfer' | 'digital_wallet' | 'crypto';
      last4?: string;
      issuer?: string;
    };
    timestamp: Date;
  };
  userProfile: {
    id: string;
    accountAge: number; // days
    transactionHistory: {
      averageAmount: number;
      frequency: number;
      commonLocations: string[];
      commonMerchants: string[];
    };
    riskFactors: {
      previousFraud: boolean;
      accountTakeover: boolean;
      suspiciousActivity: boolean;
    };
  };
  deviceData?: {
    fingerprint: string;
    ipAddress: string;
    userAgent: string;
    screenResolution?: string;
    timezone?: string;
  };
}

export interface FraudDetectionResult {
  fraudScore: number; // 0-100
  fraudRisk: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  decision: 'approve' | 'review' | 'decline' | 'challenge';
  reasons: {
    category: 'velocity' | 'location' | 'amount' | 'device' | 'behavior' | 'network';
    description: string;
    severity: number;
  }[];
  requiredActions: {
    action: 'additional_verification' | 'manual_review' | 'block_transaction' | 'flag_account';
    description: string;
    automated: boolean;
  }[];
}

export interface IntelligentInsight {
  id: string;
  type: 'performance' | 'security' | 'compliance' | 'optimization' | 'anomaly';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  confidence: number;
  data: any;
  recommendations: {
    action: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  }[];
  createdAt: Date;
  expiresAt?: Date;
}

export interface AutomationRule {
  id?: string;
  name: string;
  description: string;
  trigger: {
    type: 'risk_score' | 'compliance_violation' | 'fraud_detection' | 'anomaly' | 'schedule';
    conditions: any;
  };
  actions: {
    type: 'notify' | 'approve' | 'decline' | 'escalate' | 'block' | 'flag' | 'report';
    parameters: any;
  }[];
  enabled: boolean;
  priority: number;
}

/**
 * SaaS Framework AI Copilot SDK
 * Intelligent automation, risk analysis, fraud detection, and compliance assistance
 */
export class SaaSAICopilot {
  private client: AxiosInstance;
  private config: AICopilotConfig;

  constructor(config: AICopilotConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
        ...(config.tenantId && { 'X-Tenant-ID': config.tenantId })
      },
    });
  }

  // ============ RISK ANALYSIS ============

  /**
   * Analyze transaction or activity risk
   */
  async analyzeRisk(request: RiskAnalysisRequest): Promise<RiskAnalysisResult> {
    try {
      const response = await this.client.post('/ai/risk-analysis', {
        ...request,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to analyze risk:', error);
      throw new Error('Failed to analyze risk');
    }
  }

  /**
   * Batch risk analysis for multiple items
   */
  async analyzeBatchRisk(requests: RiskAnalysisRequest[]): Promise<RiskAnalysisResult[]> {
    try {
      const response = await this.client.post('/ai/risk-analysis/batch', {
        requests: requests.map(req => ({ ...req, tenantId: this.config.tenantId }))
      });
      return response.data;
    } catch (error) {
      console.error('Failed to analyze batch risk:', error);
      throw new Error('Failed to analyze batch risk');
    }
  }

  // ============ FRAUD DETECTION ============

  /**
   * Detect fraudulent transactions
   */
  async detectFraud(request: FraudDetectionRequest): Promise<FraudDetectionResult> {
    try {
      const response = await this.client.post('/ai/fraud-detection', {
        ...request,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to detect fraud:', error);
      throw new Error('Failed to detect fraud');
    }
  }

  /**
   * Train fraud detection model with new data
   */
  async trainFraudModel(trainingData: {
    transactions: any[];
    labels: boolean[]; // true = fraud, false = legitimate
    modelVersion?: string;
  }): Promise<{ modelId: string; accuracy: number }> {
    try {
      const response = await this.client.post('/ai/fraud-detection/train', {
        ...trainingData,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to train fraud model:', error);
      throw new Error('Failed to train fraud detection model');
    }
  }

  // ============ COMPLIANCE ANALYSIS ============

  /**
   * Analyze compliance with regulations
   */
  async analyzeCompliance(request: ComplianceAnalysisRequest): Promise<ComplianceAnalysisResult> {
    try {
      const response = await this.client.post('/ai/compliance-analysis', {
        ...request,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to analyze compliance:', error);
      throw new Error('Failed to analyze compliance');
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(options: {
    regulations: string[];
    startDate: Date;
    endDate: Date;
    includeRecommendations?: boolean;
    format?: 'json' | 'pdf' | 'excel';
  }): Promise<{ reportId: string; downloadUrl?: string; data?: any }> {
    try {
      const response = await this.client.post('/ai/compliance-report', {
        ...options,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  // ============ INTELLIGENT INSIGHTS ============

  /**
   * Get AI-generated insights about system performance and security
   */
  async getInsights(options?: {
    types?: ('performance' | 'security' | 'compliance' | 'optimization' | 'anomaly')[];
    timeRange?: '1h' | '24h' | '7d' | '30d';
    minConfidence?: number;
  }): Promise<IntelligentInsight[]> {
    try {
      const response = await this.client.get('/ai/insights', {
        params: options
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get insights:', error);
      throw new Error('Failed to get AI insights');
    }
  }

  /**
   * Dismiss an insight
   */
  async dismissInsight(insightId: string, reason?: string): Promise<void> {
    try {
      await this.client.patch(`/ai/insights/${insightId}/dismiss`, {
        reason
      });
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
      throw new Error('Failed to dismiss insight');
    }
  }

  // ============ AUTOMATION RULES ============

  /**
   * Create automation rule
   */
  async createAutomationRule(rule: AutomationRule): Promise<AutomationRule> {
    try {
      const response = await this.client.post('/ai/automation-rules', {
        ...rule,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create automation rule:', error);
      throw new Error('Failed to create automation rule');
    }
  }

  /**
   * Update automation rule
   */
  async updateAutomationRule(ruleId: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
    try {
      const response = await this.client.put(`/ai/automation-rules/${ruleId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update automation rule:', error);
      throw new Error('Failed to update automation rule');
    }
  }

  /**
   * Delete automation rule
   */
  async deleteAutomationRule(ruleId: string): Promise<void> {
    try {
      await this.client.delete(`/ai/automation-rules/${ruleId}`);
    } catch (error) {
      console.error('Failed to delete automation rule:', error);
      throw new Error('Failed to delete automation rule');
    }
  }

  /**
   * Get automation rules
   */
  async getAutomationRules(): Promise<AutomationRule[]> {
    try {
      const response = await this.client.get('/ai/automation-rules');
      return response.data;
    } catch (error) {
      console.error('Failed to get automation rules:', error);
      throw new Error('Failed to get automation rules');
    }
  }

  /**
   * Test automation rule
   */
  async testAutomationRule(ruleId: string, testData: any): Promise<{
    triggered: boolean;
    actions: { type: string; result: string }[];
    executionTime: number;
  }> {
    try {
      const response = await this.client.post(`/ai/automation-rules/${ruleId}/test`, testData);
      return response.data;
    } catch (error) {
      console.error('Failed to test automation rule:', error);
      throw new Error('Failed to test automation rule');
    }
  }

  // ============ ANOMALY DETECTION ============

  /**
   * Detect anomalies in data patterns
   */
  async detectAnomalies(data: {
    type: 'user_behavior' | 'transaction_patterns' | 'system_metrics' | 'api_usage';
    timeSeriesData: { timestamp: Date; value: number; metadata?: any }[];
    sensitivity?: 'low' | 'medium' | 'high';
  }): Promise<{
    anomalies: {
      timestamp: Date;
      value: number;
      severity: 'low' | 'medium' | 'high';
      description: string;
      likelihood: number;
    }[];
    patterns: {
      type: 'trend' | 'seasonal' | 'cyclical' | 'irregular';
      description: string;
      confidence: number;
    }[];
  }> {
    try {
      const response = await this.client.post('/ai/anomaly-detection', {
        ...data,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
      throw new Error('Failed to detect anomalies');
    }
  }

  // ============ INTELLIGENT RECOMMENDATIONS ============

  /**
   * Get AI recommendations for system optimization
   */
  async getRecommendations(context: {
    area: 'security' | 'performance' | 'compliance' | 'user_experience' | 'cost_optimization';
    currentMetrics?: any;
    constraints?: any;
  }): Promise<{
    recommendations: {
      title: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
      effort: 'low' | 'medium' | 'high';
      roi: number;
      implementation: {
        steps: string[];
        estimatedTime: string;
        resources: string[];
      };
    }[];
    priorityScore: number;
  }> {
    try {
      const response = await this.client.post('/ai/recommendations', {
        ...context,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw new Error('Failed to get AI recommendations');
    }
  }

  // ============ CHAT ASSISTANT ============

  /**
   * Chat with AI assistant about your system
   */
  async chatAssistant(message: string, context?: {
    sessionId?: string;
    includeSystemData?: boolean;
    expertise?: 'security' | 'compliance' | 'performance' | 'general';
  }): Promise<{
    response: string;
    sessionId: string;
    suggestions?: string[];
    actions?: {
      type: string;
      description: string;
      executable: boolean;
    }[];
  }> {
    try {
      const response = await this.client.post('/ai/chat', {
        message,
        ...context,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to chat with assistant:', error);
      throw new Error('Failed to chat with AI assistant');
    }
  }

  // ============ MODEL MANAGEMENT ============

  /**
   * Get available AI models
   */
  async getAvailableModels(): Promise<{
    models: {
      id: string;
      name: string;
      type: 'risk' | 'fraud' | 'compliance' | 'anomaly' | 'chat';
      version: string;
      accuracy?: number;
      lastTrained?: Date;
    }[];
  }> {
    try {
      const response = await this.client.get('/ai/models');
      return response.data;
    } catch (error) {
      console.error('Failed to get models:', error);
      throw new Error('Failed to get available models');
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(modelId: string): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    lastEvaluated: Date;
    trainingData: {
      samples: number;
      lastUpdated: Date;
    };
  }> {
    try {
      const response = await this.client.get(`/ai/models/${modelId}/metrics`);
      return response.data;
    } catch (error) {
      console.error('Failed to get model metrics:', error);
      throw new Error('Failed to get model metrics');
    }
  }
}

export default SaaSAICopilot;
