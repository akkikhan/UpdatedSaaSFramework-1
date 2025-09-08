import dotenv from "dotenv";

dotenv.config();

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  AZURE_CLIENT_ID: string;
  AZURE_CLIENT_SECRET: string;
  AZURE_TENANT_ID: string;
  AZURE_REDIRECT_URI: string;
  // Optional email configuration (SMTP or Gmail)
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USERNAME?: string;
  SMTP_PASSWORD?: string;
  SMTP_PASS?: string;
  SMTP_APP_PASSWORD?: string;
  FROM_EMAIL?: string;
  GMAIL_USER?: string;
  GMAIL_APP_PASSWORD?: string;
}

export function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];

  // Check required variables
  const required = [
    "NODE_ENV",
    "PORT",
    "DATABASE_URL",
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
    // In development, relax checks for DATABASE_URL to allow local/dev passwords
    if (process.env.NODE_ENV === "development" && key === "DATABASE_URL") continue;
    if (value && insecure.some(bad => value.includes(bad))) {
      errors.push(`Insecure value detected in ${key}`);
    }
  }

  // Email configuration: require either Gmail creds or SMTP settings
  const hasGmail = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;
  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USERNAME &&
    (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_APP_PASSWORD) &&
    process.env.FROM_EMAIL;

  if (!hasGmail && !hasSmtp) {
    errors.push(
      "Missing email configuration: set GMAIL_USER/GMAIL_APP_PASSWORD or SMTP_HOST/SMTP_PORT/SMTP_USERNAME/(SMTP_PASSWORD|SMTP_PASS|SMTP_APP_PASSWORD)/FROM_EMAIL"
    );
  }

  if (hasGmail) {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = process.env.SMTP_PORT || "587";
    process.env.SMTP_USERNAME = process.env.GMAIL_USER!;
    process.env.SMTP_PASSWORD = process.env.GMAIL_APP_PASSWORD!;
    process.env.FROM_EMAIL = process.env.FROM_EMAIL || process.env.GMAIL_USER!;
  } else {
    if (process.env.SMTP_PASS && !process.env.SMTP_PASSWORD) {
      process.env.SMTP_PASSWORD = process.env.SMTP_PASS;
    }
    if (process.env.SMTP_APP_PASSWORD && !process.env.SMTP_PASSWORD) {
      process.env.SMTP_PASSWORD = process.env.SMTP_APP_PASSWORD;
    }
  }

  // JWT secret must be strong
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters");
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
