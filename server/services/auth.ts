import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import type { User, Session } from '@shared/schema';

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
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.jwtExpiryMinutes = 60; // 1 hour
  }

  async login(email: string, password: string, tenantId: string): Promise<{
    token: string;
    user: Omit<User, 'passwordHash'>;
    expiresAt: Date;
  } | null> {
    // Get user by email and tenant
    const user = await storage.getUserByEmail(email, tenantId);
    
    if (!user || !user.isActive) {
      return null;
    }

    // Verify password (simplified for demo)
    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    // Generate JWT token
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.jwtExpiryMinutes);

    const payload: JWTPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      permissions: [] // TODO: Get user permissions from RBAC
    };

    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: `${this.jwtExpiryMinutes}m`
    });

    // Store session
    await storage.createSession({
      tenantId: user.tenantId,
      userId: user.id,
      token,
      expiresAt
    });

    // Update last login
    await storage.updateUserLastLogin(user.id);

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
      expiresAt
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
      expiresIn: `${this.jwtExpiryMinutes}m`
    });

    // Remove old session and create new one
    await storage.deleteSession(oldToken);
    await storage.createSession({
      tenantId: payload.tenantId,
      userId: payload.userId,
      token: newToken,
      expiresAt
    });

    return newToken;
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }
}

export const authService = new AuthService();
