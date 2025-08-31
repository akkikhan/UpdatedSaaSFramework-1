import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { registerRoutes } from "./server/routes";

console.log("🔍 Testing minimal server startup...");

(async () => {
  try {
    const app = express();

    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    console.log("📋 Registering routes...");
    const server = await registerRoutes(app);
    console.log("✅ Routes registered successfully");

    // Start server
    const port = parseInt(process.env.PORT || "3001", 10);
    console.log(`🚀 Starting server on port ${port}...`);

    server.listen(port, () => {
      console.log(`✅ Server successfully started on port ${port}`);
      console.log("🎯 Keeping server running for 5 seconds...");

      setTimeout(() => {
        console.log("⏹️ Shutting down server");
        server.close(() => {
          console.log("✅ Server shut down cleanly");
          process.exit(0);
        });
      }, 5000);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
})();
