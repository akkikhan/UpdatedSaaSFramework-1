import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  decimal,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Tenants table - core tenant management
export const tenants = pgTable('tenants', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orgId: varchar('org_id', { length: 100 }).notNull().unique(), // URL slug
  name: varchar('name', { length: 255 }).notNull(),
  adminEmail: varchar('admin_email', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, active, suspended
  // All 6 module API keys
  authApiKey: varchar('auth_api_key', { length: 100 }).notNull(),
  rbacApiKey: varchar('rbac_api_key', { length: 100 }).notNull(),
  loggingApiKey: varchar('logging_api_key', { length: 100 }).notNull(),
  monitoringApiKey: varchar('monitoring_api_key', { length: 100 }).notNull(),
  notificationsApiKey: varchar('notifications_api_key', { length: 100 }).notNull(),
  aiCopilotApiKey: varchar('ai_copilot_api_key', { length: 100 }).notNull(),
  // Module configurations
  enabledModules: jsonb('enabled_modules').default(
    sql`'["auth", "rbac", "logging", "monitoring", "notifications", "ai-copilot"]'`
  ), // All modules enabled by default
  moduleConfigs: jsonb('module_configs').default(sql`'{}'`), // Store configs for each module
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Users table for authentication
export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  lastLogin: timestamp('last_login')
});

// Sessions table for JWT token management
export const sessions = pgTable('sessions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Roles table for RBAC
export const roles = pgTable('roles', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  permissions: text('permissions').array(), // Array of permission keys
  isSystem: boolean('is_system').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

// User-Role assignments
export const userRoles = pgTable('user_roles', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  roleId: uuid('role_id')
    .notNull()
    .references(() => roles.id),
  assignedAt: timestamp('assigned_at').defaultNow(),
  assignedBy: uuid('assigned_by').references(() => users.id)
});

// Permissions table
export const permissions = pgTable('permissions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  key: varchar('key', { length: 100 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }),
  isSystem: boolean('is_system').default(false)
});

// Tenant notifications for admin actions
export const tenantNotifications = pgTable('tenant_notifications', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: uuid('user_id').references(() => tenantUsers.id), // Specific user or null for tenant-wide
  type: varchar('type', { length: 50 }).notNull(), // module_enabled, module_disabled, status_changed, config_updated, security_alert, system_maintenance
  category: varchar('category', { length: 30 }).notNull().default('general'), // general, security, billing, maintenance, feature
  priority: varchar('priority', { length: 20 }).notNull().default('medium'), // low, medium, high, critical, urgent
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  channels: text('channels')
    .array()
    .notNull()
    .default(sql`'{email}'::text[]`), // email, sms, push, webhook, in_app
  metadata: jsonb('metadata').default(sql`'{}'`), // Store additional context
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  readAt: timestamp('read_at'),
  expiresAt: timestamp('expires_at'), // Auto-expire notifications
  actionUrl: varchar('action_url', { length: 500 }), // Deep link for action
  actionLabel: varchar('action_label', { length: 100 }), // Button text
  tags: text('tags').array() // Searchable tags
});

