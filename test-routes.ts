import express from "express";
import { config } from "dotenv";
config();

console.log("🔍 Testing routes import and registration...");

const app = express();

// Basic middleware
app.use(express.json());

try {
  console.log("📋 Importing routes...");
  const { registerRoutes } = await import("./server/routes");
  console.log("✅ Routes imported successfully");

  console.log("🔗 Registering routes...");
  const server = await registerRoutes(app);
  console.log("✅ Routes registered successfully");

  console.log("📝 Available routes:");
  app._router.stack.forEach((middleware, index) => {
    if (middleware.route) {
      console.log(
        `   ${Object.keys(middleware.route.methods).join(", ").toUpperCase()} ${middleware.route.path}`
      );
    } else if (middleware.name === "router") {
      console.log(`   Router middleware ${index}`);
    }
  });

  // Close the server
  server.close(() => {
    console.log("✅ Routes test completed successfully");
    process.exit(0);
  });
} catch (error) {
  console.error("❌ Routes test failed:", error);
  console.error("Stack trace:", error.stack);
  process.exit(1);
}
