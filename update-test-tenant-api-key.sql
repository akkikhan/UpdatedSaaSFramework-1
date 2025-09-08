-- Update test tenant API key
UPDATE tenants SET auth_api_key = 'auth_abc123def456ghi789jkl012' WHERE org_id = 'test-auth-company';

-- Verify the update
SELECT id, name, org_id, auth_api_key, status FROM tenants WHERE org_id = 'test-auth-company';
