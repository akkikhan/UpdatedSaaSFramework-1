-- Fix password_hash constraint for Azure AD users
-- This allows platform_admins to have null password_hash for SSO authentication

ALTER TABLE platform_admins ALTER COLUMN password_hash DROP NOT NULL;

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'platform_admins' 
AND column_name = 'password_hash';
