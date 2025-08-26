import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Main authentication configuration
export interface SaaSAuthConfig {
  apiKey: string;
  baseUrl: string;
  tenantId?: string;
}

// Azure AD configuration
export interface AzureADConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri?: string;
}

// Auth0 configuration
export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// SAML configuration
export interface SAMLConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  identifierFormat?: string;
  signatureAlgorithm?: string;
  callbackUrl: string;
}

// Authentication session interface
export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    isActive: boolean;
    provider?: 'basic' | 'azure-ad' | 'auth0' | 'saml';
  };
  expiresAt: Date;
  refreshToken?: string;
}

// MFA challenge interface
export interface MFAChallenge {
  challengeId: string;
  method: 'sms' | 'email' | 'totp';
  expiresAt: Date;
}

/**
 * Enhanced SaaS Authentication SDK
 * Supports: Basic JWT, Azure AD, Auth0, SAML, MFA
 */
export class EnhancedSaaSAuth {
  private config: SaaSAuthConfig;
  private azureConfig?: AzureADConfig;
  private auth0Config?: Auth0Config;
  private samlConfig?: SAMLConfig;

  constructor(config: SaaSAuthConfig) {
    this.config = config;
  }

  // ============ CONFIGURATION METHODS ============

  /**
   * Configure Azure AD authentication
   */
  configureAzureAD(azureConfig: AzureADConfig): this {
    this.azureConfig = azureConfig;
    return this;
  }

  /**
   * Configure Auth0 authentication
   */
  configureAuth0(auth0Config: Auth0Config): this {
    this.auth0Config = auth0Config;
    return this;
  }

  /**
   * Configure SAML authentication
   */
  configureSAML(samlConfig: SAMLConfig): this {
    this.samlConfig = samlConfig;
    return this;
  }

  // ============ BASIC AUTHENTICATION ============

  /**
   * Basic email/password login
   */
  async login(email: string, password: string): Promise<AuthSession> {
    const response = await fetch(`${this.config.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ 
        email, 
        password, 
        tenantId: this.config.tenantId 
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'Login failed');
    }

    const session = await response.json() as AuthSession;
    session.user.provider = 'basic';
    return session;
  }

  /**
   * Verify JWT token validity
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': this.config.apiKey,
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
  async getCurrentUser(token: string): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Invalid or expired token');
    }

    const result = await response.json() as { user: any };
    return result.user;
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const response = await fetch(`${this.config.baseUrl}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'Token refresh failed');
    }

