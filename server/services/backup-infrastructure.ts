import { db } from '../db';
import {
  backupConfigurations,
  backupJobs,
  restoreJobs,
  infrastructureServices,
  serviceHealthChecks,
  disasterRecoveryPlans,
  drTestExecutions,
  maintenanceWindows
} from '../../shared/schema';
import type {
  BackupConfiguration,
  InsertBackupJob,
  InsertRestoreJob,
  InsertServiceHealthCheck,
  InfrastructureService,
  DisasterRecoveryPlan,
  InsertDrTestExecution,
  MaintenanceWindow
} from '../../shared/schema';
import { eq, and, desc, gte, lte, isNull, sql } from 'drizzle-orm';
import * as cron from 'node-cron';
import * as schedule from 'node-schedule';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

// Cloud storage imports
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';

const execAsync = promisify(exec);

export interface BackupDestination {
  type: 'local' | 's3' | 'azure' | 'gcs';
  config: any;
  isDefault?: boolean;
}

export interface RetentionPolicy {
  daily: number;    // Days to keep daily backups
  weekly: number;   // Weeks to keep weekly backups  
  monthly: number;  // Months to keep monthly backups
  yearly: number;   // Years to keep yearly backups
}

export interface BackupOptions {
  includeSchema?: boolean;
  includeData?: boolean;
  includeLobs?: boolean;
  tableFilters?: string[];
  compression?: 'none' | 'gzip' | 'bzip2' | 'lz4';
  encryption?: {
    enabled: boolean;
    algorithm?: string;
    keyId?: string;
  };
}

export class BackupInfrastructureService {
  private scheduledJobs: Map<string, schedule.Job> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private cloudClients: Map<string, any> = new Map();

  constructor() {
    console.log('💾 Backup & Infrastructure Service initialized');
  }

  /**
   * Initialize the service and start all active schedules
   */
  async initialize() {
    console.log('💾 Starting Backup & Infrastructure Service...');
    
    // Load and schedule active backup configurations
    await this.loadBackupSchedules();
    
    // Start infrastructure health monitoring
    await this.startHealthMonitoring();
    
    // Schedule cleanup tasks
    this.scheduleMaintenanceTasks();
    
    console.log('💾 Backup & Infrastructure Service ready');
  }

  /**
   * Create a new backup configuration
   */
  async createBackupConfiguration(config: {
    tenantId?: string;
    name: string;
    backupType: string;
    schedule: string;
    retentionPolicy: RetentionPolicy;
    destinations: BackupDestination[];
    options?: BackupOptions;
    createdBy: string;
  }): Promise<BackupConfiguration> {
    const nextRun = this.calculateNextRun(config.schedule);
    
    const [created] = await db.insert(backupConfigurations).values({
      tenantId: config.tenantId || null,
      name: config.name,
      backupType: config.backupType,
      schedule: config.schedule,
      retentionPolicy: config.retentionPolicy,
      destinations: config.destinations,
      encryption: config.options?.encryption || { enabled: false },
      compression: config.options?.compression || 'gzip',
      nextRun,
      createdBy: config.createdBy
    }).returning();

    // Schedule the backup job
    await this.scheduleBackupJob(created);
    
    return created;
  }

  /**
   * Execute a backup job
   */
  async executeBackup(
    configId: string, 
    jobType: 'scheduled' | 'manual' | 'emergency' = 'scheduled',
    triggeredBy?: string
  ): Promise<string> {
    const config = await db.select()
      .from(backupConfigurations)
      .where(eq(backupConfigurations.id, configId))
      .limit(1);

    if (config.length === 0) {
      throw new Error('Backup configuration not found');
    }

    const backupConfig = config[0];

    // Create backup job record
    const [job] = await db.insert(backupJobs).values({
      configurationId: configId,
      jobType,
      status: 'pending',
      triggeredBy: triggeredBy || null
    } as InsertBackupJob).returning();

    // Start backup execution
    this.performBackup(job.id, backupConfig).catch(error => {
      console.error(`Backup job ${job.id} failed:`, error);
      this.updateBackupJobStatus(job.id, 'failed', error.message);
    });

    return job.id;
  }

