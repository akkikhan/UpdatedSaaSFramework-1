import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { randomBytes, createHash } from 'crypto';
import { db } from '../db';
import { storage } from '../storage';
import { 
  userMFA, 
  loginAttempts, 
  accountLockouts, 
  passwordResets,
  users,
  tenantUsers
} from '../../shared/schema';
import type { 
  User, 
  TenantUser,
  InsertUserMFA,
  InsertLoginAttempt,
  InsertAccountLockout,
  InsertPasswordReset,
  UserMFA as UserMFAType
} from '../../shared/schema';
import { emailService } from './email';
import { complianceService } from './compliance';
import { eq, and, desc, gte, count } from 'drizzle-orm';

export interface AuthConfig {
  // Rate limiting
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  rateLimitWindowMinutes: number;
  
  // Password policy
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  
  // MFA settings
  mfaIssuerName: string;
  totpWindow: number;
  
  // Session settings
  jwtExpiryMinutes: number;
  refreshTokenExpiryDays: number;
}

export class EnhancedAuthService {
  private jwtSecret: string;
  private config: AuthConfig;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    
    this.config = {
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
      lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15'),
      rateLimitWindowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15'),
      minPasswordLength: parseInt(process.env.MIN_PASSWORD_LENGTH || '12'),
      requireUppercase: process.env.REQUIRE_UPPERCASE !== 'false',
      requireLowercase: process.env.REQUIRE_LOWERCASE !== 'false',
      requireNumbers: process.env.REQUIRE_NUMBERS !== 'false',
      requireSpecialChars: process.env.REQUIRE_SPECIAL_CHARS !== 'false',
      mfaIssuerName: process.env.MFA_ISSUER_NAME || 'SaaS Framework',
      totpWindow: parseInt(process.env.TOTP_WINDOW || '2'),
      jwtExpiryMinutes: parseInt(process.env.JWT_EXPIRY_MINUTES || '60'),
      refreshTokenExpiryDays: parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '30')
    };

    console.log('🔐 Enhanced Auth Service initialized with security policies');
  }

  /**
   * Enhanced login with rate limiting, account lockout, and MFA
   */
  async login(
    email: string, 
    password: string, 
    tenantId: string,
    mfaCode?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    token?: string;
    refreshToken?: string;
    user?: Omit<User | TenantUser, 'passwordHash'>;
    expiresAt?: Date;
    requiresMFA?: boolean;
    mfaTypes?: string[];
    error?: string;
    lockedUntil?: Date;
  }> {
    // Record login attempt
    const attemptData: InsertLoginAttempt = {
      email,
      tenantId,
      ipAddress: ipAddress || 'unknown',
      userAgent,
      success: false,
      failureReason: null,
      mfaVerified: false
    };

    try {
      // 1. Check if account is locked
      const lockout = await this.checkAccountLockout(email, tenantId);
      if (lockout) {
        attemptData.failureReason = 'account_locked';
        await db.insert(loginAttempts).values(attemptData);
        
        return {
          success: false,
          error: 'Account is temporarily locked due to too many failed attempts',
          lockedUntil: lockout.expiresAt || undefined
        };
      }

      // 2. Check rate limiting
      const isRateLimited = await this.checkRateLimit(email, ipAddress || 'unknown');
      if (isRateLimited) {
        attemptData.failureReason = 'rate_limited';
        await db.insert(loginAttempts).values(attemptData);
        
        return {
          success: false,
          error: 'Too many login attempts. Please try again later.'
        };
      }

      // 3. Validate user credentials
      const user = await storage.getUserByEmail(email, tenantId);
      if (!user || !user.isActive) {
        attemptData.failureReason = 'invalid_credentials';
        await db.insert(loginAttempts).values(attemptData);
        await this.handleFailedLogin(email, tenantId, ipAddress);
        
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // 4. Verify password
      const isValidPassword = await this.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        attemptData.failureReason = 'invalid_password';
        await db.insert(loginAttempts).values(attemptData);
        await this.handleFailedLogin(email, tenantId, ipAddress);
        
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // 5. Check MFA requirements
      const userMFASettings = await this.getUserMFASettings(user.id);
      const enabledMFA = userMFASettings.filter(mfa => mfa.isEnabled && mfa.isVerified);
      
      if (enabledMFA.length > 0) {
        if (!mfaCode) {
          // MFA required but not provided
          attemptData.failureReason = 'mfa_required';
          await db.insert(loginAttempts).values(attemptData);
          
          return {
            success: false,
            requiresMFA: true,
            mfaTypes: enabledMFA.map(mfa => mfa.mfaType),
            error: 'Multi-factor authentication required'
          };
        }

        // 6. Verify MFA
        const mfaValid = await this.verifyMFA(user.id, mfaCode, enabledMFA);
        if (!mfaValid) {
          attemptData.failureReason = 'invalid_mfa';
          await db.insert(loginAttempts).values(attemptData);
          await this.handleFailedLogin(email, tenantId, ipAddress);
          
          return {
            success: false,
            error: 'Invalid MFA code'
          };
        }
        
        attemptData.mfaVerified = true;
      }

      // 7. Generate tokens
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.config.jwtExpiryMinutes);

      const payload = {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        permissions: [], // TODO: Get from RBAC
        mfaVerified: enabledMFA.length > 0
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: `${this.config.jwtExpiryMinutes}m`
      });

      const refreshToken = this.generateRefreshToken();

      // 8. Store session
      await storage.createSession({
        tenantId: user.tenantId,
        userId: user.id,
        token,
        expiresAt
      });

      // 9. Update last login and record successful attempt
      await storage.updateUserLastLogin(user.id);
      attemptData.success = true;
      await db.insert(loginAttempts).values(attemptData);

      // 10. Log compliance event
      await complianceService.logAuthEvent({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'login_success',
        outcome: 'success',
        sessionId: token,
        ipAddress,
        userAgent,
        riskLevel: 'low'
      });

      // 11. Clear any existing lockouts
      await this.clearAccountLockout(email, tenantId);

      const { passwordHash, ...userWithoutPassword } = user;

      return {
        success: true,
        token,
        refreshToken,
        user: userWithoutPassword,
        expiresAt
      };

    } catch (error) {
      attemptData.failureReason = 'system_error';
      await db.insert(loginAttempts).values(attemptData);
      
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed due to system error'
      };
    }
  }

  /**
   * Setup TOTP MFA for a user
   */
  async setupTOTP(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const secret = speakeasy.generateSecret({
      name: `${this.config.mfaIssuerName} (User)`,
      issuer: this.config.mfaIssuerName,
      length: 32
    });

    const backupCodes = this.generateBackupCodes();

    // Store MFA configuration (not verified yet)
    await db.insert(userMFA).values({
      userId,
      mfaType: 'totp',
      secret: secret.base32,
      isEnabled: false, // Will be enabled after verification
      isVerified: false,
      backupCodes
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Verify and enable TOTP MFA
   */
  async verifyAndEnableTOTP(userId: string, token: string): Promise<boolean> {
    const mfaRecord = await db.select()
      .from(userMFA)
      .where(and(
        eq(userMFA.userId, userId),
        eq(userMFA.mfaType, 'totp'),
        eq(userMFA.isVerified, false)
      ))
      .limit(1);

    if (mfaRecord.length === 0) {
      return false;
    }

    const mfa = mfaRecord[0];
    const verified = speakeasy.totp.verify({
      secret: mfa.secret!,
      encoding: 'base32',
      token,
      window: this.config.totpWindow
    });

    if (verified) {
      await db.update(userMFA)
        .set({ 
          isEnabled: true, 
          isVerified: true, 
          lastUsed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userMFA.id, mfa.id));

      return true;
    }

    return false;
  }

  /**
   * Setup SMS MFA for a user
   */
  async setupSMS(userId: string, phoneNumber: string): Promise<{ success: boolean; verificationCode?: string }> {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store MFA configuration (not verified yet)
    await db.insert(userMFA).values({
      userId,
      mfaType: 'sms',
      secret: phoneNumber, // Store phone number as secret
      isEnabled: false,
      isVerified: false
    });

    // TODO: Send SMS via Twilio/Vonage
    console.log(`📱 SMS MFA code for ${phoneNumber}: ${verificationCode}`);
    
    return {
      success: true,
      verificationCode // Return for demo purposes - remove in production
    };
  }

  /**
   * Verify MFA code
   */
  private async verifyMFA(userId: string, code: string, mfaSettings: UserMFAType[]): Promise<boolean> {
    for (const mfa of mfaSettings) {
      if (mfa.mfaType === 'totp') {
        const verified = speakeasy.totp.verify({
          secret: mfa.secret!,
          encoding: 'base32',
          token: code,
          window: this.config.totpWindow
        });

        if (verified) {
          await db.update(userMFA)
            .set({ lastUsed: new Date() })
            .where(eq(userMFA.id, mfa.id));
          return true;
        }
      } else if (mfa.mfaType === 'sms' || mfa.mfaType === 'email') {
        // TODO: Implement SMS/Email MFA verification
        // For now, accept any 6-digit code for demo
        if (/^\d{6}$/.test(code)) {
          await db.update(userMFA)
            .set({ lastUsed: new Date() })
            .where(eq(userMFA.id, mfa.id));
          return true;
        }
      }

      // Check backup codes
      if (mfa.backupCodes && mfa.backupCodes.includes(code)) {
        // Remove used backup code
        const updatedCodes = mfa.backupCodes.filter(c => c !== code);
        await db.update(userMFA)
          .set({ 
            backupCodes: updatedCodes,
            lastUsed: new Date()
          })
          .where(eq(userMFA.id, mfa.id));
        return true;
      }
    }

    return false;
  }

  /**
   * Get user MFA settings
   */
  async getUserMFASettings(userId: string): Promise<UserMFAType[]> {
    return await db.select()
      .from(userMFA)
      .where(eq(userMFA.userId, userId));
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string, mfaType: string): Promise<boolean> {
    const result = await db.update(userMFA)
      .set({ 
        isEnabled: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(userMFA.userId, userId),
        eq(userMFA.mfaType, mfaType)
      ));

    return result.rowCount > 0;
  }

  /**
   * Check if account is locked
   */
  private async checkAccountLockout(email: string, tenantId: string) {
    const lockout = await db.select()
      .from(accountLockouts)
      .where(and(
        eq(accountLockouts.email, email),
        eq(accountLockouts.unlockedAt, null)
      ))
      .orderBy(desc(accountLockouts.lockedAt))
      .limit(1);

    if (lockout.length === 0) {
      return null;
    }

    const lock = lockout[0];
    if (lock.expiresAt && lock.expiresAt < new Date()) {
      // Auto-unlock expired lockout
      await this.clearAccountLockout(email, tenantId);
      return null;
    }

    return lock;
  }

  /**
   * Check rate limiting by IP and email
   */
  private async checkRateLimit(email: string, ipAddress: string): Promise<boolean> {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - this.config.rateLimitWindowMinutes);

    // Check attempts by IP
    const ipAttempts = await db.select({ count: count() })
      .from(loginAttempts)
      .where(and(
        eq(loginAttempts.ipAddress, ipAddress),
        gte(loginAttempts.timestamp, windowStart),
        eq(loginAttempts.success, false)
      ));

    // Check attempts by email
    const emailAttempts = await db.select({ count: count() })
      .from(loginAttempts)
      .where(and(
        eq(loginAttempts.email, email),
        gte(loginAttempts.timestamp, windowStart),
        eq(loginAttempts.success, false)
      ));

    const ipCount = ipAttempts[0]?.count || 0;
    const emailCount = emailAttempts[0]?.count || 0;

    return ipCount >= this.config.maxLoginAttempts || emailCount >= this.config.maxLoginAttempts;
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(email: string, tenantId: string, ipAddress?: string) {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - this.config.rateLimitWindowMinutes);

    const failedAttempts = await db.select({ count: count() })
      .from(loginAttempts)
      .where(and(
        eq(loginAttempts.email, email),
        gte(loginAttempts.timestamp, windowStart),
        eq(loginAttempts.success, false)
      ));

    const failureCount = failedAttempts[0]?.count || 0;

    if (failureCount >= this.config.maxLoginAttempts) {
      await this.lockAccount(email, tenantId, 'too_many_failures');
      
      // Log security event
      await complianceService.logAuthEvent({
        tenantId,
        action: 'account_locked',
        outcome: 'success',
        ipAddress,
        riskLevel: 'high'
      });
    }
  }

  /**
   * Lock user account
   */
  private async lockAccount(email: string, tenantId: string, reason: string) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.config.lockoutDurationMinutes);

    await db.insert(accountLockouts).values({
      email,
      reason,
      expiresAt
    });
  }

  /**
   * Clear account lockout
   */
  private async clearAccountLockout(email: string, tenantId: string) {
    await db.update(accountLockouts)
      .set({ 
        unlockedAt: new Date()
      })
      .where(and(
        eq(accountLockouts.email, email),
        eq(accountLockouts.unlockedAt, null)
      ));
  }

  /**
   * Validate password against policy
   */
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.config.minPasswordLength) {
      errors.push(`Password must be at least ${this.config.minPasswordLength} characters long`);
    }

    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate secure backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      codes.push(randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Verify password hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 12); // Higher cost for better security
  }

  /**
   * Get login attempt history
   */
  async getLoginHistory(options: {
    email?: string;
    tenantId?: string;
    ipAddress?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = db.select().from(loginAttempts).orderBy(desc(loginAttempts.timestamp));

    if (options.email) {
      query = query.where(eq(loginAttempts.email, options.email));
    }

    return await query.limit(options.limit || 50).offset(options.offset || 0);
  }

  /**
   * Get account lockouts
   */
  async getAccountLockouts(options: {
    email?: string;
    tenantId?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let query = db.select().from(accountLockouts).orderBy(desc(accountLockouts.lockedAt));

    if (options.activeOnly) {
      query = query.where(eq(accountLockouts.unlockedAt, null));
    }

    return await query.limit(options.limit || 50).offset(options.offset || 0);
  }

  /**
   * Manually unlock account (admin action)
   */
  async unlockAccount(email: string, adminUserId: string): Promise<boolean> {
    const result = await db.update(accountLockouts)
      .set({ 
        unlockedAt: new Date(),
        unlockedBy: adminUserId
      })
      .where(and(
        eq(accountLockouts.email, email),
        eq(accountLockouts.unlockedAt, null)
      ));

    return result.rowCount > 0;
  }
}

export const enhancedAuthService = new EnhancedAuthService();
