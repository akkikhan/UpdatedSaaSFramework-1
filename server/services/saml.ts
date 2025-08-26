import * as saml2 from 'saml2-js';
import { randomBytes } from 'crypto';
import { db } from '../db';
import { storage } from '../storage';
import { 
  samlConfigs, 
  samlSessions, 
  tenantUsers 
} from '../../shared/schema';
import type { 
  SamlConfig,
  InsertSamlSession,
  InsertTenantUser,
  TenantUser
} from '../../shared/schema';
import { enhancedAuthService } from './auth-enhanced';
import { complianceService } from './compliance';
import { eq, and } from 'drizzle-orm';

export interface SAMLAttribute {
  [key: string]: string | string[];
}

export interface SAMLAssertion {
  nameId: string;
  attributes: SAMLAttribute;
  sessionIndex?: string;
}

export class SAMLService {
  private serviceProviders: Map<string, saml2.ServiceProvider> = new Map();
  private identityProviders: Map<string, saml2.IdentityProvider> = new Map();

  constructor() {
    console.log('🔒 SAML Service initialized');
  }

  /**
   * Create or update SAML configuration for a tenant
   */
  async createSAMLConfig(tenantId: string, config: {
    name: string;
    entityId: string;
    ssoUrl: string;
    x509Certificate: string;
    attributeMapping?: any;
    autoCreateUsers?: boolean;
    defaultRole?: string;
  }): Promise<SamlConfig> {
    const [samlConfig] = await db.insert(samlConfigs).values({
      tenantId,
      name: config.name,
      entityId: config.entityId,
      ssoUrl: config.ssoUrl,
      x509Certificate: config.x509Certificate,
      attributeMapping: config.attributeMapping || {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
        displayName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
      },
      autoCreateUsers: config.autoCreateUsers ?? true,
      defaultRole: config.defaultRole
    }).returning();

    // Initialize SAML providers for this config
    await this.initializeSAMLProviders(samlConfig);

    return samlConfig;
  }

  /**
   * Get SAML configuration for a tenant
   */
  async getSAMLConfig(tenantId: string): Promise<SamlConfig | null> {
    const configs = await db.select()
      .from(samlConfigs)
      .where(and(
        eq(samlConfigs.tenantId, tenantId),
        eq(samlConfigs.isEnabled, true)
      ))
      .limit(1);

    return configs.length > 0 ? configs[0] : null;
  }

  /**
   * Initialize SAML Service Provider and Identity Provider for a configuration
   */
  private async initializeSAMLProviders(config: SamlConfig) {
    const spEntityId = `${process.env.BASE_URL || 'http://localhost:5000'}/saml/metadata/${config.tenantId}`;
    const spAcsUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/saml/acs/${config.tenantId}`;
    const spSloUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/saml/sls/${config.tenantId}`;

    // Service Provider (our application)
    const sp = new saml2.ServiceProvider({
      entity_id: spEntityId,
      private_key: process.env.SAML_PRIVATE_KEY || this.generateDefaultPrivateKey(),
      certificate: process.env.SAML_CERTIFICATE || this.generateDefaultCertificate(),
      assert_endpoint: spAcsUrl,
      alt_private_keys: [],
      alt_certs: []
    });

    // Identity Provider (external SSO provider)
    const idp = new saml2.IdentityProvider({
      sso_login_url: config.ssoUrl,
      sso_logout_url: config.ssoUrl, // Many IdPs use same URL for SSO and SLO
      certificates: [config.x509Certificate],
      allow_unencrypted_assertion: true,
      sign_get_request: false,
      allow_unencrypted_assertion: true
    });

    this.serviceProviders.set(config.tenantId, sp);
    this.identityProviders.set(config.tenantId, idp);
  }

  /**
   * Generate SAML authentication request URL
   */
  async generateAuthRequest(tenantId: string, relayState?: string): Promise<string> {
    const config = await this.getSAMLConfig(tenantId);
    if (!config) {
      throw new Error('SAML not configured for this tenant');
    }

    const sp = this.serviceProviders.get(tenantId);
    const idp = this.identityProviders.get(tenantId);

    if (!sp || !idp) {
      await this.initializeSAMLProviders(config);
      return this.generateAuthRequest(tenantId, relayState);
    }

    return new Promise((resolve, reject) => {
      sp.create_login_request_url(idp, { relay_state: relayState }, (err, login_url) => {
        if (err) {
          reject(err);
        } else {
          resolve(login_url);
        }
      });
    });
  }