  /**
   * Perform the actual backup operation
   */
  private async performBackup(jobId: string, config: BackupConfiguration) {
    const startTime = new Date();
    
    try {
      // Update job status
      await this.updateBackupJobStatus(jobId, 'running', null, { startedAt: startTime });

      // Generate backup filename
      const timestamp = startTime.toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${config.name}_${timestamp}`;
      const tempPath = path.join(process.cwd(), 'temp', `${filename}.sql`);

      // Ensure temp directory exists
      await fs.promises.mkdir(path.dirname(tempPath), { recursive: true });

      // Execute database backup
      const backupResult = await this.createDatabaseBackup(tempPath, config);

      // Compress if enabled
      let finalPath = tempPath;
      if (config.compression && config.compression !== 'none') {
        finalPath = await this.compressBackup(tempPath, config.compression);
      }

      // Encrypt if enabled
      if (config.encryption.enabled) {
        finalPath = await this.encryptBackup(finalPath);
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(finalPath);
      const stats = await fs.promises.stat(finalPath);

      // Upload to configured destinations
      const uploadResults = await this.uploadBackupToDestinations(
        finalPath, 
        `${filename}.backup`, 
        config.destinations
      );

      // Update job with success
      await this.updateBackupJobStatus(jobId, 'completed', null, {
        completedAt: new Date(),
        duration: Math.round((Date.now() - startTime.getTime()) / 1000),
        size: stats.size,
        recordCount: backupResult.recordCount,
        filePath: uploadResults[0]?.path || finalPath,
        checksum,
        metadata: { 
          destinations: uploadResults,
          compression: config.compression,
          encrypted: config.encryption.enabled
        }
      });

      // Update configuration last run
      await db.update(backupConfigurations)
        .set({ 
          lastRun: startTime,
          nextRun: this.calculateNextRun(config.schedule)
        })
        .where(eq(backupConfigurations.id, config.id));

      // Cleanup temp files
      await this.cleanupTempFiles([tempPath, finalPath]);

      // Apply retention policy
      await this.applyRetentionPolicy(config);

    } catch (error) {
      await this.updateBackupJobStatus(jobId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Create database backup using pg_dump
   */
  private async createDatabaseBackup(outputPath: string, config: BackupConfiguration) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    let pgDumpArgs = [
      '--verbose',
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges'
    ];

    // Add backup type specific options
    switch (config.backupType) {
      case 'schema_only':
        pgDumpArgs.push('--schema-only');
        break;
      case 'data_only':
        pgDumpArgs.push('--data-only');
        break;
      case 'full':
      default:
        // Full backup (schema + data) is default
        break;
    }

    // Add tenant filtering if specified
    if (config.tenantId) {
      pgDumpArgs.push(`--where`, `tenant_id='${config.tenantId}'`);
    }

    pgDumpArgs.push('--file', outputPath);

    const command = `pg_dump ${pgDumpArgs.join(' ')} "${connectionString}"`;
    
    try {
      const { stdout, stderr } = await execAsync(command);
      
      // Parse record count from output
      const recordCountMatch = stderr.match(/(\d+) rows/);
      const recordCount = recordCountMatch ? parseInt(recordCountMatch[1]) : 0;

      return { recordCount, output: stdout, errors: stderr };
    } catch (error) {
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  /**
   * Compress backup file
   */
  private async compressBackup(inputPath: string, compression: string): Promise<string> {
    const outputPath = `${inputPath}.${compression === 'gzip' ? 'gz' : compression}`;
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver(compression === 'gzip' ? 'tar' : compression, {
        gzip: compression === 'gzip',
        gzipOptions: { level: 9 }
      });

      output.on('close', () => resolve(outputPath));
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(inputPath, { name: path.basename(inputPath) });
      archive.finalize();
    });
  }

  /**
   * Encrypt backup file
   */
  private async encryptBackup(inputPath: string): Promise<string> {
    const outputPath = `${inputPath}.enc`;
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    return new Promise((resolve, reject) => {
      const cipher = crypto.createCipher('aes-256-cbc', key);
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);

      input.pipe(cipher).pipe(output);
      
      output.on('finish', () => resolve(outputPath));
      output.on('error', reject);
    });
  }

  /**
   * Calculate file checksum
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Upload backup to configured destinations
   */
  private async uploadBackupToDestinations(
    filePath: string, 
    remoteName: string, 
    destinations: any[]
  ): Promise<any[]> {
    const results = [];

    for (const destination of destinations) {
      try {
        let uploadResult;
        
        switch (destination.type) {
          case 's3':
            uploadResult = await this.uploadToS3(filePath, remoteName, destination.config);
            break;
          case 'azure':
            uploadResult = await this.uploadToAzure(filePath, remoteName, destination.config);
            break;
          case 'local':
            uploadResult = await this.copyToLocal(filePath, remoteName, destination.config);
            break;
          default:
            throw new Error(`Unsupported destination type: ${destination.type}`);
        }

        results.push({
          type: destination.type,
          success: true,
          path: uploadResult.path,
          size: uploadResult.size
        });
      } catch (error) {
        results.push({
          type: destination.type,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToS3(filePath: string, remoteName: string, config: any) {
    const client = this.getS3Client(config);
    const fileStream = fs.createReadStream(filePath);
    const stats = await fs.promises.stat(filePath);

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: `backups/${remoteName}`,
      Body: fileStream,
      ContentType: 'application/octet-stream',
      Metadata: {
        'backup-timestamp': new Date().toISOString(),
        'original-size': stats.size.toString()
      }
    });

    await client.send(command);

    return {
      path: `s3://${config.bucket}/backups/${remoteName}`,
      size: stats.size
    };
  }

