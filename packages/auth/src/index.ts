import jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";

export interface SaaSAuthConfig {
  apiKey: string;
  baseUrl: string;
  jwtSecret?: string;
  azureAD?: AzureADConfig;
  auth0?: Auth0Config;
  mfa?: MFAConfig;
  session?: SessionConfig;
}

export interface AzureADConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  audience?: string;
}

export interface MFAConfig {
  enabled: boolean;
  issuer: string;
  serviceName: string;
  window?: number;
}

export interface SessionConfig {
  maxAge?: number; // in seconds
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  rolling?: boolean;
}

export interface SAMLConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  identifierFormat?: string;
  signatureAlgorithm?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean;
}

export interface User {
  id: string;
  email: string;
  tenantId: string;
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  role?: string;
  permissions: string[];
  mfaEnabled: boolean;
  lastLogin?: Date;
  loginAttempts?: number;
  lockedUntil?: Date;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  user: User;
  expiresAt: Date;
  sessionId: string;
}

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
}

export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface LoginAttempt {
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  failureReason?: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge?: number; // days
  preventReuse?: number; // last N passwords
}

export interface SecurityEvent {
  type:
    | "login"
    | "logout"
    | "password_change"
    | "mfa_setup"
    | "mfa_disabled"
    | "account_locked"
    | "suspicious_activity";
  userId: string;
  tenantId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Enterprise SaaS Authentication SDK
 *
 * Features:
 * - JWT-based authentication with refresh tokens
 * - Multi-factor authentication (TOTP)
 * - Azure AD integration
 * - Auth0 integration
 * - SAML SSO support
 * - Password policies and security
 * - Session management
 * - Audit logging
 * - Rate limiting and account lockout
 */
export class SaaSAuth {
  private config: SaaSAuthConfig;
  private activeSessions: Map<string, AuthSession> = new Map();

  constructor(config: SaaSAuthConfig) {
    this.config = {
      mfa: { enabled: false, issuer: "SaaS Framework", serviceName: "SaaS App" },
      session: { maxAge: 3600, secure: true, sameSite: "strict" },
      ...config,
    };
  }

  /**
   * Enhanced login with MFA support
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      const response = await fetch(`${this.config.baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string; code?: string };
        throw new Error(error.message || "Login failed");
      }

      const session = (await response.json()) as AuthSession;

      // Store session locally
      this.activeSessions.set(session.sessionId, session);

      // Log security event
      await this.logSecurityEvent({
        type: "login",
        userId: session.user.id,
        tenantId: session.user.tenantId,
        timestamp: new Date(),
      });

      return session;
    } catch (error) {
      // Log failed login attempt
      await this.logSecurityEvent({
        type: "login",
        userId: "",
        tenantId: "",
        metadata: {
          email: credentials.email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date(),
      });
      throw error;
    }
  }

  /**
   * Azure AD OAuth login
   */
  async loginWithAzureAD(authCode: string, state?: string): Promise<AuthSession> {
    if (!this.config.azureAD) {
      throw new Error("Azure AD configuration not provided");
    }

    const response = await fetch(`${this.config.baseUrl}/auth/azure/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({
        code: authCode,
        state,
        config: this.config.azureAD,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || "Azure AD login failed");
    }

    const session = (await response.json()) as AuthSession;
    this.activeSessions.set(session.sessionId, session);

    return session;
  }

  /**
   * Get Azure AD login URL
   */
  getAzureADLoginUrl(state?: string): string {
    if (!this.config.azureAD) {
      throw new Error("Azure AD configuration not provided");
    }

    const {
      tenantId,
      clientId,
      redirectUri,
      scopes = ["openid", "profile", "email"],
    } = this.config.azureAD;
    const scopeString = scopes.join(" ");
    const stateParam = state || uuidv4();

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scopeString,
      state: stateParam,
      response_mode: "query",
    });

    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Auth0 login
   */
  async loginWithAuth0(authCode: string, state?: string): Promise<AuthSession> {
    if (!this.config.auth0) {
      throw new Error("Auth0 configuration not provided");
    }

    const response = await fetch(`${this.config.baseUrl}/auth/auth0/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({
        code: authCode,
        state,
        config: this.config.auth0,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || "Auth0 login failed");
    }

    const session = (await response.json()) as AuthSession;
    this.activeSessions.set(session.sessionId, session);

    return session;
  }

  /**
   * Get Auth0 login URL
   */
  getAuth0LoginUrl(state?: string): string {
    if (!this.config.auth0) {
      throw new Error("Auth0 configuration not provided");
    }

    const { domain, clientId, redirectUri, audience } = this.config.auth0;
    const stateParam = state || uuidv4();

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "openid profile email",
      state: stateParam,
      ...(audience && { audience }),
    });

    return `https://${domain}/authorize?${params.toString()}`;
  }

  /**
   * Setup MFA for a user
   */
  async setupMFA(userId: string): Promise<MFASetup> {
    if (!this.config.mfa?.enabled) {
      throw new Error("MFA is not enabled");
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      issuer: this.config.mfa.issuer,
      name: `${this.config.mfa.serviceName}:${userId}`,
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );

    // Save to backend
    await fetch(`${this.config.baseUrl}/auth/mfa/setup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({
        userId,
        secret: secret.base32,
        backupCodes,
      }),
    });

    return {
      secret: secret.base32!,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Verify MFA code
   */
  async verifyMFA(userId: string, token: string): Promise<boolean> {
    const response = await fetch(`${this.config.baseUrl}/auth/mfa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({ userId, token }),
    });

