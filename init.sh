#!/bin/bash
# Initialize and run the Change Orders development environment
# This script sets up the alleato-procore project for Change Orders feature development

set -e

echo "🚀 Setting up Change Orders development environment..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check for .env file in frontend
if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.local.development" ]; then
        echo "⚙️  Creating frontend/.env from .env.local.development..."
        cp frontend/.env.local.development frontend/.env
        echo "⚠️  Please verify frontend/.env contains your Supabase credentials"
    else
        echo "❌ Error: No .env file found in frontend/"
        echo "   Please create frontend/.env with your Supabase configuration"
        exit 1
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Generate Supabase types (critical for database work)
echo "🗄️  Generating Supabase types..."
cd frontend
if command -v npx &> /dev/null; then
    npm run db:types 2>/dev/null || echo "⚠️  Could not generate types - run 'npm run db:types' manually after configuring Supabase"
fi
cd ..

# Check route conflicts (prevents common errors)
echo "🔍 Checking for route conflicts..."
npm run check:routes || true

# Run quality checks
echo "✅ Running quality checks..."
cd frontend
npm run quality 2>/dev/null || echo "⚠️  Quality check had issues - review before starting development"
cd ..

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  🎉 Change Orders Development Environment Ready!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Start development servers:"
echo "    npm run dev                  # Both frontend + backend"
echo "    npm run dev:frontend         # Frontend only (port 3000)"
echo "    npm run dev:backend          # Backend only"
echo ""
echo "  Run tests:"
echo "    cd frontend && npm run test  # Playwright E2E tests"
echo "    cd frontend && npm run test:ui  # Playwright UI mode"
echo ""
echo "  Key files for Change Orders:"
echo "    frontend/src/app/(main)/[projectId]/change-orders/  # Pages"
echo "    frontend/src/app/api/projects/[projectId]/change-orders/  # API"
echo "    frontend/src/components/domain/change-orders/  # Components"
echo "    frontend/src/hooks/use-change-orders.ts  # Data hooks"
echo "    supabase/migrations/  # Database migrations"
echo ""
echo "  Documentation:"
echo "    .yokeflow/app_spec.md  # Full specification"
echo "    CLAUDE.md              # Development conventions"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Start the development servers
echo "🌐 Starting development servers..."
npm run dev
