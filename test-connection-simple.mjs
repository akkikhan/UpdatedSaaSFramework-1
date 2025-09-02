import fetch from "node-fetch";

async function testConnection() {
  console.log("Testing server connectivity...");

  try {
    const response = await fetch("http://127.0.0.1:5000/api/health", {
      method: "GET",
      timeout: 5000,
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    const text = await response.text();
    console.log("Response body:", text);
  } catch (error) {
    console.error("Error details:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Stack:", error.stack);
  }
}

testConnection();
