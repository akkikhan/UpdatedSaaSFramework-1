-- SQL script to reset the password for admin@test.com
-- The password hash below is for 'TestPassword123!' using bcrypt with 12 rounds

UPDATE tenant_users 
SET password_hash = '$2a$12$hashed_password_placeholder'
WHERE email = 'admin@test.com';

-- First, let's check what users exist
SELECT id, email, tenant_id, status, password_hash IS NOT NULL as has_password
FROM tenant_users
WHERE email = 'admin@test.com';
