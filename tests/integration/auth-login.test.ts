import express from "express";
import request from "supertest";

import { registerRoutes } from "../../server/routes";
import { storage } from "../../server/storage";
import { db } from "../../server/db";

describe("Tenant auth login", () => {
  let app: express.Application;
  let orgId: string;
  let adminEmail: string;

  beforeAll(async () => {
    if (!db) {
      throw new Error("Database not initialised for tests");
    }

    const tenant = await storage.createTenant({
      orgId: `login-${Date.now()}`,
      name: "Login Test Tenant",
      adminEmail: "owner@login.test",
      status: "active",
      enabledModules: ["auth"],
      moduleConfigs: {
        auth: {
          providers: ["local"],
        },
      },
    } as any);

    orgId = tenant.orgId;
    adminEmail = tenant.adminEmail;

    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  it("signs in a tenant admin via orgId", async () => {
    const response = await request(app)
      .post("/api/v2/auth/login")
      .send({
        orgId,
        email: adminEmail,
        password: "temp123!",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      token: expect.any(String),
      user: expect.objectContaining({
        email: adminEmail,
        tenantId: expect.any(String),
      }),
    });
  });
});
