#!/bin/bash

# =============================================================================
# SAAS FRAMEWORK - QUICK START SCRIPT
# =============================================================================
# This script helps new developers get up and running quickly

set -e  # Exit on any error

echo "🚀 SaaS Framework - Quick Start Setup"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old"
    echo "Please update to Node.js 20+ from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if PostgreSQL is available
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL detected"
else
    echo "⚠️  PostgreSQL not found in PATH"
    echo "You'll need to install PostgreSQL or use a cloud database"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Setting up environment configuration..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Environment template copied to .env"
        echo ""
        echo "⚠️  IMPORTANT: You need to edit .env with your settings:"
        echo "   - DATABASE_URL (PostgreSQL connection)"
        echo "   - JWT_SECRET (generate with: openssl rand -base64 32)"
        echo "   - SMTP settings (for email notifications)"
        echo ""
        echo "📋 Required environment variables:"
        echo "   DATABASE_URL=postgresql://user:pass@localhost:5432/dbname"
        echo "   JWT_SECRET=your-secure-random-secret"
        echo "   SMTP_HOST=smtp.gmail.com"
        echo "   SMTP_USERNAME=your-email@gmail.com"
        echo "   SMTP_PASSWORD=your-app-password"
        echo "   FROM_EMAIL=your-email@gmail.com"
        echo ""
        
        # Check if we can auto-generate JWT secret
        if command -v openssl &> /dev/null; then
            JWT_SECRET=$(openssl rand -base64 32)
            # Use sed to replace the JWT_SECRET line (cross-platform)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
            else
                # Linux
                sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
            fi
            echo "✅ Auto-generated secure JWT_SECRET"
        fi
        
        echo "Please edit .env now and then run:"
        echo "   npm run validate    # Check your configuration"
        echo "   npm run setup       # Setup database and seed data"
        echo "   npm run dev         # Start development server"
        
    else
        echo "❌ env.example template not found"
        echo "Creating basic .env file..."
        
        # Create basic .env file
        cat > .env << EOF
# Database Configuration (REQUIRED)
DATABASE_URL=postgresql://postgres:password@localhost:5432/saas_framework

# JWT Secret (REQUIRED) - Auto-generated
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "CHANGE-THIS-TO-A-SECURE-RANDOM-STRING")

# Email Configuration (REQUIRED for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Your SaaS Platform

# Server Configuration
PORT=5000
NODE_ENV=development
EOF
        echo "✅ Basic .env file created"
    fi
else
    echo "✅ Environment file (.env) already exists"
fi

echo ""
echo "🔍 Validating setup..."
npm run validate

echo ""
echo "🎉 Quick start complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env with your database and email settings"
echo "   2. npm run validate    # Verify your configuration"
echo "   3. npm run setup       # Setup database and seed data"
echo "   4. npm run dev         # Start development server"
echo ""
echo "📚 Helpful resources:"
echo "   • README.md - Complete setup guide"
echo "   • DEVELOPMENT.md - Development workflow"
echo "   • env.example - Environment variable reference"
echo ""
echo "🆘 Need help?"
echo "   • Database setup: https://www.postgresql.org/download/"
echo "   • Gmail app passwords: https://myaccount.google.com/apppasswords"
echo "   • JWT secret: openssl rand -base64 32"
echo ""
echo "✨ Happy coding!"
