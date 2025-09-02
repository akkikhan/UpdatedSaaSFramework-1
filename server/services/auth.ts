import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { users, sessions, userRoles, type User, type Session } from "../../shared/schema";

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  permissions: string[];
}

export class AuthService {
  private jwtSecret: string;
  private jwtExpiryMinutes: number;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
    this.jwtExpiryMinutes = 60; // 1 hour
  }

  async login(
    email: string,
    password: string,
    tenantId: string
  ): Promise<{
    token: string;
    user: any;
    expiresAt: Date;
  } | null> {
    // Get tenant user by email and tenant (not platform user)
    const user = await storage.getTenantUserByEmail(tenantId, email);

    if (!user || user.status !== "active") {
      console.log(`❌ Auth failed - user not found or inactive: ${email}`);
      return null;
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.passwordHash || "");
    if (!isValidPassword) {
      console.log(`❌ Auth failed - invalid password for: ${email}`);
      return null;
    }

    console.log(`✅ Auth successful for tenant user: ${email}`);

    // Generate JWT token
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.jwtExpiryMinutes);

    const payload: JWTPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      permissions: [], // TODO: Get user permissions from RBAC
    };

    // Generate JWT token
    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: `${this.jwtExpiryMinutes}m`,
    });

    // Note: Skipping session storage for tenant users as JWT tokens are stateless
    // TODO: Implement tenant-specific session table if needed

    // Update last login
    await storage.updateUserLastLogin(user.id);

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
      expiresAt,
    };
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;

      // Check if session exists and is valid
      const session = await storage.getSession(token);
      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  async logout(token: string): Promise<void> {
    await storage.deleteSession(token);
  }

  async refreshToken(oldToken: string): Promise<string | null> {
    const payload = await this.verifyToken(oldToken);
    if (!payload) {
      return null;
    }

    // Generate new token
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.jwtExpiryMinutes);

    const newToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: `${this.jwtExpiryMinutes}m`,
    });

    // Remove old session and create new one
    await storage.deleteSession(oldToken);
    await storage.createSession({
      tenantId: payload.tenantId,
      userId: payload.userId,
      token: newToken,
      expiresAt,
    });

    return newToken;
  }

  /**
   * Generate a tenant-scoped JWT token for API key authentication
   * Used by external NPM packages after API key validation
   */
  async generateTenantToken(
    tenantId: string,
    orgId: string
  ): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.jwtExpiryMinutes);

    const payload = {
      tenantId,
      orgId,
      type: "api_key_auth", // Distinguish from user auth
      permissions: [], // Tenant-level permissions
    };

    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: `${this.jwtExpiryMinutes}m`,
    });

    return {
      token,
      expiresAt,
    };
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(password, hash);
  }

  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import("bcryptjs");
    return bcrypt.hash(password, 12);
  }
}

export const authService = new AuthService();
