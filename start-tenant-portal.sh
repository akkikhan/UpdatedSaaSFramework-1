#!/bin/bash

# Tenant Portal Quick Start Script
echo "================================================"
echo "🚀 Tenant Portal Quick Start"
echo "================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Check database connection
echo "🔍 Checking database connection..."
npm run db:push 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "⚠️  Database connection might have issues, but continuing..."
fi
echo ""

# Start the server
echo "🎯 Starting the development server..."
echo ""
echo "================================================"
echo "📝 TENANT PORTAL INFORMATION"
echo "================================================"
echo ""
echo "Server URL: http://localhost:5000"
echo ""
echo "Test Pages:"
echo "  - Test Portal: http://localhost:5000/test-tenant-portal.html"
echo "  - Admin Login: http://localhost:5000/admin/login"
echo ""
echo "Example Tenant Portals:"
echo "  - http://localhost:5000/tenant/test-company/login"
echo "  - http://localhost:5000/tenant/acme/login"
echo "  - http://localhost:5000/tenant/demo/login"
echo ""
echo "Default Test Credentials:"
echo "  Email: admin@test.com"
echo "  Password: TestPassword123!"
echo ""
echo "================================================"
echo "Press Ctrl+C to stop the server"
echo "================================================"
echo ""

# Start the dev server
npm run dev
