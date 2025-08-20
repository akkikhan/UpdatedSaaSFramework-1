import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import { storage } from '../../storage';
import { authService } from '../auth';
import type { Tenant } from '@shared/schema';

export interface AzureADConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class AzureADService {
  private msalApp: ConfidentialClientApplication;
  private cryptoProvider = new CryptoProvider();

  constructor(private config: AzureADConfig) {
    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
      },
    });
  }

  /**
   * Generate Azure AD authorization URL
   */
  async getAuthUrl(state: string): Promise<string> {
    const authCodeUrlParameters = {
      scopes: ['openid', 'profile', 'email'],
      redirectUri: this.config.redirectUri,
      state: state,
    };

    const response = await this.msalApp.getAuthCodeUrl(authCodeUrlParameters);
    return response;
  }

  /**
   * Handle Azure AD callback and create/login user
   */
  async handleCallback(code: string, state: string, tenant: Tenant): Promise<{
    token: string;
    user: any;
    expiresAt: Date;
  } | null> {
    try {
      const tokenRequest = {
        code: code,
        scopes: ['openid', 'profile', 'email'],
        redirectUri: this.config.redirectUri,
      };

      const response = await this.msalApp.acquireTokenByCode(tokenRequest);
      
      if (!response || !response.account) {
        throw new Error('Failed to get token from Azure AD');
      }

      const { account } = response;
      const email = account.username;

      if (!email) {
        throw new Error('No email found in Azure AD response');
      }

      // Check if user exists
      let user = await storage.getUserByEmail(email, tenant.id);

      if (!user) {
        // Create new user
        const bcrypt = await import('bcryptjs');
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

      const jwt = await import('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
      
      const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

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
      console.error('Azure AD callback error:', error);
      return null;
    }
  }

  /**
   * Generate secure state parameter
   */
  generateState(tenantOrgId: string): string {
    const randomBytes = this.cryptoProvider.createNewGuid();
    return Buffer.from(`${tenantOrgId}:${randomBytes}`).toString('base64');
  }

  /**
   * Verify and parse state parameter
   */
  parseState(state: string): { tenantOrgId: string } | null {
    try {
      const decoded = Buffer.from(state, 'base64').toString('utf-8');
      const [tenantOrgId] = decoded.split(':');
      return { tenantOrgId };
    } catch {
      return null;
    }
  }
}