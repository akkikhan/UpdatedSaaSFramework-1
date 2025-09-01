import http from "http";
import url from "url";

const port = 5000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (parsedUrl.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        message: "Raw HTTP server working!",
        port: port,
      })
    );
  } else if (parsedUrl.pathname === "/api/test") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        message: "Basic HTTP server test successful!",
        timestamp: new Date().toISOString(),
        port: port,
      })
    );
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`🚀 Raw HTTP server listening on http://localhost:${port}`);
  console.log(`🔗 Test: http://localhost:${port}/api/test`);
  console.log(`💚 Health: http://localhost:${port}/api/health`);
});

server.on("error", err => {
  console.error("❌ Server error:", err);
});

process.on("SIGINT", () => {
  console.log("\n⏹️  Shutting down server...");
  server.close(() => {
    console.log("✅ Server shut down gracefully");
    process.exit(0);
  });
});
