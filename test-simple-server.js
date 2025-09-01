import express from "express";
const app = express();
const port = 8080;

app.get("/test", (req, res) => {
  res.json({ message: "Simple server working!", port: port });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`✅ Simple test server listening on port ${port}`);
  console.log(`Try: http://localhost:${port}/test`);
});