// User notification preferences
export const userNotificationPreferences = pgTable('user_notification_preferences', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .references(() => tenantUsers.id, { onDelete: 'cascade' })
    .notNull(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  category: varchar('category', { length: 30 }).notNull(), // general, security, billing, maintenance, feature
  channels: jsonb('channels')
    .notNull()
    .default(sql`'{"email": true, "sms": false, "push": false, "webhook": false, "in_app": true}'`),
  quietHours: jsonb('quiet_hours').default(
    sql`'{"enabled": false, "start": "22:00", "end": "08:00", "timezone": "UTC"}'`
  ),
  frequency: varchar('frequency', { length: 20 }).notNull().default('immediate'), // immediate, hourly, daily, weekly
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Notification delivery tracking
export const notificationDeliveries = pgTable('notification_deliveries', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  notificationId: uuid('notification_id')
    .references(() => tenantNotifications.id, { onDelete: 'cascade' })
    .notNull(),
  channel: varchar('channel', { length: 20 }).notNull(), // email, sms, push, webhook
  recipient: varchar('recipient', { length: 255 }).notNull(), // email address, phone number, device token, webhook URL
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, sent, delivered, failed, bounced, clicked
  attemptCount: integer('attempt_count').notNull().default(1),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  clickedAt: timestamp('clicked_at'),
  bouncedAt: timestamp('bounced_at'),
  providerId: varchar('provider_id', { length: 100 }), // External provider message ID
  metadata: jsonb('metadata').default(sql`'{}'`), // Provider-specific data
  createdAt: timestamp('created_at').defaultNow()
});

// Notification templates for consistent messaging
export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // Null for global templates
  name: varchar('name', { length: 100 }).notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  channel: varchar('channel', { length: 20 }).notNull(), // email, sms, push, webhook
  subject: varchar('subject', { length: 255 }), // Email subject or push title
  bodyTemplate: text('body_template').notNull(), // Handlebars template
  htmlTemplate: text('html_template'), // HTML version for email
  variables: text('variables').array(), // Available template variables
  isActive: boolean('is_active').notNull().default(true),
  isSystem: boolean('is_system').notNull().default(false), // System templates can't be modified
  createdBy: uuid('created_by').references(() => tenantUsers.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// SMS configuration and logs
export const smsConfigs = pgTable('sms_configs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // twilio, aws_sns, vonage
  isActive: boolean('is_active').notNull().default(true),
  config: jsonb('config').notNull(), // Provider-specific configuration
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Push notification configuration
export const pushConfigs = pgTable('push_configs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // firebase, apns, pusher
  platform: varchar('platform', { length: 20 }).notNull(), // ios, android, web
  isActive: boolean('is_active').notNull().default(true),
  config: jsonb('config').notNull(), // Provider-specific configuration (API keys, etc.)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Webhook configurations for external integrations
export const webhookConfigs = pgTable('webhook_configs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  events: text('events').array().notNull(), // Notification types to send
  headers: jsonb('headers').default(sql`'{}'`), // Custom headers
  secret: varchar('secret', { length: 255 }), // HMAC secret for verification
  isActive: boolean('is_active').notNull().default(true),
  timeout: integer('timeout').notNull().default(30), // Timeout in seconds
  retryCount: integer('retry_count').notNull().default(3),
  createdBy: uuid('created_by').references(() => tenantUsers.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Device tokens for push notifications
export const deviceTokens = pgTable('device_tokens', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .references(() => tenantUsers.id, { onDelete: 'cascade' })
    .notNull(),
  token: varchar('token', { length: 500 }).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(), // ios, android, web
  deviceInfo: jsonb('device_info').default(sql`'{}'`), // Device details
  isActive: boolean('is_active').notNull().default(true),
  lastUsed: timestamp('last_used').defaultNow(),
  createdAt: timestamp('created_at').defaultNow()
});

// Backup configurations and schedules
export const backupConfigurations = pgTable('backup_configurations', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // Null for system-wide backups
  name: varchar('name', { length: 100 }).notNull(),
  backupType: varchar('backup_type', { length: 20 }).notNull(), // full, incremental, differential, schema_only, data_only
  schedule: varchar('schedule', { length: 100 }).notNull(), // Cron expression
  retentionPolicy: jsonb('retention_policy').notNull(), // How long to keep backups
  destinations: jsonb('destinations').notNull(), // Storage destinations (S3, Azure Blob, local, etc.)
  encryption: jsonb('encryption').default(sql`'{"enabled": false}'`), // Encryption settings
  compression: varchar('compression', { length: 20 }).default('gzip'), // none, gzip, bzip2, lz4
  isActive: boolean('is_active').notNull().default(true),
  lastRun: timestamp('last_run'),
  nextRun: timestamp('next_run'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Backup execution history and status
export const backupJobs = pgTable('backup_jobs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  configurationId: uuid('configuration_id')
    .references(() => backupConfigurations.id, { onDelete: 'cascade' })
    .notNull(),
  jobType: varchar('job_type', { length: 20 }).notNull(), // scheduled, manual, emergency
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, running, completed, failed, cancelled
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // Duration in seconds
  size: bigint('size', { mode: 'bigint' }), // Backup size in bytes
  recordCount: bigint('record_count', { mode: 'bigint' }), // Number of records backed up
  filePath: varchar('file_path', { length: 500 }), // Path to backup file
  checksum: varchar('checksum', { length: 128 }), // File integrity checksum
  metadata: jsonb('metadata').default(sql`'{}'`), // Additional backup metadata
  errorMessage: text('error_message'),
  logs: text('logs'), // Detailed execution logs
  triggeredBy: uuid('triggered_by').references(() => users.id), // User who triggered manual backup
  createdAt: timestamp('created_at').defaultNow()
});

// Restore operations and history
export const restoreJobs = pgTable('restore_jobs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  backupJobId: uuid('backup_job_id')
    .references(() => backupJobs.id)
    .notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // Target tenant for restore
  restoreType: varchar('restore_type', { length: 20 }).notNull(), // full, partial, point_in_time, schema_only, data_only
  targetEnvironment: varchar('target_environment', { length: 20 }).notNull(), // production, staging, development, sandbox
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, running, completed, failed, cancelled
  options: jsonb('options').default(sql`'{}'`), // Restore options (tables, date ranges, etc.)
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // Duration in seconds
  recordsRestored: bigint('records_restored', { mode: 'bigint' }),
  errorMessage: text('error_message'),
  logs: text('logs'), // Detailed restore logs
  triggeredBy: uuid('triggered_by')
    .references(() => users.id)
    .notNull(),
  approvedBy: uuid('approved_by').references(() => users.id), // For production restores
  createdAt: timestamp('created_at').defaultNow()
});

// Infrastructure monitoring and health checks
export const infrastructureServices = pgTable('infrastructure_services', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(),
  serviceType: varchar('service_type', { length: 50 }).notNull(), // database, api, cache, queue, storage, external
  endpoint: varchar('endpoint', { length: 500 }), // Health check endpoint or connection string
  checkType: varchar('check_type', { length: 20 }).notNull(), // http, tcp, ping, database, custom
  checkInterval: integer('check_interval').notNull().default(60), // Seconds between checks
  timeout: integer('timeout').notNull().default(30), // Check timeout in seconds
  retryCount: integer('retry_count').notNull().default(3),
  expectedResponse: jsonb('expected_response'), // Expected response for validation
  alertThreshold: integer('alert_threshold').notNull().default(3), // Consecutive failures before alert
  isActive: boolean('is_active').notNull().default(true),
  isCritical: boolean('is_critical').notNull().default(false), // Critical service for system operation
  dependencies: text('dependencies').array(), // Service IDs that this service depends on
  tags: text('tags').array(), // Organizational tags
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Service health status and uptime tracking
export const serviceHealthChecks = pgTable('service_health_checks', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  serviceId: uuid('service_id')
    .references(() => infrastructureServices.id, { onDelete: 'cascade' })
    .notNull(),
  status: varchar('status', { length: 20 }).notNull(), // healthy, unhealthy, unknown, maintenance
  responseTime: integer('response_time'), // Response time in milliseconds
  statusCode: integer('status_code'), // HTTP status code or equivalent
  responseBody: text('response_body'), // Response content for analysis
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').default(sql`'{}'`), // Additional check data
  checkedAt: timestamp('checked_at').defaultNow()
});

// Disaster recovery plans and procedures
export const disasterRecoveryPlans = pgTable('disaster_recovery_plans', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  planType: varchar('plan_type', { length: 20 }).notNull(), // full_site, partial, data_only, application
  rto: integer('rto').notNull(), // Recovery Time Objective in minutes
  rpo: integer('rpo').notNull(), // Recovery Point Objective in minutes
  priority: integer('priority').notNull().default(1), // Execution priority (1 = highest)
  triggerConditions: jsonb('trigger_conditions').notNull(), // Conditions that trigger this plan
  procedures: jsonb('procedures').notNull(), // Step-by-step recovery procedures
  requiredResources: jsonb('required_resources'), // Required infrastructure and personnel
  testSchedule: varchar('test_schedule', { length: 100 }), // Cron expression for DR tests
  lastTested: timestamp('last_tested'),
  lastTestResult: varchar('last_test_result', { length: 20 }), // passed, failed, partial
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').references(() => users.id),
  approvedBy: uuid('approved_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// DR test executions and results
export const drTestExecutions = pgTable('dr_test_executions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  planId: uuid('plan_id')
    .references(() => disasterRecoveryPlans.id, { onDelete: 'cascade' })
    .notNull(),
  testType: varchar('test_type', { length: 20 }).notNull(), // scheduled, manual, emergency
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, running, completed, failed
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // Duration in seconds
  result: varchar('result', { length: 20 }), // passed, failed, partial
  objectivesMet: jsonb('objectives_met'), // RTO/RPO achievement tracking
  issues: jsonb('issues'), // Issues encountered during test
  recommendations: text('recommendations'),
  logs: text('logs'), // Detailed execution logs
  triggeredBy: uuid('triggered_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// System maintenance windows and schedules
export const maintenanceWindows = pgTable('maintenance_windows', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  maintenanceType: varchar('maintenance_type', { length: 30 }).notNull(), // scheduled, emergency, security, upgrade
  impact: varchar('impact', { length: 20 }).notNull(), // none, low, medium, high, critical
  affectedServices: text('affected_services').array().notNull(), // Service IDs affected
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('scheduled'), // scheduled, in_progress, completed, cancelled
  notificationSent: boolean('notification_sent').notNull().default(false),
  autoApproved: boolean('auto_approved').notNull().default(false),
  scheduledBy: uuid('scheduled_by')
    .references(() => users.id)
    .notNull(),
  approvedBy: uuid('approved_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Email logs for tracking
export const emailLogs = pgTable('email_logs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  templateType: varchar('template_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // sent, failed, pending
  sentAt: timestamp('sent_at').defaultNow(),
  errorMessage: text('error_message')
});

// System activity logs for admin monitoring
export const systemLogs = pgTable('system_logs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  adminUserId: uuid('admin_user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(), // module_enabled, module_disabled, tenant_created, etc.
  entityType: varchar('entity_type', { length: 50 }).notNull(), // tenant, module, user
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  details: jsonb('details').default(sql`'{}'`), // Additional context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow()
});

// Compliance audit logs for regulatory requirements
export const complianceAuditLogs = pgTable('compliance_audit_logs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  userId: uuid('user_id').references(() => tenantUsers.id), // End user performing action
  adminUserId: uuid('admin_user_id').references(() => users.id), // Platform admin
  eventType: varchar('event_type', { length: 50 }).notNull(), // rbac_change, data_access, security_event, auth_event
  eventCategory: varchar('event_category', { length: 50 }).notNull(), // create, read, update, delete, access, login, logout
  entityType: varchar('entity_type', { length: 50 }).notNull(), // user, role, permission, data_record, session
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  entityName: varchar('entity_name', { length: 255 }), // Human readable entity name
  action: varchar('action', { length: 100 }).notNull(), // role_assigned, permission_granted, data_exported, login_failed
  outcome: varchar('outcome', { length: 20 }).notNull().default('success'), // success, failure, blocked
  riskLevel: varchar('risk_level', { length: 20 }).notNull().default('low'), // low, medium, high, critical
  complianceFrameworks: text('compliance_frameworks')
    .array()
    .default(sql`'{}'::text[]`), // gdpr, sox, hipaa, pci, iso27001
  dataClassification: varchar('data_classification', { length: 50 }).default('public'), // public, internal, confidential, restricted
  details: jsonb('details').default(sql`'{}'`), // Event-specific details
  beforeState: jsonb('before_state'), // State before change (for audit purposes)
  afterState: jsonb('after_state'), // State after change
  sessionId: varchar('session_id', { length: 255 }), // Session identifier
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  geolocation: jsonb('geolocation'), // Country, region for compliance reporting
  timestamp: timestamp('timestamp').defaultNow(),
  retentionUntil: timestamp('retention_until') // Automatic data purging for compliance
});

// Security events for threat detection and compliance
export const securityEvents = pgTable('security_events', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  eventType: varchar('event_type', { length: 50 }).notNull(), // suspicious_login, brute_force, privilege_escalation
  severity: varchar('severity', { length: 20 }).notNull(), // info, warning, alert, critical
  source: varchar('source', { length: 100 }).notNull(), // api, web, mobile, system
  userId: uuid('user_id').references(() => tenantUsers.id),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  details: jsonb('details').default(sql`'{}'`),
  isResolved: boolean('is_resolved').default(false),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  timestamp: timestamp('timestamp').defaultNow()
});

// Performance metrics for monitoring and alerting
export const performanceMetrics = pgTable('performance_metrics', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  metricType: varchar('metric_type', { length: 50 }).notNull(), // api_response_time, error_rate, memory_usage, cpu_usage
  metricName: varchar('metric_name', { length: 100 }).notNull(), // specific endpoint or operation
  value: decimal('value', { precision: 10, scale: 4 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(), // ms, percentage, bytes, count
  labels: jsonb('labels').default(sql`'{}'`), // Additional metadata (endpoint, method, status_code)
  timestamp: timestamp('timestamp').defaultNow(),
  aggregationWindow: varchar('aggregation_window', { length: 20 }).default('1m') // 1m, 5m, 15m, 1h, 1d
});

// Alert rules and configurations
export const alertRules = pgTable('alert_rules', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').references(() => tenants.id), // null for platform-wide rules
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  metricType: varchar('metric_type', { length: 50 }).notNull(),
  condition: varchar('condition', { length: 20 }).notNull(), // greater_than, less_than, equals, not_equals
  threshold: decimal('threshold', { precision: 10, scale: 4 }).notNull(),
  timeWindow: varchar('time_window', { length: 20 }).notNull().default('5m'), // 1m, 5m, 15m, 30m, 1h
  severity: varchar('severity', { length: 20 }).notNull().default('warning'), // info, warning, critical
  isEnabled: boolean('is_enabled').notNull().default(true),
  notifications: jsonb('notifications').default(sql`'{}'`), // email, sms, webhook configs
  cooldownPeriod: integer('cooldown_period').default(300), // seconds before re-alerting
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Alert instances/events when rules are triggered
export const alertEvents = pgTable('alert_events', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  alertRuleId: uuid('alert_rule_id').references(() => alertRules.id),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  severity: varchar('severity', { length: 20 }).notNull(),
  message: text('message').notNull(),
  metricValue: decimal('metric_value', { precision: 10, scale: 4 }).notNull(),
  threshold: decimal('threshold', { precision: 10, scale: 4 }).notNull(),
  details: jsonb('details').default(sql`'{}'`),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, resolved, suppressed
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  notificationsSent: jsonb('notifications_sent').default(sql`'{}'`), // track what notifications were sent
  timestamp: timestamp('timestamp').defaultNow()
});

// System health checks and status
export const systemHealth = pgTable('system_health', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  service: varchar('service', { length: 50 }).notNull(), // auth, rbac, email, database, gateway
  status: varchar('status', { length: 20 }).notNull(), // healthy, degraded, down
  responseTime: integer('response_time'), // milliseconds
  details: jsonb('details').default(sql`'{}'`),
  lastChecked: timestamp('last_checked').defaultNow(),
  timestamp: timestamp('timestamp').defaultNow()
});

// Multi-Factor Authentication settings per user
export const userMFA = pgTable('user_mfa', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tenantUserId: uuid('tenant_user_id').references(() => tenantUsers.id, { onDelete: 'cascade' }),
  mfaType: varchar('mfa_type', { length: 20 }).notNull(), // totp, sms, email
  secret: varchar('secret', { length: 255 }), // TOTP secret or phone/email for SMS/email MFA
  isEnabled: boolean('is_enabled').notNull().default(false),
  isVerified: boolean('is_verified').notNull().default(false),
  backupCodes: text('backup_codes').array(), // Recovery codes
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Login attempts tracking for rate limiting and account lockout
export const loginAttempts = pgTable('login_attempts', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  userAgent: text('user_agent'),
  success: boolean('success').notNull(),
  failureReason: varchar('failure_reason', { length: 100 }), // invalid_password, account_locked, mfa_required
  mfaVerified: boolean('mfa_verified').default(false),
  timestamp: timestamp('timestamp').defaultNow(),
  geolocation: jsonb('geolocation') // Country, region, city for security analysis
});

// Account lockout status
export const accountLockouts = pgTable('account_lockouts', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  tenantUserId: uuid('tenant_user_id').references(() => tenantUsers.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  reason: varchar('reason', { length: 100 }).notNull(), // too_many_failures, suspicious_activity, admin_locked
  lockedAt: timestamp('locked_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // Auto-unlock time
  unlockAttempts: integer('unlock_attempts').default(0),
  unlockedAt: timestamp('unlocked_at'),
  unlockedBy: uuid('unlocked_by').references(() => users.id) // Admin who unlocked
});

// Password reset tokens and verification
export const passwordResets = pgTable('password_resets', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  tenantUserId: uuid('tenant_user_id').references(() => tenantUsers.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  usedAt: timestamp('used_at'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow()
});

// SAML SSO configurations per tenant
export const samlConfigs = pgTable('saml_configs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(), // Display name for the SSO provider
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  ssoUrl: varchar('sso_url', { length: 500 }).notNull(),
  x509Certificate: text('x509_certificate').notNull(),
  attributeMapping: jsonb('attribute_mapping').default(sql`'{}'`), // Map SAML attributes to user fields
  isEnabled: boolean('is_enabled').notNull().default(true),
  autoCreateUsers: boolean('auto_create_users').default(true),
  defaultRole: varchar('default_role', { length: 100 }), // Default role for auto-created users
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// SAML sessions tracking
export const samlSessions = pgTable('saml_sessions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  samlConfigId: uuid('saml_config_id')
    .references(() => samlConfigs.id, { onDelete: 'cascade' })
    .notNull(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id').references(() => tenantUsers.id, { onDelete: 'cascade' }),
  sessionIndex: varchar('session_index', { length: 255 }),
  nameId: varchar('name_id', { length: 255 }).notNull(),
  attributes: jsonb('attributes').default(sql`'{}'`),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow()
});

// Tenant Users - The actual end users of each tenant's application
export const tenantUsers = pgTable('tenant_users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  externalId: varchar('external_id', { length: 255 }), // For SSO integrations
  metadata: jsonb('metadata').default(sql`'{}'`)
});

// Tenant Roles - Custom roles within each tenant
export const tenantRoles = pgTable('tenant_roles', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  permissions: text('permissions')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// User Role Assignments with time-based assignments
export const tenantUserRoles = pgTable('tenant_user_roles', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => tenantUsers.id, { onDelete: 'cascade' })
    .notNull(),
  roleId: uuid('role_id')
    .references(() => tenantRoles.id, { onDelete: 'cascade' })
    .notNull(),
  assignedAt: timestamp('assigned_at').defaultNow(),
  assignedBy: uuid('assigned_by').references(() => tenantUsers.id),
  expiresAt: timestamp('expires_at'), // Null for permanent assignments
  isActive: boolean('is_active').notNull().default(true),
  activatedAt: timestamp('activated_at'),
  deactivatedAt: timestamp('deactivated_at'),
  deactivatedBy: uuid('deactivated_by').references(() => tenantUsers.id),
  assignmentType: varchar('assignment_type', { length: 20 }).notNull().default('permanent'), // permanent, temporary, conditional
  conditions: jsonb('conditions').default(sql`'{}'`), // Time-based, location-based, etc.
  metadata: jsonb('metadata').default(sql`'{}'`) // Additional assignment context
});

// Role hierarchy for inherited permissions
export const roleHierarchy = pgTable('role_hierarchy', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  parentRoleId: uuid('parent_role_id')
    .references(() => tenantRoles.id, { onDelete: 'cascade' })
    .notNull(),
  childRoleId: uuid('child_role_id')
    .references(() => tenantRoles.id, { onDelete: 'cascade' })
    .notNull(),
  inheritanceType: varchar('inheritance_type', { length: 20 }).notNull().default('full'), // full, partial, additive
  inheritedPermissions: text('inherited_permissions').array(), // Specific permissions to inherit
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Permission groups for easier management
export const permissionGroups = pgTable('permission_groups', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  permissions: text('permissions')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  category: varchar('category', { length: 50 }).notNull().default('custom'), // system, business, custom
  isSystem: boolean('is_system').notNull().default(false),
  displayOrder: integer('display_order').default(0),
  icon: varchar('icon', { length: 50 }), // UI icon identifier
  color: varchar('color', { length: 20 }), // UI color theme
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Role templates for quick role creation
export const roleTemplates = pgTable('role_templates', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // Null for global templates
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  permissions: text('permissions')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  permissionGroupIds: text('permission_group_ids').array(), // Reference to permission groups
  businessType: varchar('business_type', { length: 50 }), // healthcare, finance, etc.
  complianceLevel: varchar('compliance_level', { length: 20 }).default('standard'), // basic, standard, high, critical
  isPublic: boolean('is_public').notNull().default(false), // Available to all tenants
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').default(0), // Track template popularity
  tags: text('tags').array(), // Searchable tags
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Bulk operations tracking
export const bulkOperations = pgTable('bulk_operations', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  operationType: varchar('operation_type', { length: 50 }).notNull(), // assign_roles, revoke_roles, update_permissions
  targetType: varchar('target_type', { length: 20 }).notNull(), // users, roles, permissions
  targetIds: text('target_ids').array().notNull(), // IDs of affected entities
  parameters: jsonb('parameters').notNull(), // Operation parameters
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, processing, completed, failed
  progress: integer('progress').default(0), // Percentage completed
  totalItems: integer('total_items').notNull(),
  processedItems: integer('processed_items').default(0),
  failedItems: integer('failed_items').default(0),
  errorMessages: text('error_messages').array(),
  result: jsonb('result'), // Final operation result
  initiatedBy: uuid('initiated_by')
    .references(() => tenantUsers.id)
    .notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow()
});

// Permission audit log for RBAC changes
export const permissionAuditLog = pgTable('permission_audit_log', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id').references(() => tenantUsers.id),
  roleId: uuid('role_id').references(() => tenantRoles.id),
  action: varchar('action', { length: 50 }).notNull(), // role_assigned, permission_granted, hierarchy_changed
  entityType: varchar('entity_type', { length: 20 }).notNull(), // user, role, permission, hierarchy
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  changeReason: text('change_reason'),
  changedBy: uuid('changed_by')
    .references(() => tenantUsers.id)
    .notNull(),
  approvedBy: uuid('approved_by').references(() => tenantUsers.id), // For approval workflows
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow()
});

// Platform Admin RBAC Configuration Tables

// Permission Templates - Reusable permission sets for different business scenarios
export const permissionTemplates = pgTable('permission_templates', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  permissions: text('permissions')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  businessTypes: text('business_types')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Business Types - Different business categories with specific compliance requirements
export const businessTypes = pgTable('business_types', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  requiredCompliance: text('required_compliance')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  defaultPermissions: text('default_permissions')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  riskLevel: varchar('risk_level', { length: 20 }).notNull().default('low'), // low, medium, high, critical
  isActive: boolean('is_active').notNull().default(true),
  maxTenants: integer('max_tenants'), // Optional limit for business type
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Default Roles - Templates for roles that get created for new tenants
export const defaultRoles = pgTable('default_roles', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  permissions: text('permissions')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  businessTypeId: uuid('business_type_id').references(() => businessTypes.id, {
    onDelete: 'cascade'
  }),
  permissionTemplateId: uuid('permission_template_id').references(() => permissionTemplates.id, {
    onDelete: 'set null'
  }),
  isSystemRole: boolean('is_system_role').notNull().default(false),
  canBeModified: boolean('can_be_modified').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  priority: integer('priority').notNull().default(1), // 1 = highest priority
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants)
  .omit({
    id: true,
    authApiKey: true,
    rbacApiKey: true,
    loggingApiKey: true,
    monitoringApiKey: true,
    notificationsApiKey: true,
    aiCopilotApiKey: true,
    createdAt: true,
    updatedAt: true
  })
  .extend({
    enabledModules: z
      .array(
        z.enum([
          'auth',
          'rbac',
          'logging',
          'monitoring',
          'notifications',
          'ai-copilot',
          'azure-ad',
          'auth0',
          'saml'
        ])
      )
      .optional(),
    moduleConfigs: z
      .object({
        auth: z
          .object({
            providers: z
              .array(
                z.object({
                  type: z.enum(['azure-ad', 'auth0', 'saml', 'local']),
                  name: z.string(), // "Employee SSO", "Customer Auth", etc.
                  priority: z.number().default(1), // 1 = primary, 2 = secondary
                  config: z
                    .object({
                      // Azure AD config
                      tenantId: z.string().optional(),
                      clientId: z.string().optional(),
                      clientSecret: z.string().optional(),
                      domain: z.string().optional(),
                      // Auth0 config
                      auth0Domain: z.string().optional(),
                      audience: z.string().optional(),
                      // SAML config
                      entryPoint: z.string().optional(),
                      issuer: z.string().optional(),
                      cert: z.string().optional(),
                      identifierFormat: z.string().optional(),
                      // Common settings
                      callbackUrl: z.string().optional(),
                      logoutUrl: z.string().optional()
                    })
                    .optional(),
                  userMapping: z
                    .object({
                      emailField: z.string().default('email'),
                      nameField: z.string().default('name'),
                      roleField: z.string().optional()
                    })
                    .optional(),
                  enabled: z.boolean().default(true)
                })
              )
              .optional(),
            defaultProvider: z.string().optional(), // Which provider to use by default
            allowFallback: z.boolean().default(true) // Allow fallback to other providers
          })
          .optional(),
        rbac: z
          .object({
            permissionTemplate: z.enum(['standard', 'enterprise', 'custom']).default('standard'),
            businessType: z
              .enum(['general', 'healthcare', 'finance', 'education', 'government'])
              .default('general'),
            customPermissions: z.array(z.string()).optional(),
            defaultRoles: z.array(z.string()).optional()
          })
          .optional(),
        logging: z
          .object({
            levels: z.array(z.enum(['error', 'warn', 'info', 'debug', 'trace'])).optional(),
            destinations: z
              .array(z.enum(['database', 'elasticsearch', 'cloudwatch', 'datadog']))
              .optional(),
            retention: z
              .object({
                error: z.string().optional(),
                security: z.string().optional(),
                audit: z.string().optional(),
                performance: z.string().optional()
              })
              .optional(),
            alerting: z
              .object({
                errorThreshold: z.number().optional(),
                securityEvents: z.boolean().optional(),
                performanceDegradation: z.boolean().optional()
              })
              .optional()
          })
          .optional(),
        notifications: z
          .object({
            channels: z.array(z.enum(['email', 'sms', 'push', 'webhook', 'slack'])).optional(),
            emailProvider: z.enum(['sendgrid', 'mailgun', 'ses', 'smtp']).optional(),
            smsProvider: z.enum(['twilio', 'vonage', 'aws-sns']).optional(),
            pushProvider: z.enum(['firebase', 'apn', 'onesignal']).optional(),
            templates: z
              .object({
                welcome: z.boolean().optional(),
                trial_ending: z.boolean().optional(),
                payment_failed: z.boolean().optional(),
                security_alert: z.boolean().optional()
              })
              .optional()
          })
          .optional(),
        'ai-copilot': z
          .object({
            provider: z.enum(['openai', 'anthropic', 'azure-openai', 'aws-bedrock']).optional(),
            model: z.string().optional(),
            capabilities: z
              .object({
                chatSupport: z.boolean().optional(),
                codeAssistance: z.boolean().optional(),
                documentAnalysis: z.boolean().optional(),
                workflowAutomation: z.boolean().optional()
              })
              .optional(),
            safety: z
              .object({
                contentFiltering: z.boolean().optional(),
                piiDetection: z.boolean().optional(),
                rateLimiting: z.boolean().optional()
              })
              .optional()
          })
          .optional()
      })
      .optional()
  });

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true
});

export const insertTenantUserSchema = createInsertSchema(tenantUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTenantRoleSchema = createInsertSchema(tenantRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTenantUserRoleSchema = createInsertSchema(tenantUserRoles).omit({
  id: true,
  assignedAt: true
});

export const insertTenantNotificationSchema = createInsertSchema(tenantNotifications).omit({
  id: true,
  createdAt: true
});

export const insertComplianceAuditLogSchema = createInsertSchema(complianceAuditLogs).omit({
  id: true,
  timestamp: true
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  timestamp: true
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Session = typeof sessions.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
export type SystemLog = typeof systemLogs.$inferSelect;
export type ComplianceAuditLog = typeof complianceAuditLogs.$inferSelect;
export type InsertComplianceAuditLog = z.infer<typeof insertComplianceAuditLogSchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type TenantUser = typeof tenantUsers.$inferSelect;
export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;
export type TenantRole = typeof tenantRoles.$inferSelect;
export type InsertTenantRole = z.infer<typeof insertTenantRoleSchema>;
export type TenantUserRole = typeof tenantUserRoles.$inferSelect;

// Platform Admin RBAC Configuration Types
export type PermissionTemplate = typeof permissionTemplates.$inferSelect;
export type BusinessType = typeof businessTypes.$inferSelect;
export type DefaultRole = typeof defaultRoles.$inferSelect;

// Insert schemas for RBAC Configuration
export const insertPermissionTemplateSchema = createInsertSchema(permissionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBusinessTypeSchema = createInsertSchema(businessTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertDefaultRoleSchema = createInsertSchema(defaultRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertPermissionTemplate = z.infer<typeof insertPermissionTemplateSchema>;
export type InsertBusinessType = z.infer<typeof insertBusinessTypeSchema>;
export type InsertDefaultRole = z.infer<typeof insertDefaultRoleSchema>;
export type InsertTenantUserRole = z.infer<typeof insertTenantUserRoleSchema>;
export type TenantNotification = typeof tenantNotifications.$inferSelect;
export type InsertTenantNotification = z.infer<typeof insertTenantNotificationSchema>;

// Performance monitoring and alerting types
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = typeof performanceMetrics.$inferInsert;
export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = typeof alertRules.$inferInsert;
export type AlertEvent = typeof alertEvents.$inferSelect;
export type InsertAlertEvent = typeof alertEvents.$inferInsert;
export type SystemHealth = typeof systemHealth.$inferSelect;
export type InsertSystemHealth = typeof systemHealth.$inferInsert;

// Advanced authentication types
export type UserMFA = typeof userMFA.$inferSelect;
export type InsertUserMFA = typeof userMFA.$inferInsert;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;
export type AccountLockout = typeof accountLockouts.$inferSelect;
export type InsertAccountLockout = typeof accountLockouts.$inferInsert;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type InsertPasswordReset = typeof passwordResets.$inferInsert;
export type SamlConfig = typeof samlConfigs.$inferSelect;
export type InsertSamlConfig = typeof samlConfigs.$inferInsert;
export type SamlSession = typeof samlSessions.$inferSelect;
export type InsertSamlSession = typeof samlSessions.$inferInsert;

// Advanced RBAC types
export type RoleHierarchy = typeof roleHierarchy.$inferSelect;
export type InsertRoleHierarchy = typeof roleHierarchy.$inferInsert;
export type PermissionGroup = typeof permissionGroups.$inferSelect;
export type InsertPermissionGroup = typeof permissionGroups.$inferInsert;
export type RoleTemplate = typeof roleTemplates.$inferSelect;
export type InsertRoleTemplate = typeof roleTemplates.$inferInsert;
export type BulkOperation = typeof bulkOperations.$inferSelect;
export type InsertBulkOperation = typeof bulkOperations.$inferInsert;
export type PermissionAuditLog = typeof permissionAuditLog.$inferSelect;
export type InsertPermissionAuditLog = typeof permissionAuditLog.$inferInsert;

// Advanced notification types
export type UserNotificationPreference = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreference = typeof userNotificationPreferences.$inferInsert;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type InsertNotificationDelivery = typeof notificationDeliveries.$inferInsert;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplates.$inferInsert;
export type SmsConfig = typeof smsConfigs.$inferSelect;
export type InsertSmsConfig = typeof smsConfigs.$inferInsert;
export type PushConfig = typeof pushConfigs.$inferSelect;
export type InsertPushConfig = typeof pushConfigs.$inferInsert;
export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type InsertWebhookConfig = typeof webhookConfigs.$inferInsert;
export type DeviceToken = typeof deviceTokens.$inferSelect;
export type InsertDeviceToken = typeof deviceTokens.$inferInsert;

// Backup and infrastructure types
export type BackupConfiguration = typeof backupConfigurations.$inferSelect;
export type InsertBackupConfiguration = typeof backupConfigurations.$inferInsert;
export type BackupJob = typeof backupJobs.$inferSelect;
export type InsertBackupJob = typeof backupJobs.$inferInsert;
export type RestoreJob = typeof restoreJobs.$inferSelect;
export type InsertRestoreJob = typeof restoreJobs.$inferInsert;
export type InfrastructureService = typeof infrastructureServices.$inferSelect;
export type InsertInfrastructureService = typeof infrastructureServices.$inferInsert;
export type ServiceHealthCheck = typeof serviceHealthChecks.$inferSelect;
export type InsertServiceHealthCheck = typeof serviceHealthChecks.$inferInsert;
export type DisasterRecoveryPlan = typeof disasterRecoveryPlans.$inferSelect;
export type InsertDisasterRecoveryPlan = typeof disasterRecoveryPlans.$inferInsert;
export type DrTestExecution = typeof drTestExecutions.$inferSelect;
export type InsertDrTestExecution = typeof drTestExecutions.$inferInsert;
export type MaintenanceWindow = typeof maintenanceWindows.$inferSelect;
export type InsertMaintenanceWindow = typeof maintenanceWindows.$inferInsert;
