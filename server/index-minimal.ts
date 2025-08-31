import express from "express";
import cors from "cors";
import { config } from "dotenv";

// Load environment variables
config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Simple route to test
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test`);
});
