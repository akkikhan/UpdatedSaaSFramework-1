import { platformAdminAuthService } from "../services/platform-admin-auth";
import { storage } from "../storage";
import bcrypt from "bcryptjs";

// Mock the storage module
jest.mock("../storage", () => ({
  storage: {
    getPlatformAdminByEmail: jest.fn(),
    updatePlatformAdminLastLogin: jest.fn(),
    createPlatformAdmin: jest.fn(),
    getPlatformAdmin: jest.fn(),
    getAllPlatformAdmins: jest.fn(),
    updatePlatformAdmin: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe("PlatformAdminAuthService", () => {
  const mockStorage = storage as jest.Mocked<typeof storage>;
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("should successfully login with valid credentials", async () => {
      // Arrange
      const mockAdmin = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Test Admin",
        role: "admin",
        isActive: true,
        passwordHash: "hashedpassword",
        createdAt: new Date(),
        lastLogin: null,
      };

      mockStorage.getPlatformAdminByEmail.mockResolvedValue(mockAdmin);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockStorage.updatePlatformAdminLastLogin.mockResolvedValue(undefined);

      // Act
      const result = await platformAdminAuthService.login("admin@test.com", "password123");

      // Assert
      expect(result).toBeDefined();
      expect(result?.admin.email).toBe("admin@test.com");
      expect(result?.admin.name).toBe("Test Admin");
      expect(result?.token).toBeDefined();
      expect(result?.refreshToken).toBeDefined();

      expect(mockStorage.getPlatformAdminByEmail).toHaveBeenCalledWith("admin@test.com");
      expect(mockBcrypt.compare).toHaveBeenCalledWith("password123", "hashedpassword");
      expect(mockStorage.updatePlatformAdminLastLogin).toHaveBeenCalledWith("admin-1");
    });

    it("should return null for invalid email", async () => {
      // Arrange
      mockStorage.getPlatformAdminByEmail.mockResolvedValue(undefined);

      // Act
      const result = await platformAdminAuthService.login("invalid@test.com", "password123");

      // Assert
      expect(result).toBeNull();
      expect(mockStorage.getPlatformAdminByEmail).toHaveBeenCalledWith("invalid@test.com");
    });

    it("should return null for inactive admin", async () => {
      // Arrange
      const mockAdmin = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Test Admin",
        role: "admin",
        isActive: false, // Inactive admin
        passwordHash: "hashedpassword",
        createdAt: new Date(),
        lastLogin: null,
      };

      mockStorage.getPlatformAdminByEmail.mockResolvedValue(mockAdmin);

      // Act
      const result = await platformAdminAuthService.login("admin@test.com", "password123");

      // Assert
      expect(result).toBeNull();
      expect(mockStorage.getPlatformAdminByEmail).toHaveBeenCalledWith("admin@test.com");
    });

    it("should return null for invalid password", async () => {
      // Arrange
      const mockAdmin = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Test Admin",
        role: "admin",
        isActive: true,
        passwordHash: "hashedpassword",
        createdAt: new Date(),
        lastLogin: null,
      };

      mockStorage.getPlatformAdminByEmail.mockResolvedValue(mockAdmin);
      mockBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await platformAdminAuthService.login("admin@test.com", "wrongpassword");

      // Assert
      expect(result).toBeNull();
      expect(mockStorage.getPlatformAdminByEmail).toHaveBeenCalledWith("admin@test.com");
      expect(mockBcrypt.compare).toHaveBeenCalledWith("wrongpassword", "hashedpassword");
    });
  });

  describe("createPlatformAdmin", () => {
    it("should create a new platform admin", async () => {
      // Arrange
      const adminData = {
        email: "newadmin@test.com",
        password: "password123",
        name: "New Admin",
        role: "admin",
      };

      const mockCreatedAdmin = {
        id: "admin-2",
        email: adminData.email,
        name: adminData.name,
        role: adminData.role,
        passwordHash: "hashedpassword",
        isActive: true,
        createdAt: new Date(),
        lastLogin: null,
      };

      mockBcrypt.hash.mockResolvedValue("hashedpassword" as never);
      mockStorage.createPlatformAdmin.mockResolvedValue(mockCreatedAdmin);

      // Act
      const result = await platformAdminAuthService.createPlatformAdmin(adminData);

      // Assert
      expect(result).toEqual(mockCreatedAdmin);
      expect(mockBcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(mockStorage.createPlatformAdmin).toHaveBeenCalledWith({
        email: adminData.email,
        passwordHash: "hashedpassword",
        name: adminData.name,
        role: adminData.role,
        isActive: true,
      });
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid platform admin token", async () => {
      // Arrange
      const mockAdmin = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Test Admin",
        role: "admin",
        isActive: true,
        passwordHash: "hashedpassword",
        createdAt: new Date(),
        lastLogin: null,
      };

      // Create a mock token payload that matches what JWT would return
      const mockPayload = {
        adminId: "admin-1",
        email: "admin@test.com",
        name: "Test Admin",
        role: "admin",
        type: "platform_admin",
      };

      // Mock JWT verification to return our payload
      const mockJwt = require("jsonwebtoken");
      mockJwt.verify.mockReturnValue(mockPayload);

      mockStorage.getPlatformAdmin.mockResolvedValue(mockAdmin);

      // Act
      const result = await platformAdminAuthService.verifyToken("mock-jwt-token");

      // Assert
      expect(result).toEqual(mockPayload);
      expect(mockStorage.getPlatformAdmin).toHaveBeenCalledWith("admin-1");
    });

    it("should return null for non-platform admin token", async () => {
      // Arrange
      const mockPayload = {
        userId: "user-1",
        tenantId: "tenant-1",
        type: "tenant_user", // Not a platform admin token
      };

      const mockJwt = require("jsonwebtoken");
      mockJwt.verify.mockReturnValue(mockPayload);

      // Act
      const result = await platformAdminAuthService.verifyToken("mock-jwt-token");

      // Assert
      expect(result).toBeNull();
    });

    it("should return null for inactive admin", async () => {
      // Arrange
      const mockPayload = {
        adminId: "admin-1",
        type: "platform_admin",
      };

      const mockInactiveAdmin = {
        id: "admin-1",
        isActive: false, // Inactive
        email: "admin@test.com",
        name: "Test Admin",
        role: "admin",
        passwordHash: "hashedpassword",
        createdAt: new Date(),
        lastLogin: null,
      };

      const mockJwt = require("jsonwebtoken");
      mockJwt.verify.mockReturnValue(mockPayload);
      mockStorage.getPlatformAdmin.mockResolvedValue(mockInactiveAdmin);

      // Act
      const result = await platformAdminAuthService.verifyToken("mock-jwt-token");

      // Assert
      expect(result).toBeNull();
    });
  });
});
