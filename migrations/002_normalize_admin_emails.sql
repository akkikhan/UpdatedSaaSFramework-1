-- Normalize admin emails to consistent lowercase format
-- (PostgreSQL syntax)
UPDATE tenants 
SET admin_email = LOWER(TRIM(COALESCE(admin_email, ''))) 
WHERE admin_email IS NOT NULL
    AND admin_email != LOWER(TRIM(admin_email));

-- Also normalize user emails for consistency
UPDATE tenant_users 
SET email = LOWER(TRIM(COALESCE(email, ''))) 
WHERE email IS NOT NULL
    AND email != LOWER(TRIM(email));

-- Add index for faster lookups if it doesn't exist
-- Note: PostgreSQL 9.5+ supports CREATE INDEX IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1
    FROM pg_index
    WHERE indexrelid = 'tenant_users'::regclass::oid AND indname = 'idx_tenant_users_email_lower') THEN
    CREATE INDEX idx_tenant_users_email_lower ON tenant_users (LOWER
    (email));
END
IF;
END $$;

-- Create audit log table if it doesn't exist
-- Note: Using DO block for conditional table creation in PostgreSQL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1
    FROM pg_tables
    WHERE tablename = 'email_normalization_log') THEN
    CREATE TABLE email_normalization_log
    (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(50),
        record_id UUID,
        original_email VARCHAR(255),
        normalized_email VARCHAR(255),
        normalized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
END
IF;
END $$;

-- Log tenants that were updated
INSERT INTO email_normalization_log
    (table_name, record_id, original_email, normalized_email)
SELECT 'tenants', id, admin_email, LOWER(TRIM(admin_email))
FROM tenants
WHERE admin_email IS NOT NULL
    AND admin_email != LOWER(TRIM(admin_email));

-- Log users that were updated  
INSERT INTO email_normalization_log
    (table_name, record_id, original_email, normalized_email)
SELECT 'tenant_users', id, email, LOWER(TRIM(email))
FROM tenant_users
WHERE email IS NOT NULL
    AND email != LOWER(TRIM(email));

-- Verify no data loss (optional check)
    SELECT
        'tenants' as table_name,
        count(*) as total,
        count(CASE WHEN admin_email IS NOT NULL THEN 1 END) as with_email,
        count(CASE WHEN admin_email != LOWER(TRIM(admin_email)) THEN 1 END) as normalized_count
    FROM tenants
UNION ALL
    SELECT
        'tenant_users' as table_name,
        count(*) as total,
        count(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
        count(CASE WHEN email != LOWER(TRIM(email)) THEN 1 END) as normalized_count
    FROM tenant_users;