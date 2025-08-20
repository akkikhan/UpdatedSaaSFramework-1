import { ConfidentialClientApplication } from "@azure/msal-node";

interface AzureADConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export class AzureADService {
  private msalApp: ConfidentialClientApplication;

  constructor(config: AzureADConfig) {
    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`
      }
    });
  }

  async validateToken(accessToken: string) {
    try {
      // In a production environment, you would validate the JWT token
      // For now, we'll use MSAL to get user info
      const userInfo = await this.getUserInfo(accessToken);
      return userInfo;
    } catch (error) {
      console.error("Error validating Azure AD token:", error);
      throw new Error("Invalid Azure AD token");
    }
  }

  async getUserInfo(accessToken: string) {
    try {
      // Use Microsoft Graph API to get user information
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info from Microsoft Graph');
      }

      const userInfo = await response.json();
      return {
        id: userInfo.id,
        email: userInfo.mail || userInfo.userPrincipalName,
        displayName: userInfo.displayName,
        firstName: userInfo.givenName,
        lastName: userInfo.surname
      };
    } catch (error) {
      console.error("Error getting user info:", error);
      throw error;
    }
  }

  getAuthorizationUrl(scopes: string[] = ['User.Read']) {
    const authCodeUrlParameters = {
      scopes,
      redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:5000/auth/azure/callback'
    };

    return this.msalApp.getAuthCodeUrl(authCodeUrlParameters);
  }

  async getTokenByCode(code: string, scopes: string[] = ['User.Read']) {
    try {
      const tokenRequest = {
        code,
        scopes,
        redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:5000/auth/azure/callback'
      };

      const response = await this.msalApp.acquireTokenByCode(tokenRequest);
      return response;
    } catch (error) {
      console.error("Error acquiring token by code:", error);
      throw error;
    }
  }

  static createFromTenantConfig(config: any): AzureADService {
    if (!config?.tenantId || !config?.clientId || !config?.clientSecret) {
      throw new Error('Missing required Azure AD configuration');
    }

    return new AzureADService({
      tenantId: config.tenantId,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri
    });
  }
}