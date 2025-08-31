-- Migration: Add platform_admins table
-- Run this SQL to add the platform admins table to your database

CREATE TABLE platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Create first super admin (update email/password as needed)
-- Default password: 'admin123' - CHANGE THIS IMMEDIATELY IN PRODUCTION
INSERT INTO platform_admins (email, password_hash, name, role) 
VALUES (
    'admin@yourcompany.com', 
    '$2a$10$rZ8R8VeUQFVhDXP5xKJ.G.oBfVc1c0Fv1.PJC6M8dDYpY6KS2aZbu', -- bcrypt hash of 'admin123'
    'Platform Administrator',
    'super_admin'
);

-- Add indexes for performance
CREATE INDEX idx_platform_admins_email ON platform_admins(email);
CREATE INDEX idx_platform_admins_active ON platform_admins(is_active);
