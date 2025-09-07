import type { Tenant } from '@shared/schema';
import { storage } from '../../storage';
import crypto from 'crypto';
import * as saml from 'samlify';
import * as validator from '@authenio/samlify-node-xmllint';

saml.setSchemaValidator(validator);

export interface SAMLConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  callbackUrl: string;
}

export class SAMLService {
  private sp: saml.ServiceProvider;
  private idp: saml.IdentityProvider;

  constructor(private config: SAMLConfig) {
    this.sp = saml.ServiceProvider({
      entityID: config.issuer,
      assertionConsumerService: [
        {
          Binding: saml.Constants.binding.post,
          Location: config.callbackUrl,
        },
      ],
    });

    this.idp = saml.IdentityProvider({
      entityID: config.issuer,
      singleSignOnService: [
        {
          Binding: saml.Constants.binding.redirect,
          Location: config.entryPoint,
        },
      ],
      signingCert: config.cert,
    });
  }

  /**
   * Generate SAML AuthnRequest redirect URL
   */
  initiateLogin(relayState: string): string {
    const { context } = this.sp.createLoginRequest(this.idp, 'redirect', {
      relayState,
    });
    return context;
  }

  /**
   * Handle SAML callback, create or login user, and return JWT token
   */
  async handleCallback(
    samlResponse: string,
    relayState: string,
    tenant: Tenant,
  ): Promise<{ token: string; user: any; expiresAt: Date } | null> {
    try {
      const { extract } = await this.sp.parseLoginResponse(this.idp, 'post', {
        body: { SAMLResponse: samlResponse, RelayState: relayState },
      });

      const email = (extract?.attributes as any)?.email || extract?.nameID;
      if (!email) throw new Error('No email found in SAML response');

      let user = await storage.getUserByEmail(email, tenant.id);
      if (!user) {
        const bcrypt = await import('bcryptjs');
        const tempPassword = Math.random().toString(36).slice(-12);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        user = await storage.createUser({
          tenantId: tenant.id,
          email,
          passwordHash: hashedPassword,
          isActive: true,
        });
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      const payload = {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        permissions: [],
      };
      const jwt = await import('jsonwebtoken');
      const jwtSecret =
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
      const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
      await storage.createSession({ tenantId: user.tenantId, userId: user.id, token, expiresAt });
      await storage.updateUserLastLogin(user.id);
      const { passwordHash, ...userWithoutPassword } = user;
      return { token, user: userWithoutPassword, expiresAt };
    } catch (err) {
      console.error('SAML callback error:', err);
      return null;
    }
  }

  static generateState(tenantOrgId: string): string {
    const random = crypto.randomBytes(16).toString('hex');
    return Buffer.from(`${tenantOrgId}:${random}`).toString('base64');
  }

  static parseState(state: string): { tenantOrgId: string } | null {
    try {
      const decoded = Buffer.from(state, 'base64').toString('utf-8');
      const [tenantOrgId] = decoded.split(':');
      return { tenantOrgId };
    } catch {
      return null;
    }
  }
}