  /**
   * Process SAML response and authenticate user
   */
  async processResponse(
    tenantId: string, 
    samlResponse: string, 
    relayState?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    user?: TenantUser;
    token?: string;
    error?: string;
  }> {
    try {
      const config = await this.getSAMLConfig(tenantId);
      if (!config) {
        return { success: false, error: 'SAML not configured for this tenant' };
      }

      const sp = this.serviceProviders.get(tenantId);
      const idp = this.identityProviders.get(tenantId);

      if (!sp || !idp) {
        await this.initializeSAMLProviders(config);
        return this.processResponse(tenantId, samlResponse, relayState, ipAddress, userAgent);
      }

      // Validate SAML response
      const assertion = await this.validateSAMLResponse(sp, idp, samlResponse);
      if (!assertion) {
        return { success: false, error: 'Invalid SAML response' };
      }

      // Extract user information from SAML attributes
      const userInfo = this.extractUserInfo(assertion, config.attributeMapping);
      if (!userInfo.email) {
        return { success: false, error: 'Email not found in SAML response' };
      }

      // Find or create user
      let user = await this.findUserByEmail(tenantId, userInfo.email);
      
      if (!user && config.autoCreateUsers) {
        user = await this.createUserFromSAML(tenantId, userInfo, config);
      }

      if (!user) {
        return { success: false, error: 'User not found and auto-creation is disabled' };
      }

      if (user.status !== 'active') {
        return { success: false, error: 'User account is not active' };
      }

      // Create SAML session
      await this.createSAMLSession(config.id, tenantId, user.id, assertion, ipAddress, userAgent);

      // Generate JWT token
      const token = await this.generateTokenForUser(user);

      // Log compliance event
      await complianceService.logAuthEvent({
        tenantId,
        userId: user.id,
        action: 'saml_login_success',
        outcome: 'success',
        ipAddress,
        userAgent,
        riskLevel: 'low'
      });

      return {
        success: true,
        user,
        token
      };

    } catch (error) {
      console.error('SAML response processing error:', error);
      
      // Log compliance event for failed SAML login
      await complianceService.logAuthEvent({
        tenantId,
        action: 'saml_login_failed',
        outcome: 'failure',
        ipAddress,
        userAgent,
        riskLevel: 'medium'
      });

      return { 
        success: false, 
        error: 'Failed to process SAML response' 
      };
    }
  }

  /**
   * Generate SAML metadata for the service provider
   */
  async generateMetadata(tenantId: string): Promise<string> {
    const config = await this.getSAMLConfig(tenantId);
    if (!config) {
      throw new Error('SAML not configured for this tenant');
    }

    const sp = this.serviceProviders.get(tenantId);
    if (!sp) {
      await this.initializeSAMLProviders(config);
      return this.generateMetadata(tenantId);
    }

    return sp.create_metadata();
  }

  /**
   * Initiate SAML logout
   */
  async initiateLogout(
    tenantId: string, 
    nameId: string, 
    sessionIndex?: string
  ): Promise<string> {
    const config = await this.getSAMLConfig(tenantId);
    if (!config) {
      throw new Error('SAML not configured for this tenant');
    }

    const sp = this.serviceProviders.get(tenantId);
    const idp = this.identityProviders.get(tenantId);

    if (!sp || !idp) {
      await this.initializeSAMLProviders(config);
      return this.initiateLogout(tenantId, nameId, sessionIndex);
    }

    return new Promise((resolve, reject) => {
      sp.create_logout_request_url(idp, { name_id: nameId, session_index: sessionIndex }, (err, logout_url) => {
        if (err) {
          reject(err);
        } else {
          resolve(logout_url);
        }
      });
    });
  }

  /**
   * Get SAML sessions for a tenant
   */
  async getSAMLSessions(tenantId: string, activeOnly = true) {
    let query = db.select().from(samlSessions).where(eq(samlSessions.tenantId, tenantId));

    if (activeOnly) {
      const now = new Date();
      query = query.where(and(
        eq(samlSessions.tenantId, tenantId),
        eq(samlSessions.expiresAt, null) // No expiry or not expired
      ));
    }

    return await query;
  }

