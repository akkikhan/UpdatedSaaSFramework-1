import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

import { registerRoutes } from "../../server/routes";
import { storage } from "../../server/storage";
import { db } from "../../server/db";
import { tenants, tenantRoles, userRoles } from "../../shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

describe("RBAC API v2", () => {
  let app: express.Application;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    if (!db) {
      throw new Error("Database not initialised for tests");
    }

    // Clean RBAC tables to ensure deterministic tests
    try {
      await db.delete(userRoles);
      await db.delete(tenantRoles);
      await db.delete(tenants);
    } catch (error) {
      console.error('RBAC test cleanup failed', error);
      throw error;
    }

    const tenant = await storage.createTenant({
      orgId: `tenant-${Date.now()}`,
      name: "Test Tenant",
      adminEmail: "admin@test-tenant.com",
      status: "active",
      enabledModules: ["auth", "rbac"],
      moduleConfigs: {
        auth: {
          providers: ["local"],
        },
        rbac: {
          permissionTemplate: "standard",
          businessType: "general",
        },
      },
    } as any);

    tenantId = tenant.id;

    authToken = jwt.sign(
      {
        userId: "integration-user",
        tenantId,
        email: "admin@test-tenant.com",
        permissions: ["rbac:manage"],
      },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "30m" }
    );

    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  it("creates, reads, updates, and deletes roles", async () => {
    try {
      const createResponse = await request(app)
      .post("/api/v2/rbac/roles")
      .set("Authorization", `Bearer ${authToken}`)
      .set("x-tenant-id", tenantId)
      .send({
        name: "Support Agent",
        description: "Handles support tickets",
        permissionDetails: [
          {
            resource: "tickets",
            action: "read",
            scope: "tenant",
          },
        ],
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      name: "Support Agent",
      permissions: [
        expect.objectContaining({ resource: "tickets", action: "read" }),
      ],
    });

    const roleId = createResponse.body.id;

      const listResponse = await request(app)
      .get("/api/v2/rbac/roles")
      .set("Authorization", `Bearer ${authToken}`)
      .set("x-tenant-id", tenantId)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: roleId, name: "Support Agent" }),
      ])
    );

      const updateResponse = await request(app)
      .patch(`/api/v2/rbac/roles/${roleId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .set("x-tenant-id", tenantId)
      .send({ description: "Updated description" })
      .expect(200);

    expect(updateResponse.body.description).toBe("Updated description");

      await request(app)
      .delete(`/api/v2/rbac/roles/${roleId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .set("x-tenant-id", tenantId)
      .expect(200);

      const afterDelete = await request(app)
      .get("/api/v2/rbac/roles")
      .set("Authorization", `Bearer ${authToken}`)
      .set("x-tenant-id", tenantId)
      .expect(200);

      expect(afterDelete.body).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ id: roleId }),
      ])
      );
    } catch (error) {
      console.error('RBAC API integration test failed', error);
      if (error && Array.isArray((error as any).errors)) {
        console.error('Nested errors:', (error as any).errors);
      }
      throw error;
    }
  });
});
