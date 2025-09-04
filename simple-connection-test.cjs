const http = require("http");

console.log("Testing server connection...");

function testConnection() {
  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/",
    method: "GET",
  };

  const req = http.request(options, res => {
    console.log(`Status: ${res.statusCode}`);
    console.log("Server is responding");

    let data = "";
    res.on("data", chunk => {
      data += chunk;
    });

    res.on("end", () => {
      console.log("Response received");
    });
  });

  req.on("error", error => {
    console.error("Connection error:", error.message);
  });

  req.setTimeout(5000, () => {
    console.error("Request timeout");
    req.destroy();
  });

  req.end();
}

testConnection();
