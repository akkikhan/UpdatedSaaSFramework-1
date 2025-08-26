import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface SaaSAuthConfig {
  apiKey: string;
  baseUrl: string;
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
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    isActive: boolean;
  };
  expiresAt: Date;
}

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  permissions: string[];
}

export class SaaSAuth {
  private config: SaaSAuthConfig;

  constructor(config: SaaSAuthConfig) {
    this.config = config;
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<AuthSession> {
    const response = await fetch(`${this.config.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ email, password, apiKey: this.config.apiKey }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'Login failed');
    }

    return response.json() as Promise<AuthSession>;
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
   * SAML Authentication - Initiate SAML login
   */
  async initiateSAMLLogin(tenantId: string, relayState?: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/saml/${tenantId}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ relayState }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'SAML initiation failed');
    }

    const data = await response.json() as { redirectUrl: string };
    return data.redirectUrl;
  }

  /**
   * SAML Authentication - Process SAML response
   */
  async processSAMLResponse(samlResponse: string, relayState?: string): Promise<AuthSession> {
    const response = await fetch(`${this.config.baseUrl}/saml/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ samlResponse, relayState }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'SAML authentication failed');
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
          'X-API-Key': this.config.apiKey,
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
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': this.config.apiKey,
      },
    });
  }

  /**
   * Express middleware for authentication
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
   * Enhanced middleware with module access control
   */
  middlewareWithModules(requiredModules: string[] = [], options: { required?: boolean } = { required: true }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // First check authentication
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

        // Add user to request object
        const user = await this.getCurrentUser(token);
        req.user = user;

        // Check module access
        for (const module of requiredModules) {
          const hasAccess = await this.checkModuleAccess(module);
          if (!hasAccess) {
            return res.status(403).json({ 
              error: `Access denied: ${module} module is not enabled for your tenant`,
              code: 'MODULE_DISABLED',
              module,
              message: `The ${module} feature is currently disabled for your organization. Please contact your administrator to enable this module.`
            });
          }
        }

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
      };
    }
  }
}

// Export enhanced authentication with all providers
export { 
  EnhancedSaaSAuth, 
  type AzureADConfig, 
  type Auth0Config, 
  type SAMLConfig as EnhancedSAMLConfig,
  type MFAChallenge 
} from './enhanced-auth';

export default SaaSAuth;