// Global Jest setup - runs once before all tests
import { config } from "dotenv";

// Load test environment variables
config({ path: ".env.test" });

// Set default test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://:testpassword123@localhost:6380";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://demo:demo@localhost/demo";

console.log("🔧 Global Jest setup complete");

export default async () => {
  // Global setup logic here if needed
};
