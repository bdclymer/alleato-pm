#!/bin/bash

echo "================================================"
echo "Applying Storage RLS Policies Migration"
echo "================================================"
echo ""
echo "This will apply the following migration:"
echo "  supabase/migrations/20260201000002_add_storage_rls_policies.sql"
echo ""
echo "This migration creates RLS policies to allow authenticated users"
echo "to upload files to the project-files storage bucket."
echo ""
echo "------------------------------------------------"
echo "Migration SQL:"
echo "------------------------------------------------"
cat supabase/migrations/20260201000002_add_storage_rls_policies.sql
echo ""
echo "------------------------------------------------"
echo ""
read -p "Apply this migration to remote database? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Migration cancelled."
    exit 1
fi

echo ""
echo "Applying migration..."
echo ""

# Check if supabase is linked
if ! npx supabase projects list &>/dev/null; then
    echo "Error: Supabase CLI not linked to project."
    echo ""
    echo "Please apply manually:"
    echo "1. Open https://supabase.com/dashboard/project/lgveqfnpkxvzbnnwuled/editor"
    echo "2. Go to SQL Editor"
    echo "3. Copy and execute the SQL from: supabase/migrations/20260201000002_add_storage_rls_policies.sql"
    exit 1
fi

# Apply migration
npx supabase db push

echo ""
echo "================================================"
echo "Migration applied successfully!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Verify upload works: cd frontend && node test-upload.js"
echo "2. Re-run E2E tests: cd frontend && npm run test"
echo "3. Expected result: 26/26 tests passing"
