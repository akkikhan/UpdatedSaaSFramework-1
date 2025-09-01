// Fixed server with database connection test
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(join(__dirname, "client/dist")));

// Test database connection
async function testDatabaseConnection() {
  try {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = await import("postgres");

    if (!process.env.DATABASE_URL) {
      console.log("⚠️  No DATABASE_URL found, using demo mode");
      return false;
    }

    const sql = postgres.default(process.env.DATABASE_URL);
    const db = drizzle(sql);

    // Simple test query
    await sql`SELECT 1 as test`;
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.log("⚠️  Database connection failed, using demo mode:", error.message);
    return false;
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    port: PORT,
    server: "saas-framework",
    version: "1.0.0",
  });
});

// Admin login page
app.get("/admin/login", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Platform Admin Login</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { color: #333; font-size: 28px; font-weight: 600; }
        .logo p { color: #666; margin-top: 5px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 5px; color: #333; font-weight: 500; }
        .form-group input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; transition: border-color 0.3s; }
        .form-group input:focus { outline: none; border-color: #667eea; }
        .btn { width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background 0.3s; }
        .btn:hover { background: #5a6fd8; }
        .status { background: #d4edda; color: #155724; padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: center; }
        .links { text-align: center; margin-top: 20px; }
        .links a { color: #667eea; text-decoration: none; margin: 0 10px; }
        .links a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>🚀 SaaS Framework</h1>
          <p>Platform Administration</p>
        </div>
        
        <div class="status">
          ✅ Server running successfully on port ${PORT}<br>
          ⏰ ${new Date().toISOString()}
        </div>

        <form id="loginForm">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="admin@example.com" required>
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Enter your password" required>
          </div>
          
          <button type="submit" class="btn">Sign In to Platform</button>
        </form>

        <div class="links">
          <a href="/health">Health Check</a>
          <a href="/api/test">API Test</a>
          <a href="/">Dashboard</a>
        </div>
      </div>

      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          
          try {
            const response = await fetch('/api/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              alert('Login successful! Token: ' + result.token);
            } else {
              alert('Login failed: ' + result.error);
            }
          } catch (error) {
            alert('Connection error: ' + error.message);
          }
        });
      </script>
    </body>
    </html>
  `);
});

// API Routes
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;

  // Demo credentials for testing
  if (email === "admin@test.com" && password === "test123") {
    res.json({
      success: true,
      token: "demo-jwt-token-" + Date.now(),
      user: { email, role: "admin" },
    });
  } else {
    res.status(401).json({
      error: "Invalid credentials. Try: admin@test.com / test123",
    });
  }
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "API working",
    server: "saas-framework",
    port: PORT,
    timestamp: new Date().toISOString(),
    endpoints: ["GET /health", "GET /admin/login", "POST /api/admin/login", "GET /api/test"],
  });
});

// Tenant creation endpoint (demo)
app.post("/api/admin/tenants", (req, res) => {
  const { name, adminEmail, modules } = req.body;

  res.json({
    success: true,
    tenant: {
      id: "demo-tenant-" + Date.now(),
      name,
      adminEmail,
      modules: modules || ["auth", "rbac"],
      status: "active",
      createdAt: new Date().toISOString(),
    },
  });
});

// Catch all - serve React app
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API endpoint not found", path: req.path });
  } else {
    res.sendFile(join(__dirname, "client/dist/index.html"));
  }
});

// Start server
async function startServer() {
  const dbConnected = await testDatabaseConnection();

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 SaaS Framework Server Started!");
    console.log("📍 Server: http://localhost:" + PORT);
    console.log("🔧 Admin: http://localhost:" + PORT + "/admin/login");
    console.log("🩺 Health: http://localhost:" + PORT + "/health");
    console.log("🗄️  Database: " + (dbConnected ? "Connected" : "Demo Mode"));
    console.log("⏰ Started: " + new Date().toISOString());
    console.log("");
    console.log("Demo credentials: admin@test.com / test123");
  });

  server.on("error", err => {
    console.error("❌ Server error:", err);
    if (err.code === "EADDRINUSE") {
      console.error(`🚫 Port ${PORT} is already in use`);
    }
  });

  process.on("SIGTERM", () => {
    console.log("🛑 Shutting down gracefully...");
    server.close(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    console.log("🛑 Shutting down gracefully...");
    server.close(() => process.exit(0));
  });
}

startServer().catch(error => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
