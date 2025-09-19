import jwt, { Algorithm } from "jsonwebtoken";
import { storage } from "../storage";
import { users, sessions, userRoles, type User, type Session } from "../../shared/schema";
import { createPublicKey } from "crypto";

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  permissions: string[];
}

export class AuthService {
  private jwtSecret: string;
  private jwtExpiryMinutes: number;
  private rsaPrivateKey?: string;
  private rsaPublicKey?: string;
  private jwtAlg: Algorithm;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
    this.jwtExpiryMinutes = 60; // 1 hour
    // Optional RSA keys (recommended for production)
    this.rsaPrivateKey = process.env.RSA_PRIVATE_KEY || undefined;
    this.rsaPublicKey = process.env.RSA_PUBLIC_KEY || undefined;
    this.jwtAlg = this.rsaPrivateKey && this.rsaPublicKey ? "RS256" : "HS256";
  }

  private getSignKey(): string {
    return this.jwtAlg === "RS256" && this.rsaPrivateKey ? this.rsaPrivateKey : this.jwtSecret;
  }

  private getVerifyKey(): string {
    return this.jwtAlg === "RS256" && this.rsaPublicKey ? this.rsaPublicKey : this.jwtSecret;
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
    if (!tenantId) {
      console.log(`[Auth] Missing tenantId for email login attempt: ${email}`);
      return null;
    }

    const user = await storage.getTenantUserByEmail(tenantId, email);

    if (!user || (user.status && user.status !== "active")) {
      console.log(`[Auth] User not found or inactive: ${email}`);
      return null;
    }

    if (!user.passwordHash) {
      console.log(`[Auth] Password login attempted for SSO-only user: ${email}`);
      return null;
    }

    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      console.log(`[Auth] Invalid password for: ${email}`);
      return null;
    }

    console.log(`[Auth] Successful login for tenant user: ${email}`);

    // Generate JWT token
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.jwtExpiryMinutes);

    // Fetch permissions from RBAC
    let perms: string[] = [];
    try {
      perms = await storage.getUserPermissions(user.id, user.tenantId);
    } catch {}

    const payload: JWTPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      permissions: perms,
    };

    // Generate JWT token
    const token = jwt.sign(payload, this.getSignKey(), {
      algorithm: this.jwtAlg,
      expiresIn: `${this.jwtExpiryMinutes}m`,
    });

    // Note: Skipping session storage for tenant users as JWT tokens are stateless
    // TODO: Implement tenant-specific session table if needed

    // Update last login for user
    await storage.updateTenantUserLastLogin(user.id);

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
      expiresAt,
    };
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = jwt.verify(token, this.getVerifyKey(), {
        algorithms: [this.jwtAlg],
      }) as JWTPayload;

      // For JWT tokens, we don't need to check session storage
      // The token itself is the source of truth
      // If you want to implement token revocation, you'd need to maintain a blacklist

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

    // Important: strip timing claims from verified token to avoid jsonwebtoken error
    const { userId, tenantId, email, permissions } = payload as any;
    const freshPayload: JWTPayload = { userId, tenantId, email, permissions: permissions || [] };

    const newToken = jwt.sign(freshPayload, this.getSignKey(), {
      algorithm: this.jwtAlg,
      expiresIn: `${this.jwtExpiryMinutes}m`,
    });

    // For JWT tokens, we don't maintain sessions
    // The new token replaces the old one on the client side

    return newToken;
  }

  async generatePasswordResetToken(email: string, tenantId: string): Promise<string | null> {
    const user = await storage.getTenantUserByEmail(tenantId, email);
    if (!user) {
      return null;
    }

    const resetToken = jwt.sign(
      { userId: user.id, tenantId, email: user.email, type: "password_reset" },
      this.jwtSecret,
      { expiresIn: "1h" }
    );

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      if (payload.type !== "password_reset") {
        return false;
      }

      const hashedPassword = await this.hashPassword(newPassword);
      await storage.updateTenantUser(payload.userId, payload.tenantId, {
        passwordHash: hashedPassword,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async setupMFA(userId: string, tenantId: string): Promise<any> {
    // MFA setup implementation would go here
    // For now, returning a mock response
    return {
      secret: "mock-secret",
      qrCode: "mock-qr-code",
      backupCodes: ["backup1", "backup2", "backup3"],
    };
  }

  async verifyMFA(userId: string, token: string, tenantId: string): Promise<boolean> {
    // MFA verification implementation would go here
    // For now, returning true for any valid token
    return token && token.length === 6;
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

    const token = jwt.sign(payload, this.getSignKey(), {
      algorithm: this.jwtAlg,
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
