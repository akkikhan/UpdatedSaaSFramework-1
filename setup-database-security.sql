-- Production Database Security Setup for Azure PostgreSQL
-- Run this after server creation to establish least-privilege access

-- Step 1: Create application database
CREATE DATABASE saas_platform WITH ENCODING 'UTF8';

-- Connect to the new database (you'll need to run this separately)
\c saas_platform;

-- Step 2: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 3: Create application role with least privileges
CREATE ROLE saas_app WITH LOGIN PASSWORD 'AppPass@XXXXX!Secure';

-- Step 4: Grant database-level permissions
GRANT CONNECT ON DATABASE saas_platform TO saas_app;
GRANT TEMP ON DATABASE saas_platform TO saas_app;

-- Step 5: Grant schema permissions
GRANT USAGE, CREATE ON SCHEMA public TO saas_app;

-- Step 6: Grant table permissions (for existing and future tables)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO saas_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO saas_app;

-- Step 7: Grant sequence permissions (for auto-increment columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO saas_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO saas_app;

-- Step 8: Revoke unnecessary privileges from public
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Step 9: Set up connection limits
ALTER ROLE saas_app CONNECTION LIMIT 50;

-- Step 10: Force password encryption
ALTER ROLE saas_app SET password_encryption = 'scram-sha-256';

-- Verification queries
SELECT rolname, rolsuper, rolcreatedb, rolcanlogin FROM pg_roles WHERE rolname = 'saas_app';
SELECT datname, datacl FROM pg_database WHERE datname = 'saas_platform';