    return response.json() as Promise<{ token: string }>;
  }

  /**
   * Logout user
   */
  async logout(token: string): Promise<void> {
    await fetch(`${this.config.baseUrl}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': this.config.apiKey,
      },
    });
  }

  // ============ AZURE AD AUTHENTICATION ============

  /**
   * Get Azure AD authorization URL
   */
  getAzureADAuthUrl(scopes: string[] = ['User.Read'], state?: string): string {
    if (!this.azureConfig) {
      throw new Error('Azure AD not configured. Call configureAzureAD() first.');
    }

    const params = new URLSearchParams({
      client_id: this.azureConfig.clientId,
      response_type: 'code',
      redirect_uri: this.azureConfig.redirectUri || `${this.config.baseUrl}/auth/azure/callback`,
      scope: scopes.join(' '),
      state: state || '',
      response_mode: 'query',
    });

    return `https://login.microsoftonline.com/${this.azureConfig.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Handle Azure AD callback
   */
  async handleAzureADCallback(code: string, state?: string): Promise<AuthSession> {
    if (!this.azureConfig) {
      throw new Error('Azure AD not configured');
    }

    const response = await fetch(`${this.config.baseUrl}/auth/azure/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ 
        code, 
        state,
        tenantId: this.config.tenantId 
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'Azure AD authentication failed');
    }

    const session = await response.json() as AuthSession;
    session.user.provider = 'azure-ad';
    return session;
  }

  // ============ AUTH0 AUTHENTICATION ============

  /**
   * Get Auth0 authorization URL
   */
  getAuth0AuthUrl(state?: string): string {
    if (!this.auth0Config) {
      throw new Error('Auth0 not configured. Call configureAuth0() first.');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.auth0Config.clientId,
      redirect_uri: this.auth0Config.redirectUri,
      scope: 'openid profile email',
      state: state || this.generateSecureState(),
    });

    return `https://${this.auth0Config.domain}/authorize?${params.toString()}`;
  }

  /**
   * Handle Auth0 callback
   */
  async handleAuth0Callback(code: string, state: string): Promise<AuthSession> {
    if (!this.auth0Config) {
      throw new Error('Auth0 not configured');
    }

    const response = await fetch(`${this.config.baseUrl}/auth/auth0/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ 
        code, 
        state,
        tenantId: this.config.tenantId 
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'Auth0 authentication failed');
    }

    const session = await response.json() as AuthSession;
    session.user.provider = 'auth0';
    return session;
  }

  // ============ SAML AUTHENTICATION ============

  /**
   * Initiate SAML login
   */
  async initiateSAMLLogin(relayState?: string): Promise<string> {
    if (!this.samlConfig) {
      throw new Error('SAML not configured. Call configureSAML() first.');
    }

    const response = await fetch(`${this.config.baseUrl}/auth/saml/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ 
        relayState,
        tenantId: this.config.tenantId 
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'SAML initiation failed');
    }

    const data = await response.json() as { redirectUrl: string };
    return data.redirectUrl;
  }

  /**
   * Process SAML response
   */
  async processSAMLResponse(samlResponse: string, relayState?: string): Promise<AuthSession> {
    const response = await fetch(`${this.config.baseUrl}/auth/saml/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ 
        samlResponse, 
        relayState,
        tenantId: this.config.tenantId 
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'SAML authentication failed');
    }

    const session = await response.json() as AuthSession;
    session.user.provider = 'saml';
    return session;
  }

  // ============ MULTI-FACTOR AUTHENTICATION ============

  /**
   * Initiate MFA challenge
   */
  async initiateMFA(userId: string, method: 'sms' | 'email' | 'totp' = 'email'): Promise<MFAChallenge> {
    const response = await fetch(`${this.config.baseUrl}/auth/mfa/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ 
        userId, 
        method,
        tenantId: this.config.tenantId 
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'MFA initiation failed');
    }

    return response.json() as Promise<MFAChallenge>;
  }

  /**
   * Verify MFA challenge
   */
  async verifyMFA(challengeId: string, code: string): Promise<boolean> {
    const response = await fetch(`${this.config.baseUrl}/auth/mfa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ 
        challengeId, 
        code,
        tenantId: this.config.tenantId 
      }),
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json() as { verified: boolean };
    return result.verified;
  }

  // ============ UTILITY METHODS ============

  /**
   * Check if a module is enabled for the tenant
   */
  async checkModuleAccess(module: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/module-access/${module}`, {
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate secure state parameter
   */
  private generateSecureState(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  // ============ EXPRESS MIDDLEWARE ============

  /**
   * Express middleware for basic authentication
   */
  middleware(options: { required?: boolean } = { required: true }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (options.required) {
          return res.status(401).json({ message: 'Authorization token required' });
        }
        return next();
      }

      const token = authHeader.substring(7);
      
      try {
        const isValid = await this.verifyToken(token);
        
        if (!isValid) {
          if (options.required) {
            return res.status(401).json({ message: 'Invalid or expired token' });
          }
          return next();
        }

        // Add user to request object
        const user = await this.getCurrentUser(token);
        req.user = user;
        next();
      } catch (error) {
        if (options.required) {
          return res.status(401).json({ message: 'Authentication failed' });
        }
        next();
      }
    };
  }

  /**
   * Enhanced middleware with multi-provider support
   */
  enhancedMiddleware(options: { 
    required?: boolean;
    allowedProviders?: ('basic' | 'azure-ad' | 'auth0' | 'saml')[];
    requireMFA?: boolean;
  } = { required: true }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          if (options.required) {
            return res.status(401).json({ 
              error: 'Authentication required',
              code: 'AUTH_REQUIRED'
            });
          }
          return next();
        }

        const token = authHeader.substring(7);
        const isValid = await this.verifyToken(token);
        
        if (!isValid) {
          if (options.required) {
            return res.status(401).json({ 
              error: 'Invalid or expired token',
              code: 'INVALID_TOKEN'
            });
          }
          return next();
        }

        // Get user info
        const user = await this.getCurrentUser(token);
        
        // Check allowed providers
        if (options.allowedProviders && options.allowedProviders.length > 0) {
          if (!options.allowedProviders.includes(user.provider || 'basic')) {
            return res.status(403).json({
              error: `Authentication provider '${user.provider}' not allowed`,
              code: 'PROVIDER_NOT_ALLOWED',
              allowedProviders: options.allowedProviders
            });
          }
        }

        // Check MFA requirement
        if (options.requireMFA && !user.mfaVerified) {
          return res.status(403).json({
            error: 'Multi-factor authentication required',
            code: 'MFA_REQUIRED'
          });
        }

        req.user = user;
        next();
      } catch (error) {
        res.status(500).json({ 
          error: 'Authentication middleware error',
          code: 'MIDDLEWARE_ERROR'
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
        provider?: 'basic' | 'azure-ad' | 'auth0' | 'saml';
        mfaVerified?: boolean;
      };
    }
  }
}

export default EnhancedSaaSAuth;
