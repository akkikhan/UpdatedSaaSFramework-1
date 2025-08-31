import {
  ConfidentialClientApplication,
  AuthenticationResult,
  CryptoProvider,
} from "@azure/msal-node";
import { storage } from "../storage";
import type { TenantUser } from "@shared/schema";

interface AzureADConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

interface AzureUser {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  groups?: string[];
}

interface AuthResult {
  user: TenantUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export class AzureADService {
  private msalApp: ConfidentialClientApplication;
  private config: AzureADConfig;
  private cryptoProvider: CryptoProvider;

  constructor(config: AzureADConfig) {
    this.config = config;
    this.cryptoProvider = new CryptoProvider();

    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        knownAuthorities: [`https://login.microsoftonline.com/${config.tenantId}`],
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message) => {
            console.log(`[Azure AD] ${level}: ${message}`);
          },
          piiLoggingEnabled: false,
          logLevel: process.env.NODE_ENV === "development" ? 3 : 1, // Verbose in dev, Error in prod
        },
      },
    });
  }

  /**
   * Generate Microsoft authorization URL with PKCE support
   */
  async getAuthorizationUrl(
    scopes: string[] = ["User.Read", "User.ReadBasic.All"],
    tenantId?: string
  ): Promise<string> {
    try {
      // Generate PKCE parameters
      const { challenge, verifier } = await this.cryptoProvider.generatePkceCodes();

      const authCodeUrlParameters = {
        scopes,
        redirectUri:
          this.config.redirectUri ||
          process.env.AZURE_REDIRECT_URI ||
          "http://localhost:3000/auth/azure/callback",
        codeChallenge: challenge,
        codeChallengeMethod: "S256",
        state: tenantId
          ? JSON.stringify({ tenantId, codeVerifier: verifier })
          : JSON.stringify({ codeVerifier: verifier }),
        prompt: "consent", // Force consent to ensure we get refresh token
      };

      const authUrl = await this.msalApp.getAuthCodeUrl(authCodeUrlParameters);
      return authUrl;
    } catch (error) {
      console.error("Error generating authorization URL:", error);
      throw new Error(
        `Failed to generate Azure AD authorization URL: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Handle OAuth callback and provision user
   */
  async handleCallback(code: string, state: string, tenantId: string): Promise<AuthResult> {
    try {
      // Parse state to get code verifier
      let stateData;
      try {
        stateData = JSON.parse(state);
      } catch {
        throw new Error("Invalid state parameter");
      }

      if (!stateData.codeVerifier) {
        throw new Error("Missing code verifier in state");
      }

      // Exchange authorization code for tokens
      const tokenRequest = {
        code,
        scopes: ["User.Read", "User.ReadBasic.All"],
        redirectUri:
          this.config.redirectUri ||
          process.env.AZURE_REDIRECT_URI ||
          "http://localhost:3000/auth/azure/callback",
        codeVerifier: stateData.codeVerifier,
      };

      const response = await this.msalApp.acquireTokenByCode(tokenRequest);

      if (!response) {
        throw new Error("Failed to acquire token from Azure AD");
      }

      // Get user profile from Microsoft Graph
      const azureUser = await this.getUserProfile(response.accessToken);

      // Create or update tenant user
      const user = await this.provisionUser(azureUser, tenantId);

      // Calculate token expiration
      const expiresAt = new Date(
        Date.now() + (response.expiresOn ? response.expiresOn.getTime() - Date.now() : 3600 * 1000)
      );

      return {
        user,
        accessToken: response.accessToken,
        refreshToken: undefined, // MSAL handles refresh tokens internally
        expiresAt,
      };
    } catch (error) {
      console.error("Error handling Azure AD callback:", error);
      throw new Error(
        `Azure AD callback failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get user profile from Microsoft Graph API
   */
  async getUserProfile(accessToken: string): Promise<AzureUser> {
    try {
      // Get basic user info
      const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!userResponse.ok) {
        throw new Error(
          `Microsoft Graph API error: ${userResponse.status} ${userResponse.statusText}`
        );
      }

      const userInfo = await userResponse.json();

      // Get user's group memberships (for role mapping)
      let groups: string[] = [];
      try {
        const groupsResponse = await fetch(
          "https://graph.microsoft.com/v1.0/me/memberOf?$select=displayName,id",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json();
          groups = groupsData.value.map((group: any) => group.displayName).filter(Boolean);
        }
      } catch (groupError) {
        console.warn("Failed to fetch user groups:", groupError);
        // Continue without groups if we can't fetch them
      }

      return {
        id: userInfo.id,
        email: userInfo.mail || userInfo.userPrincipalName,
        displayName: userInfo.displayName,
        firstName: userInfo.givenName,
        lastName: userInfo.surname,
        groups,
      };
    } catch (error) {
      console.error("Error getting user profile from Microsoft Graph:", error);
      throw new Error(
        `Failed to get user profile: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Refresh Azure AD tokens using MSAL silent token acquisition
   */
  async refreshTokens(account: any): Promise<TokenResult> {
    try {
      const silentRequest = {
        scopes: ["User.Read", "User.ReadBasic.All"],
        account: account,
      };

      const response = await this.msalApp.acquireTokenSilent(silentRequest);

      if (!response) {
        throw new Error("Failed to refresh token");
      }

      const expiresAt = new Date(
        Date.now() + (response.expiresOn ? response.expiresOn.getTime() - Date.now() : 3600 * 1000)
      );

      return {
        accessToken: response.accessToken,
        refreshToken: undefined, // MSAL handles refresh tokens internally
        expiresAt,
      };
    } catch (error) {
      console.error("Error refreshing Azure AD tokens:", error);
      throw new Error(
        `Token refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Provision or update tenant user from Azure AD data
   */
  private async provisionUser(azureUser: AzureUser, tenantId: string): Promise<TenantUser> {
    try {
      // Check if user already exists
      const existingUser = await storage.getTenantUserByEmail(tenantId, azureUser.email);

      if (existingUser) {
        // Update existing user
        const updatedUser = await storage.updateTenantUser(existingUser.id, {
          firstName: azureUser.firstName,
          lastName: azureUser.lastName,
          lastLoginAt: new Date(),
          externalId: azureUser.id, // Store Azure AD user ID
          metadata: {
            azureAdGroups: azureUser.groups,
            lastAzureSync: new Date().toISOString(),
          },
        });

        if (!updatedUser) {
          throw new Error("Failed to update existing user");
        }

        return updatedUser;
      } else {
        // Create new user
        const newUser = await storage.createTenantUser({
          tenantId,
          email: azureUser.email,
          firstName: azureUser.firstName,
          lastName: azureUser.lastName,
          status: "active",
          lastLoginAt: new Date(),
          externalId: azureUser.id,
          metadata: {
            provider: "azure-ad",
            azureAdGroups: azureUser.groups,
            lastAzureSync: new Date().toISOString(),
          },
        });

        // TODO: Auto-assign roles based on Azure AD groups
        // This would be configurable per tenant
        await this.assignRolesBasedOnGroups(newUser, azureUser.groups || [], tenantId);

        return newUser;
      }
    } catch (error) {
      console.error("Error provisioning user:", error);
      throw new Error(
        `User provisioning failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Assign roles based on Azure AD group membership
   */
  private async assignRolesBasedOnGroups(
    user: TenantUser,
    groups: string[],
    tenantId: string
  ): Promise<void> {
    try {
      // TODO: Get tenant's Azure AD group-to-role mapping configuration
      // For now, we'll implement basic default mapping

      const defaultRoleMappings: Record<string, string[]> = {
        "SaaS Admins": ["admin"],
        "SaaS Managers": ["manager"],
        "SaaS Users": ["user"],
      };

      const rolesToAssign: string[] = [];

      // Check each group membership
      for (const group of groups) {
        if (defaultRoleMappings[group]) {
          rolesToAssign.push(...defaultRoleMappings[group]);
        }
      }

      // If no specific roles found, assign default user role
      if (rolesToAssign.length === 0) {
        rolesToAssign.push("user");
      }

      // Get or create roles and assign them
      for (const roleName of rolesToAssign) {
        try {
          const roles = await storage.getTenantRoles(tenantId);
          let role = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase());

          if (!role) {
            // Create default role if it doesn't exist
            role = await storage.createTenantRole({
              tenantId,
              name: roleName.charAt(0).toUpperCase() + roleName.slice(1),
              description: `Default ${roleName} role created from Azure AD integration`,
              permissions: this.getDefaultPermissionsForRole(roleName),
              isSystem: false,
            });
          }

          // Assign role to user
          await storage.assignTenantUserRole({
            tenantId,
            userId: user.id,
            roleId: role.id,
          });

          console.log(
            `Assigned role '${role.name}' to user '${user.email}' based on Azure AD groups`
          );
        } catch (roleError) {
          console.error(`Error assigning role '${roleName}':`, roleError);
          // Continue with other roles even if one fails
        }
      }
    } catch (error) {
      console.error("Error assigning roles based on groups:", error);
      // Don't throw here - user creation should succeed even if role assignment fails
    }
  }

  /**
   * Get default permissions for a role
   */
  private getDefaultPermissionsForRole(roleName: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      admin: ["*"], // Full access
      manager: ["users.read", "users.write", "reports.read", "settings.read"],
      user: ["profile.read", "profile.write", "data.read"],
    };

    return rolePermissions[roleName.toLowerCase()] || ["profile.read"];
  }

  /**
   * Validate Azure AD configuration
   */
  static validateConfig(config: AzureADConfig): boolean {
    return !!(config.tenantId && config.clientId && config.clientSecret);
  }

  /**
   * Create AzureADService from tenant configuration
   */
  static createFromTenantConfig(config: any): AzureADService {
    if (!this.validateConfig(config)) {
      throw new Error(
        "Invalid Azure AD configuration: missing required fields (tenantId, clientId, clientSecret)"
      );
    }

    return new AzureADService({
      tenantId: config.tenantId,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    });
  }
}
