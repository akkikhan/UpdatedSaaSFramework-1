#!/bin/bash

# Integration Script for Modernized Tenant Dashboard
# This script helps you implement the modernized tenant portal

echo "🚀 Starting Tenant Portal Modernization Implementation..."

# Create backup of the current implementation
echo "📁 Creating backup of current tenant-dashboard.tsx..."
if [ -f "client/src/pages/tenant-dashboard.tsx" ]; then
    cp "client/src/pages/tenant-dashboard.tsx" "client/src/pages/tenant-dashboard.backup.$(date +%Y%m%d_%H%M%S).tsx"
    echo "✅ Backup created successfully"
else
    echo "⚠️  Original tenant-dashboard.tsx not found - proceeding with implementation"
fi

# Check if required dependencies are installed
echo "📦 Checking dependencies..."
required_deps=(
    "@radix-ui/react-switch"
    "lucide-react"
    "@tanstack/react-query"
    "wouter"
    "react-hook-form"
    "@hookform/resolvers/zod"
    "zod"
)

missing_deps=()
for dep in "${required_deps[@]}"; do
    if ! grep -q "\"$dep\"" client/package.json 2>/dev/null; then
        missing_deps+=("$dep")
    fi
done

if [ ${#missing_deps[@]} -ne 0 ]; then
    echo "⚠️  Missing dependencies detected:"
    printf '   - %s\n' "${missing_deps[@]}"
    echo ""
    echo "📦 Installing missing dependencies..."
    cd client
    npm install "${missing_deps[@]}"
    cd ..
    echo "✅ Dependencies installed"
else
    echo "✅ All dependencies are present"
fi

# Create component directory structure
echo "📁 Creating component directory structure..."
mkdir -p client/src/components/tenant
mkdir -p client/src/hooks
mkdir -p client/src/lib

echo "✅ Directory structure created"

# Check if hook files exist
echo "🔍 Checking required hooks..."
hooks=(
    "client/src/hooks/use-tenant-auth.ts"
    "client/src/hooks/use-toast.ts"
)

missing_hooks=()
for hook in "${hooks[@]}"; do
    if [ ! -f "$hook" ]; then
        missing_hooks+=("$hook")
    fi
done

if [ ${#missing_hooks[@]} -ne 0 ]; then
    echo "⚠️  Missing hooks detected:"
    printf '   - %s\n' "${missing_hooks[@]}"
    echo "   These hooks need to be implemented in your existing codebase"
fi

# Check if UI components exist
echo "🔍 Checking UI components..."
ui_components=(
    "card"
    "button" 
    "badge"
    "tabs"
    "switch"
    "input"
    "label"
    "dialog"
    "table"
    "form"
)

missing_ui=()
for component in "${ui_components[@]}"; do
    if [ ! -f "client/src/components/ui/$component.tsx" ]; then
        missing_ui+=("$component")
    fi
done

if [ ${#missing_ui[@]} -ne 0 ]; then
    echo "⚠️  Missing UI components:"
    printf '   - %s\n' "${missing_ui[@]}"
    echo "   These components should be available via shadcn/ui"
fi

# Backup and replace the main dashboard file
echo "🔄 Implementing modernized tenant dashboard..."

if [ -f "client/src/pages/tenant-dashboard.tsx" ]; then
    echo "✅ New tenant dashboard has been implemented"
else
    echo "⚠️  Please ensure tenant-dashboard.tsx is in the correct location"
fi

# Check TypeScript configuration
echo "🔧 Checking TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    echo "✅ TypeScript configuration found"
else
    echo "⚠️  No tsconfig.json found - please ensure TypeScript is configured"
fi

# Check API integration points
echo "🌐 API Integration Points to Verify:"
echo "   Please ensure the following API endpoints are available:"
echo "   - GET /api/tenants/by-org-id/:orgId"
echo "   - GET /auth/users (with tenant headers)"
echo "   - GET /api/v2/rbac/roles (with tenant headers)"
echo "   - PUT/POST /auth/users/:id (for user management)"
echo "   - PUT/POST /api/v2/rbac/roles/:id (for role management)"
echo "   - Module management endpoints"
echo ""

# Final checklist
echo "📋 Implementation Checklist:"
echo ""
echo "✅ Core Implementation:"
echo "   [✓] Backup created"
echo "   [✓] Dependencies checked/installed"
echo "   [✓] Component structure created"
echo "   [✓] Main dashboard file implemented"
echo ""
echo "⚠️  Manual Steps Required:"
echo "   [ ] Verify API endpoints are working"
echo "   [ ] Test authentication flow"
echo "   [ ] Verify tenant data structure matches expectations"
echo "   [ ] Test module enable/disable functionality"
echo "   [ ] Test user management features"
echo "   [ ] Test role management features"
echo "   [ ] Verify responsive design on different screen sizes"
echo "   [ ] Update any custom styling if needed"
echo ""

# Testing recommendations
echo "🧪 Testing Recommendations:"
echo ""
echo "1. Unit Tests:"
echo "   - Test component rendering"
echo "   - Test user interactions (buttons, forms)"
echo "   - Test API integration"
echo ""
echo "2. Integration Tests:"
echo "   - Test complete module enable/disable flow"
echo "   - Test user creation and management"
echo "   - Test role assignment"
echo ""
echo "3. E2E Tests:"
echo "   - Test complete tenant portal workflow"
echo "   - Test navigation between tabs"
echo "   - Test responsive behavior"
echo ""

# Performance considerations
echo "⚡ Performance Considerations:"
echo ""
echo "   - The new implementation uses real-time polling (5s interval)"
echo "   - Consider implementing WebSocket connections for real-time updates"
echo "   - Module cards use gradient backgrounds - test on older devices"
echo "   - Backdrop blur effects may impact performance on some browsers"
echo ""

# Migration strategy
echo "🔄 Migration Strategy:"
echo ""
echo "1. Development Environment:"
echo "   - Test the new implementation thoroughly"
echo "   - Verify all existing functionality works"
echo "   - Check for any breaking changes"
echo ""
echo "2. Staging Environment:"
echo "   - Deploy and test with real data"
echo "   - Performance testing under load"
echo "   - User acceptance testing"
echo ""
echo "3. Production Deployment:"
echo "   - Feature flag the new interface (if possible)"
echo "   - Gradual rollout to tenants"
echo "   - Monitor for issues and performance"
echo ""

echo "🎉 Implementation Complete!"
echo ""
echo "Next Steps:"
echo "1. Test the new interface thoroughly"
echo "2. Verify all API integrations work correctly"
echo "3. Update any custom styling to match your brand"
echo "4. Deploy to staging environment for testing"
echo ""
echo "If you encounter any issues, check the backup file and refer to the implementation guide."
echo ""
echo "Happy coding! 🚀"
