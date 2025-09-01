import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "operational",
    timestamp: new Date().toISOString(),
    message: "Simple test server is running",
  });
});

// Serve Azure AD login page
app.get("/admin/login", (req, res) => {
  const loginPagePath = path.resolve(__dirname, "../client/azure-ad-login.html");
  res.sendFile(loginPagePath);
});

// Basic platform admin login test
app.post("/api/platform/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "admin@yourcompany.com" && password === "admin123") {
    res.json({
      token: "test-jwt-token-12345",
      admin: {
        id: "admin-1",
        email: email,
        name: "Test Administrator",
        role: "super_admin",
      },
    });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// Azure AD routes (simplified)
app.get("/api/platform/auth/azure/login", (req, res) => {
  // For testing - redirect back with a test token
  res.redirect("/admin/login?token=azure-test-token-12345");
});

const port = 3001; // Changed from 3000 to avoid conflict
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Test server running on http://localhost:${port}`);
  console.log(`   - Health: http://localhost:${port}/api/health`);
  console.log(`   - Admin Login: http://localhost:${port}/admin/login`);
  console.log(`   - Binding to all interfaces (0.0.0.0)`);
  console.log(`   - NOTE: Main server should use port 5000`);
});
