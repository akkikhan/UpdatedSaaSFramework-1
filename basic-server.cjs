const http = require("http");

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - Request: ${req.method} ${req.url}`);

  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });

  res.end(
    JSON.stringify({
      status: "ok",
      message: "Simple HTTP server working",
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method,
    })
  );
});

const port = 3002;

server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Simple server running on http://localhost:${port}`);
  console.log(`Test with: curl http://localhost:${port}/test`);
});

server.on("error", err => {
  console.error("Server error:", err);
});
