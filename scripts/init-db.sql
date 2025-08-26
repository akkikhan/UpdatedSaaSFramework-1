-- Database initialization script for Docker
-- This runs when the PostgreSQL container starts for the first time

-- Create development database if it doesn't exist
CREATE DATABASE saas_framework_dev;

-- Create test database if it doesn't exist
CREATE DATABASE saas_framework_test;

-- Create user for development (if needed)
-- CREATE USER saas_dev WITH PASSWORD 'dev_password';
-- GRANT ALL PRIVILEGES ON DATABASE saas_framework_dev TO saas_dev;

-- Set up extensions that might be needed
\c saas_framework;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c saas_framework_dev;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c saas_framework_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Return to main database
\c saas_framework;
