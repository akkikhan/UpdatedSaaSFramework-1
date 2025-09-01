import express from "express";
import { createServer } from "http";

const app = express();
const server = createServer(app);

app.get("/test", (req, res) => {
  res.json({ message: "Server is working!", timestamp: new Date().toISOString() });
});

app.get("/admin/login", (req, res) => {
  res.send("<h1>Admin Login Test</h1><p>This is a simple test page</p>");
});

const port = 3000;

console.log("Starting diagnostic server...");

server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Diagnostic server running on http://0.0.0.0:${port}`);
  console.log(`Test URLs:`);
  console.log(`  - http://localhost:${port}/test`);
  console.log(`  - http://localhost:${port}/admin/login`);
});

server.on("error", error => {
  console.error("❌ Server error:", error);
});

process.on("uncaughtException", error => {
  console.error("❌ Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled rejection at:", promise, "reason:", reason);
});
