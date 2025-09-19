-- Normalize admin and tenant user emails to a consistent lowercase format
-- PostgreSQL flavor of migration 002_normalize_admin_emails

-- Ensure audit log table exists for tracking changes
CREATE TABLE IF NOT EXISTS email_normalization_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    original_email VARCHAR(255),
    normalized_email VARCHAR(255),
    normalized_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create functional index to speed up lower-case lookups
CREATE INDEX IF NOT EXISTS idx_tenant_users_email_lower
    ON tenant_users ((LOWER(email)));

-- Normalize tenant admin emails and capture audit trail
WITH candidates AS (
    SELECT
        id,
        admin_email AS original_email,
        LOWER(TRIM(admin_email)) AS normalized_email
    FROM tenants
    WHERE admin_email IS NOT NULL
      AND admin_email <> LOWER(TRIM(admin_email))
),
updated AS (
    UPDATE tenants t
    SET admin_email = c.normalized_email
    FROM candidates c
    WHERE t.id = c.id
    RETURNING t.id
)
INSERT INTO email_normalization_log (table_name, record_id, original_email, normalized_email)
SELECT 'tenants', id, original_email, normalized_email
FROM candidates;

-- Normalize tenant user emails and capture audit trail
WITH candidates AS (
    SELECT
        id,
        email AS original_email,
        LOWER(TRIM(email)) AS normalized_email
    FROM tenant_users
    WHERE email IS NOT NULL
      AND email <> LOWER(TRIM(email))
),
updated AS (
    UPDATE tenant_users u
    SET email = c.normalized_email
    FROM candidates c
    WHERE u.id = c.id
    RETURNING u.id
)
INSERT INTO email_normalization_log (table_name, record_id, original_email, normalized_email)
SELECT 'tenant_users', id, original_email, normalized_email
FROM candidates;

-- Optional verification to inspect remaining rows that still differ
SELECT
    'tenants' AS table_name,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE admin_email IS NOT NULL) AS with_email,
    COUNT(*) FILTER (WHERE admin_email <> LOWER(TRIM(admin_email))) AS remaining_mismatches
FROM tenants
UNION ALL
SELECT
    'tenant_users' AS table_name,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE email IS NOT NULL) AS with_email,
    COUNT(*) FILTER (WHERE email <> LOWER(TRIM(email))) AS remaining_mismatches
FROM tenant_users;
