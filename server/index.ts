import dotenv from "dotenv";
// Prefer IPv4 DNS results first to avoid IPv6 connectivity issues (e.g., PG over IPv6 timeouts)
import { setDefaultResultOrder } from "node:dns";
try {
  setDefaultResultOrder("ipv4first");
  // eslint-disable-next-line no-console
  console.log("Networking: DNS result order set to ipv4first");
} catch {}

// Load environment variables FIRST before any other imports
dotenv.config();

import { validateEnvironment } from "./config/environment";

// Validate environment before starting server
try {
  validateEnvironment();
} catch (error) {
  process.exit(1);
}

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// ❌ REMOVED: Replit proxy trust - not needed for local development
// Trust proxy configuration for production environments
// app.set("trust proxy", 1); // Trust first proxy (Replit, nginx, cloudflare, etc.)

// Enterprise Security Headers
app.use(
  helmet({
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
      preload: true,
    },
  })
);

// Rate Limiting - General API Protection (can be bypassed in development)
const rateLimitBypass =
  process.env.RATE_LIMIT_BYPASS === "true" || process.env.NODE_ENV === "development";
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: rateLimitBypass ? 100000 : 100, // Very high in dev/bypass
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter Rate Limiting for Authentication Routes (relaxed in development)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: rateLimitBypass ? 100000 : 5, // Relax in dev/bypass
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes",
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
// Apply rate limiters (relaxed or effectively disabled if RATE_LIMIT_BYPASS=true)
app.use("/api", generalLimiter);
app.use("/api", speedLimiter);

// Apply stricter limits to auth routes
app.use("/api/auth", authLimiter);
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.use("/api/platform/auth", authLimiter); // Azure AD platform auth protection

if (rateLimitBypass) {
  console.log(
    "Rate limiting relaxed (development/bypass). Set RATE_LIMIT_BYPASS=false for strict limits."
  );
}

app.use(express.json({ limit: "10mb" })); // Limit payload size
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
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
    }
  });

  next();
});

(async () => {
  try {
    console.log("Starting server initialization...");
    const server = await registerRoutes(app);
    console.log("Routes registered successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("Express error handler:", err);
      res.status(status).json({ message });
      // DO NOT throw err here - it crashes the server!
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
    const port = parseInt(process.env.PORT || "5000", 10);
    console.log(`Attempting to start server on port ${port}...`);

    // ✅ LOCAL: Bind to all interfaces for local development
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server successfully started on http://0.0.0.0:${port}`);
      console.log(`   Access via: http://localhost:${port} or http://127.0.0.1:${port}`);
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
})();