  /**
   * Upload to Azure Blob Storage
   */
  private async uploadToAzure(filePath: string, remoteName: string, config: any) {
    const blobServiceClient = this.getAzureBlobClient(config);
    const containerClient = blobServiceClient.getContainerClient(config.container);
    const blockBlobClient = containerClient.getBlockBlobClient(`backups/${remoteName}`);

    const stats = await fs.promises.stat(filePath);
    
    await blockBlobClient.uploadFile(filePath, {
      metadata: {
        'backup-timestamp': new Date().toISOString(),
        'original-size': stats.size.toString()
      }
    });

    return {
      path: `azure://${config.account}/${config.container}/backups/${remoteName}`,
      size: stats.size
    };
  }

  /**
   * Copy to local directory
   */
  private async copyToLocal(filePath: string, remoteName: string, config: any) {
    const destPath = path.join(config.path, 'backups', remoteName);
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await fs.promises.copyFile(filePath, destPath);
    
    const stats = await fs.promises.stat(destPath);
    return {
      path: destPath,
      size: stats.size
    };
  }

  /**
   * Restore from backup
   */
  async createRestoreJob(options: {
    backupJobId: string;
    tenantId?: string;
    restoreType: string;
    targetEnvironment: string;
    triggeredBy: string;
    options?: any;
  }): Promise<string> {
    // Validate backup exists
    const backup = await db.select()
      .from(backupJobs)
      .where(eq(backupJobs.id, options.backupJobId))
      .limit(1);

    if (backup.length === 0) {
      throw new Error('Backup not found');
    }

    if (backup[0].status !== 'completed') {
      throw new Error('Cannot restore from incomplete backup');
    }

    // Create restore job
    const [job] = await db.insert(restoreJobs).values({
      backupJobId: options.backupJobId,
      tenantId: options.tenantId || null,
      restoreType: options.restoreType,
      targetEnvironment: options.targetEnvironment,
      options: options.options || {},
      triggeredBy: options.triggeredBy
    } as InsertRestoreJob).returning();

    // Start restore execution for non-production environments
    if (options.targetEnvironment !== 'production') {
      this.performRestore(job.id).catch(error => {
        console.error(`Restore job ${job.id} failed:`, error);
        this.updateRestoreJobStatus(job.id, 'failed', error.message);
      });
    }

    return job.id;
  }

  /**
   * Infrastructure health monitoring
   */
  async addInfrastructureService(service: {
    name: string;
    serviceType: string;
    endpoint: string;
    checkType: string;
    checkInterval?: number;
    timeout?: number;
    retryCount?: number;
    expectedResponse?: any;
    alertThreshold?: number;
    isCritical?: boolean;
    dependencies?: string[];
    tags?: string[];
  }): Promise<InfrastructureService> {
    const [created] = await db.insert(infrastructureServices).values({
      ...service,
      checkInterval: service.checkInterval || 60,
      timeout: service.timeout || 30,
      retryCount: service.retryCount || 3,
      alertThreshold: service.alertThreshold || 3,
      isCritical: service.isCritical || false,
      dependencies: service.dependencies || [],
      tags: service.tags || []
    }).returning();

    // Start health checking for this service
    await this.startServiceHealthCheck(created);

    return created;
  }