  /**
   * Validate SAML response
   */
  private async validateSAMLResponse(
    sp: saml2.ServiceProvider, 
    idp: saml2.IdentityProvider, 
    samlResponse: string
  ): Promise<SAMLAssertion | null> {
    return new Promise((resolve, reject) => {
      sp.post_assert(idp, { SAMLResponse: samlResponse }, (err, saml_response) => {
        if (err) {
          console.error('SAML validation error:', err);
          resolve(null);
        } else {
          const assertion: SAMLAssertion = {
            nameId: saml_response.user.name_id,
            attributes: saml_response.user.attributes || {},
            sessionIndex: saml_response.user.session_index
          };
          resolve(assertion);
        }
      });
    });
  }

  /**
   * Extract user information from SAML attributes
   */
  private extractUserInfo(assertion: SAMLAssertion, attributeMapping: any) {
    const userInfo: any = {};

    for (const [localField, samlAttribute] of Object.entries(attributeMapping)) {
      const value = assertion.attributes[samlAttribute as string];
      if (value) {
        userInfo[localField] = Array.isArray(value) ? value[0] : value;
      }
    }

    return userInfo;
  }

  /**
   * Find user by email in tenant
   */
  private async findUserByEmail(tenantId: string, email: string): Promise<TenantUser | null> {
    const users = await db.select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.email, email)
      ))
      .limit(1);

    return users.length > 0 ? users[0] : null;
  }

  /**
   * Create user from SAML attributes
   */
  private async createUserFromSAML(
    tenantId: string, 
    userInfo: any, 
    config: SamlConfig
  ): Promise<TenantUser> {
    const userData: InsertTenantUser = {
      tenantId,
      email: userInfo.email,
      firstName: userInfo.firstName || '',
      lastName: userInfo.lastName || '',
      status: 'active',
      externalId: userInfo.nameId || userInfo.email,
      metadata: {
        source: 'saml',
        samlConfigId: config.id,
        createdFromSSO: true
      }
    };

    const [user] = await db.insert(tenantUsers).values(userData).returning();

    // Assign default role if specified
    if (config.defaultRole) {
      // TODO: Assign default role to user
      console.log(`Should assign role ${config.defaultRole} to user ${user.id}`);
    }

    return user;
  }

  /**
   * Create SAML session record
   */
  private async createSAMLSession(
    samlConfigId: string,
    tenantId: string,
    userId: string,
    assertion: SAMLAssertion,
    ipAddress?: string,
    userAgent?: string
  ) {
    const sessionData: InsertSamlSession = {
      samlConfigId,
      tenantId,
      userId,
      sessionIndex: assertion.sessionIndex || null,
      nameId: assertion.nameId,
      attributes: assertion.attributes,
      ipAddress: ipAddress || null,
      userAgent,
      expiresAt: null // No expiry for now
    };

    await db.insert(samlSessions).values(sessionData);
  }

  /**
   * Generate JWT token for SAML authenticated user
   */
  private async generateTokenForUser(user: TenantUser): Promise<string> {
    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      permissions: [], // TODO: Get from RBAC
      authMethod: 'saml'
    };

    const jwt = await import('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    
    return jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
  }

  /**
   * Generate default private key for SAML (development only)
   */
  private generateDefaultPrivateKey(): string {
    return process.env.SAML_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
...
-----END PRIVATE KEY-----`;
  }

  /**
   * Generate default certificate for SAML (development only)
   */
  private generateDefaultCertificate(): string {
    return process.env.SAML_CERTIFICATE || `-----BEGIN CERTIFICATE-----
MIICtjCCAZ4CAQAwDQYJKoZIhvcNAQEFBQAwEjEQMA4GA1UEAwwHbXljZXJ0czAe
...
-----END CERTIFICATE-----`;
  }

  /**
   * List all SAML configurations
   */
  async listSAMLConfigs(tenantId?: string) {
    if (tenantId) {
      return await db.select().from(samlConfigs).where(eq(samlConfigs.tenantId, tenantId));
    } else {
      return await db.select().from(samlConfigs);
    }
  }

  /**
   * Update SAML configuration
   */
  async updateSAMLConfig(configId: string, updates: Partial<SamlConfig>) {
    const [updated] = await db.update(samlConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(samlConfigs.id, configId))
      .returning();

    if (updated) {
      await this.initializeSAMLProviders(updated);
    }

    return updated;
  }

  /**
   * Delete SAML configuration
   */
  async deleteSAMLConfig(configId: string) {
    const [deleted] = await db.delete(samlConfigs)
      .where(eq(samlConfigs.id, configId))
      .returning();

    if (deleted) {
      this.serviceProviders.delete(deleted.tenantId);
      this.identityProviders.delete(deleted.tenantId);
    }

    return deleted;
  }
}

export const samlService = new SAMLService();
