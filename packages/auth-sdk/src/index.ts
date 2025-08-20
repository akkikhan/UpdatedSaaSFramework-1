import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { AuthConfig, User, LoginCredentials, AuthResult, ApiResponse, VerifyResponse, RefreshResponse } from './types';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const tokenSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  email: z.string(),
  roles: z.array(z.string()).optional(),
  iat: z.number(),
  exp: z.number()
});

export class SaaSFactoryAuth {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const validated = loginSchema.parse(credentials);
    
    const response = await fetch(`${this.config.baseUrl}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Tenant-ID': this.config.tenantId
      },
      body: JSON.stringify({
        ...validated,
        tenantId: this.config.tenantId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }

    const result = await response.json();
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        tenantId: result.user.tenantId,
        roles: result.user.roles,
        lastLogin: result.user.lastLogin ? new Date(result.user.lastLogin) : undefined
      },
      token: result.token,
      refreshToken: result.refreshToken,
      expiresAt: new Date(result.expiresAt)
    };
  }

  /**
   * Verify JWT token and return user info
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': this.config.tenantId
        }
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      if (!result.valid) {
        return null;
      }

      return {
        id: result.user.id,
        email: result.user.email,
        tenantId: result.user.tenantId,
        roles: result.user.roles,
        lastLogin: result.user.lastLogin ? new Date(result.user.lastLogin) : undefined
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': this.config.tenantId
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Logout user and invalidate token
   */
  async logout(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': this.config.tenantId
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  /**
   * Hash password for storage
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Decode JWT token without verification (for client-side use)
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
}

// React hooks (if using React)
export function useAuth(config: AuthConfig) {
  const auth = new SaaSFactoryAuth(config);
  
  return {
    login: auth.login.bind(auth),
    logout: auth.logout.bind(auth),
    verifyToken: auth.verifyToken.bind(auth),
    refreshToken: auth.refreshToken.bind(auth)
  };
}

// Export default class
export default SaaSFactoryAuth;