  /**
   * Start health monitoring for all active services
   */
  private async startHealthMonitoring() {
    const services = await db.select()
      .from(infrastructureServices)
      .where(eq(infrastructureServices.isActive, true));

    for (const service of services) {
      await this.startServiceHealthCheck(service);
    }
  }

  /**
   * Start health check for a specific service
   */
  private async startServiceHealthCheck(service: InfrastructureService) {
    // Clear existing interval if any
    if (this.healthCheckIntervals.has(service.id)) {
      clearInterval(this.healthCheckIntervals.get(service.id)!);
    }

    // Start new health check interval
    const interval = setInterval(async () => {
      await this.performHealthCheck(service);
    }, service.checkInterval * 1000);

    this.healthCheckIntervals.set(service.id, interval);

    // Perform initial check
    await this.performHealthCheck(service);
  }

  /**
   * Perform health check on a service
   */
  private async performHealthCheck(service: InfrastructureService) {
    const startTime = Date.now();
    let status: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';
    let responseTime: number | null = null;
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;

    try {
      switch (service.checkType) {
        case 'http':
          const httpResult = await this.performHttpCheck(service);
          status = httpResult.status;
          responseTime = httpResult.responseTime;
          statusCode = httpResult.statusCode;
          responseBody = httpResult.responseBody;
          break;
        
        case 'tcp':
          const tcpResult = await this.performTcpCheck(service);
          status = tcpResult.status;
          responseTime = tcpResult.responseTime;
          break;
        
        case 'database':
          const dbResult = await this.performDatabaseCheck(service);
          status = dbResult.status;
          responseTime = dbResult.responseTime;
          break;
        
        default:
          status = 'unknown';
          errorMessage = `Unsupported check type: ${service.checkType}`;
      }
    } catch (error) {
      status = 'unhealthy';
      errorMessage = error.message;
      responseTime = Date.now() - startTime;
    }

    // Record health check result
    await db.insert(serviceHealthChecks).values({
      serviceId: service.id,
      status,
      responseTime,
      statusCode,
      responseBody: responseBody?.substring(0, 1000), // Limit response body size
      errorMessage,
      metadata: {
        checkType: service.checkType,
        endpoint: service.endpoint
      }
    } as InsertServiceHealthCheck);

    // Check if alerting is needed
    if (status === 'unhealthy' && service.isCritical) {
      await this.checkServiceAlerts(service);
    }
  }

  /**
   * Perform HTTP health check
   */
  private async performHttpCheck(service: InfrastructureService) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(service.endpoint!, {
        method: 'GET',
        signal: AbortSignal.timeout(service.timeout * 1000)
      });

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();

      // Check expected response if configured
      let status: 'healthy' | 'unhealthy' = 'healthy';
      if (service.expectedResponse) {
        if (service.expectedResponse.statusCode && response.status !== service.expectedResponse.statusCode) {
          status = 'unhealthy';
        }
        if (service.expectedResponse.bodyContains && !responseBody.includes(service.expectedResponse.bodyContains)) {
          status = 'unhealthy';
        }
      } else if (response.status >= 400) {
        status = 'unhealthy';
      }

