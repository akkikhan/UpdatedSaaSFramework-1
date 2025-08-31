import express from "express";
import cors from "cors";
import { config } from "dotenv";

config();

console.log("🚀 Testing basic Express server...");

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Simple test route
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Basic server working" });
});

const PORT = 3002; // Use different port for testing

const server = app.listen(PORT, () => {
  console.log(`✅ Basic Express server running on port ${PORT}`);
  console.log(`🔗 Test: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("📴 Shutting down server...");
  server.close(() => {
    console.log("✅ Server shut down gracefully");
    process.exit(0);
  });
});

export { app };
