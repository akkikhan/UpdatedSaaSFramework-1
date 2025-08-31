import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import { storage } from "../storage";
import type { PlatformAdmin, InsertPlatformAdmin } from "../../shared/schema";

export interface PlatformAdminLoginResult {
  token: string;
  refreshToken: string;
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class PlatformAdminAuthService {
  async login(email: string, password: string): Promise<PlatformAdminLoginResult | null> {
    try {
      // Find platform admin by email
      const admin = await storage.getPlatformAdminByEmail(email);

      if (!admin || !admin.isActive) {
        return null;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, admin.passwordHash);

      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await storage.updatePlatformAdminLastLogin(admin.id);

      // Generate JWT tokens
      const tokenPayload = {
        adminId: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        type: "platform_admin", // Critical: distinguishes from tenant user tokens
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: "8h" });

      const refreshToken = jwt.sign(
        { adminId: admin.id, type: "platform_admin_refresh" },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      return {
        token,
        refreshToken,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      };
    } catch (error) {
      console.error("Platform admin login error:", error);
      return null;
    }
  }

  async createPlatformAdmin(adminData: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }): Promise<PlatformAdmin> {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(adminData.password, 10);

      // Create platform admin
      const insertData: InsertPlatformAdmin = {
        email: adminData.email,
        passwordHash,
        name: adminData.name,
        role: adminData.role || "admin",
        isActive: true,
      };

      const admin = await storage.createPlatformAdmin(insertData);
      return admin;
    } catch (error) {
      console.error("Error creating platform admin:", error);
      throw error;
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Ensure this is a platform admin token
      if (payload.type !== "platform_admin") {
        return null;
      }

      // Verify admin still exists and is active
      const admin = await storage.getPlatformAdmin(payload.adminId);

      if (!admin || !admin.isActive) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<string | null> {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;

      if (payload.type !== "platform_admin_refresh") {
        return null;
      }

      // Verify admin still exists and is active
      const admin = await storage.getPlatformAdmin(payload.adminId);

      if (!admin || !admin.isActive) {
        return null;
      }

      // Generate new access token
      const newTokenPayload = {
        adminId: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        type: "platform_admin",
      };

      const newToken = jwt.sign(newTokenPayload, process.env.JWT_SECRET!, { expiresIn: "8h" });

      return newToken;
    } catch (error) {
      console.error("Platform admin token refresh error:", error);
      return null;
    }
  }

  async getAllAdmins(): Promise<PlatformAdmin[]> {
    return await storage.getAllPlatformAdmins();
  }

  async updateAdmin(
    id: string,
    updates: Partial<InsertPlatformAdmin>
  ): Promise<PlatformAdmin | undefined> {
    // Hash password if provided
    if (updates.passwordHash) {
      updates.passwordHash = await bcrypt.hash(updates.passwordHash, 10);
    }

    return await storage.updatePlatformAdmin(id, updates);
  }
}

export const platformAdminAuthService = new PlatformAdminAuthService();