    return response.ok;
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string, confirmationCode: string): Promise<void> {
    await fetch(`${this.config.baseUrl}/auth/mfa/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({ userId, confirmationCode }),
    });

    await this.logSecurityEvent({
      type: "mfa_disabled",
      userId,
      tenantId: "",
      timestamp: new Date(),
    });
  }

  /**
   * Change user password with policy validation
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    policy?: PasswordPolicy
  ): Promise<void> {
    // Validate password policy
    if (policy) {
      this.validatePasswordPolicy(newPassword, policy);
    }

    const response = await fetch(`${this.config.baseUrl}/auth/password/change`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({
        userId,
        currentPassword,
        newPassword,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || "Password change failed");
    }

    await this.logSecurityEvent({
      type: "password_change",
      userId,
      tenantId: "",
      timestamp: new Date(),
    });
  }

  /**
   * Validate password against policy
   */
  private validatePasswordPolicy(password: string, policy: PasswordPolicy): void {
    if (password.length < policy.minLength) {
      throw new Error(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      throw new Error("Password must contain at least one uppercase letter");
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      throw new Error("Password must contain at least one lowercase letter");
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      throw new Error("Password must contain at least one number");
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error("Password must contain at least one special character");
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await fetch(`${this.config.baseUrl}/auth/security/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }

  /**
   * Verify JWT token validity
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/auth/verify`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-API-Key": this.config.apiKey,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get current user from token
   */
  async getCurrentUser(token: string): Promise<User> {
    const response = await fetch(`${this.config.baseUrl}/auth/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-API-Key": this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error("Invalid or expired token");
    }

    const result = (await response.json()) as { user: User };
    return result.user;
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const response = await fetch(`${this.config.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || "Token refresh failed");
    }

    return response.json() as Promise<{ token: string; refreshToken: string }>;
  }

  /**
   * SAML Authentication - Initiate SAML login
   */
  async initiateSAMLLogin(tenantId: string, relayState?: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/saml/${tenantId}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({ relayState }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || "SAML initiation failed");
    }

    const data = (await response.json()) as { redirectUrl: string };
    return data.redirectUrl;
  }

  /**
   * SAML Authentication - Process SAML response
   */
  async processSAMLResponse(samlResponse: string, relayState?: string): Promise<AuthSession> {
    const response = await fetch(`${this.config.baseUrl}/saml/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({ samlResponse, relayState }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || "SAML authentication failed");
    }

    return response.json() as Promise<AuthSession>;
  }

  /**
   * Check if a module is enabled for the tenant
   */
  async checkModuleAccess(module: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/module-access/${module}`, {
        headers: {
          "X-API-Key": this.config.apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout(token: string): Promise<void> {
    await fetch(`${this.config.baseUrl}/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-API-Key": this.config.apiKey,
      },
    });
  }

  /**
   * Express middleware for authentication
   */
  middleware(options: { required?: boolean } = { required: true }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        if (options.required) {
          return res.status(401).json({ message: "Authorization token required" });
        }
        return next();
      }

      const token = authHeader.substring(7);

      try {
        const isValid = await this.verifyToken(token);

        if (!isValid) {
          if (options.required) {
            return res.status(401).json({ message: "Invalid or expired token" });
          }
          return next();
        }

        // Add user to request object
        const user = await this.getCurrentUser(token);
        req.user = user;
        next();
      } catch (error) {
        if (options.required) {
          return res.status(401).json({ message: "Authentication failed" });
        }
        next();
      }
    };
  }

  /**
   * Enhanced middleware with module access control
   */
  middlewareWithModules(
    requiredModules: string[] = [],
    options: { required?: boolean } = { required: true }
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // First check authentication
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          if (options.required) {
            return res.status(401).json({
              error: "Authentication required",
              code: "AUTH_REQUIRED",
            });
          }
          return next();
        }

        const token = authHeader.substring(7);
        const isValid = await this.verifyToken(token);

        if (!isValid) {
          if (options.required) {
            return res.status(401).json({
              error: "Invalid or expired token",
              code: "INVALID_TOKEN",
            });
          }
          return next();
        }

        // Add user to request object
        const user = await this.getCurrentUser(token);
        req.user = user;

        // Check module access
        for (const module of requiredModules) {
          const hasAccess = await this.checkModuleAccess(module);
          if (!hasAccess) {
            return res.status(403).json({
              error: `Access denied: ${module} module is not enabled for your tenant`,
              code: "MODULE_DISABLED",
              module,
              message: `The ${module} feature is currently disabled for your organization. Please contact your administrator to enable this module.`,
            });
          }
        }

        next();
      } catch (error) {
        res.status(500).json({
          error: "Authentication middleware error",
          code: "MIDDLEWARE_ERROR",
        });
      }
    };
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tenantId: string;
        permissions: string[];
      };
    }
  }
}

export default SaaSAuth;
