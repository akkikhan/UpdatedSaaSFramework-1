#!/bin/bash
cd "C:\Users\Akki\Downloads\Updated Primus\UpdatedSaaSFramework-1"

# Check git status
git status

# Stage important changes (avoid build artifacts)
git add client/src/pages/tenant-dashboard.tsx
git add client/src/pages/admin-dashboard.tsx 
git add client/src/pages/sdk-integration.tsx
git add client/src/pages/tenants.tsx
git add server/routes.ts
git add AZURE_SETUP_SUMMARY.md
git add INTEGRATION_GUIDE.md

# Commit changes
git commit --no-verify -m "Final touchup: Manual edits and UI improvements"

# Push to GitHub
git push origin final-touchup

echo "Changes pushed to final-touchup branch successfully!"
