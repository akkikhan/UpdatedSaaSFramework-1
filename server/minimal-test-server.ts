import express from "express";
import { storage } from "./storage.js";
import { authService } from "./services/auth.js";
import { validateApiKey } from "./middleware/apiKeyAuth.js";

const app = express();

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Key Authentication test route
app.post("/auth/login", validateApiKey, async (req, res) => {
  try {
    const tenantId = req.tenantId!; // Set by validateApiKey middleware
    const tenant = req.tenant; // Full tenant object from middleware

    // Generate JWT token for this tenant using both tenantId and orgId
    const token = await authService.generateTenantToken(tenantId, tenant.orgId);

    res.json({
      success: true,
      message: "API key authentication successful",
      tenantId,
      orgId: tenant.orgId,
      tenantName: tenant.name,
      token,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API key auth error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Basic tenant info (for testing)
app.get("/tenant/info", validateApiKey, async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const tenant = await storage.getTenantByAuthApiKey(req.headers["x-api-key"] as string);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: "Tenant not found",
      });
    }

    res.json({
      success: true,
      tenant: {
        id: tenant.id,
        orgId: tenant.orgId,
        name: tenant.name,
        status: tenant.status,
      },
      tenantId,
    });
  } catch (error) {
    console.error("Tenant info error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get tenant info",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Minimal test server started on port ${PORT}`);
  console.log(`🔑 API key authentication test endpoints:`);
  console.log(`   POST http://localhost:${PORT}/auth/login`);
  console.log(`   GET  http://localhost:${PORT}/tenant/info`);
  console.log(`   GET  http://localhost:${PORT}/health`);
});

export default app;
