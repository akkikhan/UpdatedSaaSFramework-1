// Simple test server to identify server binding issues
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.static("client/dist"));

// Test routes
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), port: PORT });
});

app.get("/admin/login", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Login Test</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; margin-bottom: 30px; }
        .status { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .info { background: #e7f3ff; color: #0056b3; padding: 10px; border-radius: 4px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎉 Server Working!</h1>
        <div class="status">
          ✅ Admin login page accessible<br>
          ✅ Express server running on port ${PORT}<br>
          ✅ Static file serving enabled<br>
          ✅ JSON middleware working<br>
        </div>
        <div class="info">
          <strong>Test Results:</strong><br>
          • Port binding: SUCCESS<br>
          • Route handling: SUCCESS<br>
          • HTTP responses: SUCCESS<br>
          • Timestamp: ${new Date().toISOString()}
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "API working",
    server: "test-server-minimal",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Catch all for testing
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API endpoint not found", path: req.path });
  } else {
    res.send(`
      <h1>Server is running!</h1>
      <p>Path: ${req.path}</p>
      <p>Available routes:</p>
      <ul>
        <li><a href="/health">/health</a> - Health check</li>
        <li><a href="/admin/login">/admin/login</a> - Admin login page</li>
        <li><a href="/api/test">/api/test</a> - API test endpoint</li>
      </ul>
    `);
  }
});

const server = app.listen(PORT, "0.0.0.0", err => {
  if (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }

  console.log(`🚀 Test server running successfully!`);
  console.log(`📍 Server bound to: 0.0.0.0:${PORT}`);
  console.log(`🌐 Local access: http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://0.0.0.0:${PORT}`);
  console.log(`🔧 Admin login: http://localhost:${PORT}/admin/login`);
  console.log(`🩺 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API test: http://localhost:${PORT}/api/test`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

server.on("error", err => {
  console.error("❌ Server error:", err);
  if (err.code === "EADDRINUSE") {
    console.error(`🚫 Port ${PORT} is already in use. Try a different port.`);
  }
});

process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
