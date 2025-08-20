// Types for better TypeScript support
export interface AuthConfig {
  apiKey: string;
  baseUrl: string;
  tenantId: string;
}

export interface User {
  id: string;
  email: string;
  tenantId: string;
  roles?: string[];
  lastLogin?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface ApiResponse {
  user: {
    id: string;
    email: string;
    tenantId: string;
    roles?: string[];
    lastLogin?: string;
  };
  token: string;
  refreshToken?: string;
  expiresAt: string;
}

export interface VerifyResponse {
  valid: boolean;
  user: {
    id: string;
    email: string;
    tenantId: string;
    roles?: string[];
    lastLogin?: string;
  };
}

export interface RefreshResponse {
  token: string;
}