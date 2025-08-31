import request from "supertest";
import express from "express";
import { registerRoutes } from "../../server/routes";

describe("Health Check Integration Tests", () => {
  let app: express.Application;

  beforeAll(async () => {
    // Set up test app
    app = express();
    app.use(express.json());

    // Register routes
    await registerRoutes(app);
  });

  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("services");
      expect(response.body).toHaveProperty("timestamp");

      expect(response.body.status).toBe("operational");
      expect(response.body.services).toHaveProperty("database");
      expect(response.body.services).toHaveProperty("email");
    });

    it("should have valid timestamp format", async () => {
      const response = await request(app).get("/api/health").expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe("POST /api/test-email", () => {
    it("should reject request without email", async () => {
      const response = await request(app).post("/api/test-email").send({}).expect(400);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("required");
    });

    it("should accept valid email request", async () => {
      const response = await request(app).post("/api/test-email").send({
        to: "test@example.com",
        subject: "Test Subject",
      });

      // Should either succeed (200) or fail with specific error (500)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("message");
      } else {
        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("message");
      }
    });
  });
});