      return {
        status,
        responseTime,
        statusCode: response.status,
        responseBody
      };
    } catch (error) {
      return {
        status: 'unhealthy' as const,
        responseTime: Date.now() - startTime,
        statusCode: null,
        responseBody: null,
        error: error.message
      };
    }
  }

  /**
   * Perform TCP connection check
   */
  private async performTcpCheck(service: InfrastructureService) {
    const startTime = Date.now();
    
    return new Promise<{ status: 'healthy' | 'unhealthy', responseTime: number }>((resolve) => {
      const url = new URL(service.endpoint!);
      const net = require('net');
      const socket = new net.Socket();

      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          status: 'unhealthy',
          responseTime: Date.now() - startTime
        });
      }, service.timeout * 1000);

      socket.connect(parseInt(url.port) || 80, url.hostname, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({
          status: 'healthy',
          responseTime: Date.now() - startTime
        });
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve({
          status: 'unhealthy',
          responseTime: Date.now() - startTime
        });
      });
    });
  }

  /**
   * Perform database connection check
   */
  private async performDatabaseCheck(service: InfrastructureService) {
    const startTime = Date.now();
    
    try {
      // Simple query to check database connectivity
      await db.execute(sql`SELECT 1 as health_check`);
      
      return {
        status: 'healthy' as const,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy' as const,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Check if service alerts should be triggered
   */
  private async checkServiceAlerts(service: InfrastructureService) {
    // Get recent health checks for this service
    const recentChecks = await db.select()
      .from(serviceHealthChecks)
      .where(eq(serviceHealthChecks.serviceId, service.id))
      .orderBy(desc(serviceHealthChecks.checkedAt))
      .limit(service.alertThreshold);

    // Check if all recent checks failed
    const allUnhealthy = recentChecks.length >= service.alertThreshold && 
                        recentChecks.every(check => check.status === 'unhealthy');

    if (allUnhealthy) {
      // Trigger alert notification
      await this.sendServiceAlert(service, recentChecks);
    }
  }

  /**
   * Send alert for service failure
   */
  private async sendServiceAlert(service: InfrastructureService, failedChecks: any[]) {
    try {
      // Import notification service
      const { enhancedNotificationService } = await import('./notification-enhanced');
      
      const lastError = failedChecks[0]?.errorMessage || 'Unknown error';
      
      await enhancedNotificationService.createNotification(
        'system', // System-wide notification
        {
          type: 'service_failure',
          title: `Critical Service Alert: ${service.name}`,
          message: `Service "${service.name}" has failed ${service.alertThreshold} consecutive health checks. Last error: ${lastError}`,
          metadata: {
            serviceId: service.id,
            serviceName: service.name,
            serviceType: service.serviceType,
            endpoint: service.endpoint,
            consecutiveFailures: service.alertThreshold,
            lastError
          }
        },
        {
          priority: 'critical',
          category: 'maintenance',
          channels: ['email', 'webhook'],
          tags: ['infrastructure', 'alert', service.serviceType]
        }
      );
    } catch (error) {
      console.error('Failed to send service alert:', error);
    }
  }

  /**
   * Disaster Recovery Plan Management
   */
  async createDisasterRecoveryPlan(plan: {
    name: string;
    description?: string;
    planType: string;
    rto: number; // minutes
    rpo: number; // minutes
    priority?: number;
    triggerConditions: any;
    procedures: any;
    requiredResources?: any;
    testSchedule?: string;
    createdBy: string;
  }): Promise<DisasterRecoveryPlan> {
    const [created] = await db.insert(disasterRecoveryPlans).values({
      ...plan,
      priority: plan.priority || 1
    }).returning();

    // Schedule DR test if test schedule is provided
    if (plan.testSchedule) {
      this.scheduleDRTest(created);
    }

    return created;
  }

  /**
   * Execute disaster recovery test
   */
  async executeDRTest(
    planId: string, 
    testType: 'scheduled' | 'manual' | 'emergency' = 'manual',
    triggeredBy: string
  ): Promise<string> {
    const [testExecution] = await db.insert(drTestExecutions).values({
      planId,
      testType,
      triggeredBy
    } as InsertDrTestExecution).returning();

    // Start DR test execution
    this.performDRTest(testExecution.id).catch(error => {
      console.error(`DR test ${testExecution.id} failed:`, error);
    });

    return testExecution.id;
  }

  /**
   * Utility methods
   */
  private async loadBackupSchedules() {
    const configs = await db.select()
      .from(backupConfigurations)
      .where(eq(backupConfigurations.isActive, true));

    for (const config of configs) {
      await this.scheduleBackupJob(config);
    }
  }

  private async scheduleBackupJob(config: BackupConfiguration) {
    // Cancel existing job if any
    if (this.scheduledJobs.has(config.id)) {
      this.scheduledJobs.get(config.id)!.cancel();
    }

    // Schedule new job
    const job = schedule.scheduleJob(config.schedule, async () => {
      await this.executeBackup(config.id, 'scheduled');
    });

    this.scheduledJobs.set(config.id, job);
  }

  private calculateNextRun(cronExpression: string): Date {
    const job = schedule.scheduleJob(cronExpression, () => {});
    const nextDate = job.nextInvocation();
    job.cancel();
    return nextDate.toDate();
  }

  private async updateBackupJobStatus(
    jobId: string, 
    status: string, 
    errorMessage?: string | null,
    additionalFields?: any
  ) {
    const updateData: any = { status };
    
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }
    
    if (additionalFields) {
      Object.assign(updateData, additionalFields);
    }

    await db.update(backupJobs)
      .set(updateData)
      .where(eq(backupJobs.id, jobId));
  }

  private async updateRestoreJobStatus(
    jobId: string, 
    status: string, 
    errorMessage?: string | null
  ) {
    await db.update(restoreJobs)
      .set({ status, errorMessage })
      .where(eq(restoreJobs.id, jobId));
  }

  private async applyRetentionPolicy(config: BackupConfiguration) {
    const policy = config.retentionPolicy as RetentionPolicy;
    const now = new Date();

    // Delete old backups based on retention policy
    const cutoffDate = new Date(now.getTime() - policy.daily * 24 * 60 * 60 * 1000);
    
    await db.delete(backupJobs)
      .where(and(
        eq(backupJobs.configurationId, config.id),
        eq(backupJobs.status, 'completed'),
        lte(backupJobs.createdAt, cutoffDate)
      ));
  }

  private async cleanupTempFiles(filePaths: string[]) {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (error) {
        console.warn(`Failed to cleanup temp file ${filePath}:`, error.message);
      }
    }
  }

  private scheduleMaintenanceTasks() {
    // Daily cleanup of old health checks (keep last 7 days)
    cron.schedule('0 2 * * *', async () => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await db.delete(serviceHealthChecks)
        .where(lte(serviceHealthChecks.checkedAt, cutoff));
    });

    // Weekly backup configuration review
    cron.schedule('0 1 * * 0', async () => {
      await this.reviewBackupConfigurations();
    });
  }

  private async reviewBackupConfigurations() {
    // Check for backup configurations that haven't run recently
    const staleConfigs = await db.select()
      .from(backupConfigurations)
      .where(and(
        eq(backupConfigurations.isActive, true),
        lte(backupConfigurations.lastRun, new Date(Date.now() - 48 * 60 * 60 * 1000))
      ));

    for (const config of staleConfigs) {
      console.warn(`Backup configuration ${config.name} hasn't run in 48+ hours`);
    }
  }

  private async performRestore(jobId: string) {
    // Implementation for restore operation
    // This would involve downloading backup, decrypting/decompressing, and restoring to target
    console.log(`Starting restore job ${jobId}`);
  }

  private async performDRTest(testId: string) {
    // Implementation for disaster recovery test
    // This would execute the DR plan procedures and validate RTO/RPO objectives
    console.log(`Starting DR test ${testId}`);
  }

  private scheduleDRTest(plan: DisasterRecoveryPlan) {
    if (!plan.testSchedule) return;

    const job = schedule.scheduleJob(plan.testSchedule, async () => {
      await this.executeDRTest(plan.id, 'scheduled', 'system');
    });

    this.scheduledJobs.set(`dr_${plan.id}`, job);
  }

  private getS3Client(config: any) {
    const key = `s3_${config.region}_${config.accessKeyId}`;
    if (!this.cloudClients.has(key)) {
      const client = new S3Client({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        }
      });
      this.cloudClients.set(key, client);
    }
    return this.cloudClients.get(key);
  }

  private getAzureBlobClient(config: any) {
    const key = `azure_${config.account}`;
    if (!this.cloudClients.has(key)) {
      const client = BlobServiceClient.fromConnectionString(config.connectionString);
      this.cloudClients.set(key, client);
    }
    return this.cloudClients.get(key);
  }

  /**
   * Shutdown service and cleanup
   */
  async shutdown() {
    console.log('💾 Shutting down Backup & Infrastructure Service...');
    
    // Cancel all scheduled jobs
    for (const job of this.scheduledJobs.values()) {
      job.cancel();
    }
    this.scheduledJobs.clear();

    // Clear health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();

    console.log('💾 Backup & Infrastructure Service shutdown complete');
  }
}

export const backupInfrastructureService = new BackupInfrastructureService();
