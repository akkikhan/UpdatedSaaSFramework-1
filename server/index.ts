import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust proxy configuration for production environments
app.set('trust proxy', 1); // Trust first proxy (Replit, nginx, cloudflare, etc.)

// Enterprise Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow Vite dev server
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Rate Limiting - General API Protection
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter Rate Limiting for Authentication Routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per windowMs
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes"
  },
  skipSuccessfulRequests: true,
});

// Slow Down Middleware for API Routes
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 5000, // Maximum delay of 5 seconds
});

// Apply rate limiting to all API routes
app.use('/api', generalLimiter);
app.use('/api', speedLimiter);

// Apply stricter limits to auth routes
app.use('/api/auth', authLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Performance monitoring and logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", async () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);

      // Record performance metrics for monitoring
      try {
        const { monitoringService } = await import("./services/monitoring");
        const tenantId = req.headers['x-tenant-id'] as string || null;
        
        await monitoringService.recordApiResponseTime(
          tenantId,
          path,
          req.method,
          res.statusCode,
          duration
        );

        // Record error rates for failed requests
        if (res.statusCode >= 400) {
          await monitoringService.recordErrorRate(tenantId, path, 1, 1);
        }
      } catch (error) {
        // Don't let monitoring errors break the request
        console.error('Monitoring error:', error);
      }
    }
  });

  next();
});

(async () => {
  try {
    console.log("Starting server initialization...");
    
    // Initialize services
    const { monitoringService } = await import("./services/monitoring");
    const { backupInfrastructureService } = await import("./services/backup-infrastructure");
    const { configSyncService } = await import("./services/config-sync");
    const { realtimeSyncService } = await import("./services/realtime-sync");
    
    await Promise.all([
      monitoringService.initialize(),
      backupInfrastructureService.initialize(),
      Promise.resolve(configSyncService) // Already initialized in constructor
    ]);
    
    const server = await registerRoutes(app);
    console.log("Routes registered successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log("Setting up Vite...");
      await setupVite(app, server);
      console.log("Vite setup complete");
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    console.log(`Attempting to start server on port ${port}...`);
    const httpServer = server.listen(port, () => {
      console.log(`✅ Server successfully started on port ${port}`);
      console.log(`🔍 Monitoring: Active with real-time alerting`);
      console.log(`🔄 Config Sync: Bi-directional synchronization enabled`);
      
      // Initialize real-time sync with HTTP server
      realtimeSyncService.initialize(httpServer);
      
      log(`serving on port ${port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
      
      // Stop accepting new connections
      httpServer.close(async () => {
        console.log('🔌 HTTP server closed');
        
        // Shutdown services
        const { monitoringService } = await import("./services/monitoring");
        const { backupInfrastructureService } = await import("./services/backup-infrastructure");
        const { configSyncService } = await import("./services/config-sync");
        const { realtimeSyncService } = await import("./services/realtime-sync");
        
        await Promise.all([
          Promise.resolve(monitoringService.shutdown()),
          backupInfrastructureService.shutdown(),
          configSyncService.shutdown(),
          realtimeSyncService.shutdown()
        ]);
        
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
})();
