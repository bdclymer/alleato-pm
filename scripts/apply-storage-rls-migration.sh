#!/bin/bash

echo "================================================"
echo "Applying Critical Schema Fixes + Storage RLS"
echo "================================================"
echo ""
echo "CRITICAL: Discovered fundamental schema bug"
echo ""
echo "The 'people' table is missing the 'auth_user_id' column"
echo "that ALL RLS policies depend on. This affects the entire"
echo "application, not just Specifications."
echo ""
echo "This script will apply TWO migrations in order:"
echo "  1. supabase/migrations/20260201000003_add_people_auth_user_id.sql"
echo "  2. supabase/migrations/20260201000002_add_storage_rls_policies.sql"
echo ""
echo "Migration 1 MUST be applied BEFORE migration 2."
echo ""
echo "------------------------------------------------"
echo ""
read -p "Apply both migrations to remote database? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Migrations cancelled."
    exit 1
fi

echo ""
echo "================================================"
echo "Step 1/2: Adding people.auth_user_id column"
echo "================================================"
echo ""
cat supabase/migrations/20260201000003_add_people_auth_user_id.sql
echo ""
echo "------------------------------------------------"
echo ""

# Check if supabase is linked
if ! npx supabase projects list &>/dev/null; then
    echo "ERROR: Supabase CLI not linked to project."
    echo ""
    echo "Please apply manually:"
    echo "1. Open https://supabase.com/dashboard/project/lgveqfnpkxvzbnnwuled/editor"
    echo "2. Go to SQL Editor"
    echo "3. Copy and execute SQL from: supabase/migrations/20260201000003_add_people_auth_user_id.sql"
    echo "4. Then copy and execute SQL from: supabase/migrations/20260201000002_add_storage_rls_policies.sql"
    exit 1
fi

# Apply migrations
echo "Applying migration 003 (schema fix)..."
npx supabase db push

echo ""
echo "================================================"
echo "Step 2/2: Adding storage RLS policies"
echo "================================================"
echo ""
cat supabase/migrations/20260201000002_add_storage_rls_policies.sql
echo ""
echo "------------------------------------------------"
echo ""

echo "Applying migration 002 (storage RLS)..."
npx supabase db push

echo ""
echo "================================================"
echo "SUCCESS: Migrations applied successfully"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Verify test user linkage: cd frontend && node check-user-membership.js"
echo "2. Test upload: cd frontend && node test-upload.js"
echo "3. Re-run E2E tests: cd frontend && npm run test"
echo "4. Expected result: 26/26 tests passing"
