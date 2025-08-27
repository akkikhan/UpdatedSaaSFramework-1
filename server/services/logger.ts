import { storage } from '../storage';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface BaseLog {
  tenantId?: string | null;
  adminUserId?: string | null;
  action: string; // high level verb / domain action
  entityType: string; // api|system|security|auth|job
  entityId: string; // path, job name, etc.
  details?: any; // structured details
  ipAddress?: string | null;
  userAgent?: string | null;
  level?: LogLevel;
  ts?: number;
  durationMs?: number;
  statusCode?: number;
  method?: string;
}

/**
 * Core logger with small in-memory buffer + periodic flush to DB via storage.logSystemActivity.
 * For now we reuse system_logs table; future: separate table or external sink.
 */
class CoreLogger {
  private buffer: BaseLog[] = [];
  private flushInterval: NodeJS.Timeout;
  private flushing = false;
  private readonly maxBuffer = 50;
  private readonly intervalMs = 3000;

  constructor() {
    this.flushInterval = setInterval(() => this.flush().catch(() => {}), this.intervalMs);
    this.flushInterval.unref();
  }

  async log(entry: BaseLog) {
    entry.ts = Date.now();
    this.buffer.push(entry);
    if (this.buffer.length >= this.maxBuffer) {
      this.flush().catch(() => {});
    }
  }

  /** Convenience helper for API request logs */
  async logApi(options: {
    path: string;
    method: string;
    statusCode: number;
    durationMs: number;
    tenantId?: string | null;
    adminUserId?: string | null;
    meta?: any;
  }) {
    await this.log({
      action: 'api_request',
      entityType: 'api',
      entityId: options.path,
      details: {
        method: options.method,
        statusCode: options.statusCode,
        durationMs: options.durationMs,
        ...(options.meta || {})
      },
      tenantId: options.tenantId,
      adminUserId: options.adminUserId,
      level: options.statusCode >= 500 ? 'error' : options.statusCode >= 400 ? 'warn' : 'info'
    });
  }

  private async flush() {
    if (this.flushing) return;
    if (!this.buffer.length) return;
    this.flushing = true;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      // Persist sequentially; for now, simple insert per record (can batch later using transaction)
      for (const rec of batch) {
        await storage.logSystemActivity({
          tenantId: rec.tenantId || undefined,
          adminUserId: rec.adminUserId || undefined,
          // We map log meta to existing columns
          action: rec.action,
          entityType: rec.entityType,
          entityId: rec.entityId,
          details: rec.details,
          ipAddress: rec.ipAddress || undefined,
          userAgent: rec.userAgent || undefined
        });
      }
    } catch (err) {
      // On failure re-queue (prepend) but cap to avoid infinite growth
      this.buffer = batch.concat(this.buffer).slice(0, 500);
      // eslint-disable-next-line no-console
      console.error('[logger] flush failed', err);
    } finally {
      this.flushing = false;
    }
  }

  async shutdown() {
    clearInterval(this.flushInterval);
    await this.flush();
  }
}

export const coreLogger = new CoreLogger();
