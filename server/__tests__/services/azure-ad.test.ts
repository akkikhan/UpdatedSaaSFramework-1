import { AzureADService } from "../../services/azure-ad";
import { storage } from "../../storage";

// Mock the storage module
jest.mock("../../storage", () => ({
  storage: {
    getTenantUserByEmail: jest.fn(),
    createTenantUser: jest.fn(),
    updateTenantUser: jest.fn(),
    getTenantRoles: jest.fn(),
    createTenantRole: jest.fn(),
    assignTenantUserRole: jest.fn(),
    logSystemActivity: jest.fn(),
  },
}));

// Mock @azure/msal-node
jest.mock("@azure/msal-node", () => ({
  ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
    getAuthCodeUrl: jest.fn(),
    acquireTokenByCode: jest.fn(),
    acquireTokenSilent: jest.fn(),
  })),
  CryptoProvider: jest.fn().mockImplementation(() => ({
    generatePkceCodes: jest.fn().mockResolvedValue({
      challenge: "mock-challenge",
      verifier: "mock-verifier",
    }),
  })),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("AzureADService", () => {
  const mockStorage = storage as jest.Mocked<typeof storage>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  const testConfig = {
    tenantId: "test-tenant-id",
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "http://localhost:3000/auth/callback",
  };

  let azureADService: AzureADService;

  beforeEach(() => {
    jest.clearAllMocks();
    azureADService = new AzureADService(testConfig);
  });

  describe("constructor", () => {
    it("should create AzureADService instance with valid config", () => {
      expect(azureADService).toBeInstanceOf(AzureADService);
    });
  });

  describe("getAuthorizationUrl", () => {
    it("should generate authorization URL with PKCE parameters", async () => {
      const mockMsalApp = (azureADService as any).msalApp;
      mockMsalApp.getAuthCodeUrl.mockResolvedValue("https://login.microsoftonline.com/auth-url");

      const authUrl = await azureADService.getAuthorizationUrl(["User.Read"], "tenant-123");

      expect(authUrl).toBe("https://login.microsoftonline.com/auth-url");
      expect(mockMsalApp.getAuthCodeUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ["User.Read"],
          redirectUri: testConfig.redirectUri,
          codeChallenge: "mock-challenge",
          codeChallengeMethod: "S256",
          prompt: "consent",
        })
      );
    });

    it("should handle errors when generating auth URL", async () => {
      const mockMsalApp = (azureADService as any).msalApp;
      mockMsalApp.getAuthCodeUrl.mockRejectedValue(new Error("MSAL error"));

      await expect(azureADService.getAuthorizationUrl(["User.Read"])).rejects.toThrow(
        "Failed to generate Azure AD authorization URL"
      );
    });
  });

  describe("handleCallback", () => {
    const mockAuthResponse = {
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresOn: new Date(Date.now() + 3600000), // 1 hour from now
    };

    const mockUserProfile = {
      id: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      firstName: "Test",
      lastName: "User",
      groups: ["Test Group"],
    };

    const mockTenantUser = {
      id: "tenant-user-123",
      tenantId: "tenant-123",
      email: "test@example.com",
      passwordHash: null, // Azure AD users don't have local passwords
      firstName: "Test",
      lastName: "User",
      status: "active" as const,
      lastLoginAt: new Date(),
      externalId: "user-123",
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    beforeEach(() => {
      // Mock MSAL token acquisition
      const mockMsalApp = (azureADService as any).msalApp;
      mockMsalApp.acquireTokenByCode.mockResolvedValue(mockAuthResponse);

      // Mock Microsoft Graph API response
      mockFetch.mockImplementation(url => {
        if (typeof url === "string" && url.includes("graph.microsoft.com/v1.0/me")) {
          if (url.includes("memberOf")) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  value: [{ displayName: "Test Group", id: "group-123" }],
                }),
            } as Response);
          } else {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  id: "user-123",
                  mail: "test@example.com",
                  displayName: "Test User",
                  givenName: "Test",
                  surname: "User",
                }),
            } as Response);
          }
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      // Mock storage responses
      mockStorage.getTenantUserByEmail.mockResolvedValue(null); // New user
      mockStorage.createTenantUser.mockResolvedValue(mockTenantUser);
      mockStorage.getTenantRoles.mockResolvedValue([]);
      mockStorage.createTenantRole.mockResolvedValue({
        id: "role-123",
        tenantId: "tenant-123",
        name: "User",
        description: "Default user role",
        permissions: ["profile.read"],
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockStorage.assignTenantUserRole.mockResolvedValue({
        id: "assignment-123",
        tenantId: "tenant-123",
        userId: "tenant-user-123",
        roleId: "role-123",
        assignedAt: new Date(),
        assignedBy: null,
      });
    });

    it("should handle callback and provision new user", async () => {
      const code = "auth-code-123";
      const state = JSON.stringify({ codeVerifier: "mock-verifier", tenantId: "tenant-123" });
      const tenantId = "tenant-123";

      const result = await azureADService.handleCallback(code, state, tenantId);

      expect(result.user).toEqual(mockTenantUser);
      expect(result.accessToken).toBe("mock-access-token");
      expect(result.refreshToken).toBeUndefined(); // MSAL handles refresh tokens internally
      expect(mockStorage.createTenantUser).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          externalId: "user-123",
        })
      );
    });

    it("should update existing user on callback", async () => {
      // Mock existing user
      mockStorage.getTenantUserByEmail.mockResolvedValue(mockTenantUser);
      mockStorage.updateTenantUser.mockResolvedValue({
        ...mockTenantUser,
        lastLoginAt: new Date(),
      });

      const code = "auth-code-123";
      const state = JSON.stringify({ codeVerifier: "mock-verifier", tenantId: "tenant-123" });
      const tenantId = "tenant-123";

      const result = await azureADService.handleCallback(code, state, tenantId);

      expect(mockStorage.updateTenantUser).toHaveBeenCalledWith(
        mockTenantUser.id,
        expect.objectContaining({
          firstName: "Test",
          lastName: "User",
          externalId: "user-123",
        })
      );
      expect(mockStorage.createTenantUser).not.toHaveBeenCalled();
    });

    it("should handle invalid state parameter", async () => {
      const code = "auth-code-123";
      const state = "invalid-json";
      const tenantId = "tenant-123";

      await expect(azureADService.handleCallback(code, state, tenantId)).rejects.toThrow(
        "Azure AD callback failed: Invalid state parameter"
      );
    });

    it("should handle missing code verifier", async () => {
      const code = "auth-code-123";
      const state = JSON.stringify({ tenantId: "tenant-123" }); // Missing codeVerifier
      const tenantId = "tenant-123";

      await expect(azureADService.handleCallback(code, state, tenantId)).rejects.toThrow(
        "Azure AD callback failed: Missing code verifier in state"
      );
    });

    it("should handle MSAL token acquisition failure", async () => {
      const mockMsalApp = (azureADService as any).msalApp;
      mockMsalApp.acquireTokenByCode.mockRejectedValue(new Error("Token acquisition failed"));

      const code = "auth-code-123";
      const state = JSON.stringify({ codeVerifier: "mock-verifier", tenantId: "tenant-123" });
      const tenantId = "tenant-123";

      await expect(azureADService.handleCallback(code, state, tenantId)).rejects.toThrow(
        "Azure AD callback failed: Token acquisition failed"
      );
    });
  });

  describe("getUserProfile", () => {
    it("should get user profile from Microsoft Graph", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "user-123",
              mail: "test@example.com",
              displayName: "Test User",
              givenName: "Test",
              surname: "User",
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              value: [{ displayName: "Admin Group", id: "admin-group" }],
            }),
        } as Response);

      const userProfile = await azureADService.getUserProfile("mock-token");

      expect(userProfile).toEqual({
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        firstName: "Test",
        lastName: "User",
        groups: ["Admin Group"],
      });
    });

    it("should handle Microsoft Graph API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      } as Response);

      await expect(azureADService.getUserProfile("invalid-token")).rejects.toThrow(
        "Failed to get user profile: Microsoft Graph API error: 401 Unauthorized"
      );
    });

    it("should continue without groups if group fetch fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "user-123",
              mail: "test@example.com",
              displayName: "Test User",
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        } as Response);

      const userProfile = await azureADService.getUserProfile("mock-token");

      expect(userProfile.groups).toEqual([]);
    });
  });

  describe("refreshTokens", () => {
    it("should refresh tokens successfully using MSAL silent acquisition", async () => {
      const mockRefreshResponse = {
        accessToken: "new-access-token",
        expiresOn: new Date(Date.now() + 3600000),
      };

      const mockAccount = {
        homeAccountId: "test-account-id",
        environment: "login.microsoftonline.com",
        tenantId: "test-tenant",
        username: "test@example.com",
      };

      const mockMsalApp = (azureADService as any).msalApp;
      mockMsalApp.acquireTokenSilent.mockResolvedValue(mockRefreshResponse);

      const result = await azureADService.refreshTokens(mockAccount);

      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBeUndefined(); // MSAL handles refresh tokens internally
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockMsalApp.acquireTokenSilent).toHaveBeenCalledWith({
        scopes: ["User.Read", "User.ReadBasic.All"],
        account: mockAccount,
      });
    });

    it("should handle refresh token errors", async () => {
      const mockMsalApp = (azureADService as any).msalApp;
      mockMsalApp.acquireTokenSilent.mockRejectedValue(
        new Error("Silent token acquisition failed")
      );

      const mockAccount = { homeAccountId: "test-account-id" };

      await expect(azureADService.refreshTokens(mockAccount)).rejects.toThrow(
        "Token refresh failed: Silent token acquisition failed"
      );
    });
  });

  describe("validateConfig", () => {
    it("should validate complete config", () => {
      expect(AzureADService.validateConfig(testConfig)).toBe(true);
    });

    it("should reject incomplete config", () => {
      expect(
        AzureADService.validateConfig({
          tenantId: "test",
          clientId: "",
          clientSecret: "secret",
        })
      ).toBe(false);
    });
  });

  describe("createFromTenantConfig", () => {
    it("should create service from valid tenant config", () => {
      const service = AzureADService.createFromTenantConfig(testConfig);
      expect(service).toBeInstanceOf(AzureADService);
    });

    it("should throw error for invalid config", () => {
      expect(() =>
        AzureADService.createFromTenantConfig({
          tenantId: "test",
          // Missing clientId and clientSecret
        })
      ).toThrow("Invalid Azure AD configuration");
    });
  });
});
