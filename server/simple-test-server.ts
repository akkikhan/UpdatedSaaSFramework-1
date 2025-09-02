import express from "express";

const app = express();
app.use(express.json());

// Basic health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Test server running" });
});

// Simple API key test endpoint
app.post("/auth/login", (req, res) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }

  if (apiKey === "auth_abc123def456ghi789jkl012") {
    res.json({
      success: true,
      message: "API key authentication successful!",
      apiKey: apiKey,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(401).json({ error: "Invalid API key" });
  }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`✅ Simple test server started on port ${PORT}`);
  console.log(`Test endpoint: POST http://localhost:${PORT}/auth/login`);
  console.log("Use X-API-Key header with value: auth_abc123def456ghi789jkl012");
});

export default app;
