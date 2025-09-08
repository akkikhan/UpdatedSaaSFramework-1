import dotenv from "dotenv";

dotenv.config();

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;
  FROM_EMAIL: string;
  JWT_SECRET: string;
  AZURE_CLIENT_ID: string;
  AZURE_CLIENT_SECRET: string;
  AZURE_TENANT_ID: string;
  AZURE_REDIRECT_URI: string;
}

export function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];

  // Check required variables
  const required = [
    "NODE_ENV",
    "PORT",
    "DATABASE_URL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "FROM_EMAIL",
    "JWT_SECRET",
    "AZURE_CLIENT_ID",
    "AZURE_CLIENT_SECRET",
    "AZURE_TENANT_ID",
    "AZURE_REDIRECT_URI",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Check for insecure values
  const insecure = [
    "admin123",
    "test123",
    "password123",
    "secret",
    "changeme",
    "demo",
    "example",
    "template",
  ];

  // In development, allow localhost
  if (process.env.NODE_ENV !== "development") {
    insecure.push("localhost");
  }

  for (const key of required) {
    const value = process.env[key]?.toLowerCase();
    if (value && insecure.some(bad => value.includes(bad))) {
      errors.push(`Insecure value detected in ${key}`);
    }
  }

  // JWT secret must be strong
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters");
  }

  // Azure client secret common misconfiguration
  // Developers sometimes copy the secret's ID (a GUID) instead of the secret value.
  // The secret value is a long string, while the secret ID has a UUID format.
  const azureSecret = process.env.AZURE_CLIENT_SECRET;
  if (azureSecret && /^[0-9a-f-]{36}$/i.test(azureSecret)) {
    errors.push(
      "AZURE_CLIENT_SECRET appears to be a secret ID. Use the secret value from Azure portal."
    );
  }

  if (errors.length > 0) {
    console.error("🚨 ENVIRONMENT VALIDATION FAILED:");
    errors.forEach(error => console.error(`   - ${error}`));
    console.error("\n💡 Copy .env.template to .env and set secure values");
    throw new Error("Environment validation failed");
  }

  console.log("✅ Environment validation passed");
  return process.env as unknown as EnvironmentConfig;
}
