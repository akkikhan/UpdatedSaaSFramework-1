// Server-specific Jest setup
import { config } from "dotenv";

// Load test environment
config({ path: ".env.test" });

// Mock external services for testing
jest.mock("../../server/services/email", () => ({
  emailService: {
    testConnection: jest.fn().mockResolvedValue(true),
    sendEmail: jest.fn().mockResolvedValue(true),
    sendTenantOnboardingEmail: jest.fn().mockResolvedValue(true),
    sendModuleStatusEmail: jest.fn().mockResolvedValue(true),
    sendSimpleTestEmail: jest.fn().mockResolvedValue(true),
  },
}));

// Mock Redis for tests that don't need real Redis
jest.mock("redis", () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue("OK"),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue("PONG"),
  })),
}));

// Mock JWT for predictable testing
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(payload => `mock-jwt-${JSON.stringify(payload)}`),
  verify: jest.fn(token => {
    if (token.startsWith("mock-jwt-")) {
      return JSON.parse(token.replace("mock-jwt-", ""));
    }
    throw new Error("Invalid token");
  }),
}));

console.log("🖥️ Server Jest setup complete");
