/**
 * Test Setup File
 * 
 * This file runs before all tests and sets up the testing environment
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for testing
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/saas_framework_test';
  
  // Mock email service for testing
  process.env.SMTP_HOST = 'smtp.test.com';
  process.env.SMTP_USERNAME = 'test@example.com';
  process.env.SMTP_PASSWORD = 'test-password';
  process.env.FROM_EMAIL = 'test@example.com';
  process.env.FROM_NAME = 'Test Platform';
  
  // Disable rate limiting in tests
  process.env.DISABLE_RATE_LIMITING = 'true';
  
  console.log('🧪 Test environment setup complete');
});

// Cleanup after all tests
afterAll(() => {
  console.log('🧹 Test cleanup complete');
});

// Reset state before each test
beforeEach(() => {
  // Clear any module caches or state that might affect tests
  jest.clearAllMocks?.();
});
