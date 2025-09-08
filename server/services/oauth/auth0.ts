import { storage } from "../../storage";
import type { Tenant } from "@shared/schema";

export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class Auth0Service {
  constructor(private config: Auth0Config) {}

  /**
   * Generate Auth0 authorization URL
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: "openid profile email",
      state: state,
    });

    return `https://${this.config.domain}/authorize?${params.toString()}`;
  }

  /**
   * Handle Auth0 callback and create/login user
   */
  async handleCallback(
    code: string,
    state: string,
    tenant: Tenant
  ): Promise<{
    token: string;
    user: any;
    expiresAt: Date;
  } | null> {
    try {
      // Exchange code for token
      const tokenResponse = await fetch(`https://${this.config.domain}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: code,
          redirect_uri: this.config.redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        throw new Error("Failed to get access token from Auth0");
      }

      // Get user info
      const userInfoResponse = await fetch(`https://${this.config.domain}/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const userInfo = await userInfoResponse.json();

      if (!userInfo || !userInfo.email) {
        throw new Error("No email found in Auth0 response");
      }

      const email = userInfo.email;

      // Check if user exists
      let user = await storage.getUserByEmail(email, tenant.id);

      if (!user) {
        // Create new user
        const bcrypt = await import("bcryptjs");
        const tempPassword = Math.random().toString(36).slice(-12);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        user = await storage.createUser({
          tenantId: tenant.id,
          email: email,
          passwordHash: hashedPassword,
          isActive: true,
        });
      }

      // Generate JWT token
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const payload = {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        permissions: [], // TODO: Get from RBAC
      };

      const jwt = await import("jsonwebtoken");
      const jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

      const token = jwt.default.sign(payload, jwtSecret, { expiresIn: "1h" });

      // Store session
      await storage.createSession({
        tenantId: user.tenantId,
        userId: user.id,
        token,
        expiresAt,
      });

      // Update last login
      await storage.updateUserLastLogin(user.id);

      const { passwordHash, ...userWithoutPassword } = user;

      return {
        token,
        user: userWithoutPassword,
        expiresAt,
      };
    } catch (error) {
      console.error("Auth0 callback error:", error);
      return null;
    }
  }

  /**
   * Generate secure state parameter
   */
  generateState(tenantOrgId: string): string {
    const crypto = require("crypto");
    const randomBytes = crypto.randomBytes(16).toString("hex");
    return Buffer.from(`${tenantOrgId}:${randomBytes}`).toString("base64");
  }

  /**
   * Verify and parse state parameter
   */
  parseState(state: string): { tenantOrgId: string } | null {
    try {
      const decoded = Buffer.from(state, "base64").toString("utf-8");
      const [tenantOrgId] = decoded.split(":");
      return { tenantOrgId };
    } catch {
      return null;
    }
  }
}
