import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E Tests for Supporting Tables Schema
 * Tests: Task 1.5 - Database Schema - Supporting Tables
 *
 * Requirements:
 * - Create vendor and link to contract
 * - Upload document and link to contract
 * - Create contract snapshot
 * - Create custom contract view
 * - Verify FK constraint on prime_contracts.vendor_id
 * - Verify RLS policies
 * - Verify cascade delete behavior
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('Supporting Tables Schema', () => {
  let supabase: ReturnType<typeof createClient>;
  let supabaseAdmin: ReturnType<typeof createClient>;
  let testProjectId: number;
  let testCompanyId: string; // UUID
  let testUserId: string;
  let testContractId: string;

  test.beforeAll(async () => {
    // Initialize Supabase clients
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Sign in test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123',
    });

    if (authError) {
      throw new Error(`Failed to authenticate: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('No user returned from authentication');
    }

    testUserId = authData.user.id;

    // Get test project
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('id')
      .limit(1);

    if (error) throw error;
    if (!projects || projects.length === 0) {
      throw new Error('No test project found');
    }
    testProjectId = projects[0].id;

    // Get test company
    const { data: companies, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .limit(1);

    if (companyError) throw companyError;
    if (!companies || companies.length === 0) {
      throw new Error('No test company found');
    }
    testCompanyId = companies[0].id;

    // Ensure test user is a member of the project
    await supabaseAdmin
      .from('project_members')
      .upsert({
        project_id: testProjectId,
        user_id: testUserId,
        access: 'editor',
      }, {
        onConflict: 'project_id,user_id',
      });

    // Create a test contract
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-SUPPORT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: 'Test Contract for Supporting Tables',
        original_contract_value: 100000,
        revised_contract_value: 100000,
        status: 'active',
      })
      .select()
      .single();

    if (contractError) {
      throw new Error(`Failed to create test contract: ${contractError.message}`);
    }

    if (!contract) {
      throw new Error('Failed to create test contract');
    }

    testContractId = contract.id;
  });

  test.afterAll(async () => {
    // Clean up test contract
    if (testContractId) {
      await supabaseAdmin
        .from('prime_contracts')
        .delete()
        .eq('id', testContractId);
    }

    // Sign out
    await supabase.auth.signOut();
  });

  test('should create vendor and verify all fields', async () => {
    const vendorData = {
      company_id: testCompanyId,
      name: 'Test Vendor LLC',
      contact_name: 'John Doe',
      contact_email: 'john@testvendor.com',
      contact_phone: '555-0123',
      address: '123 Main St',
      city: 'Test City',
      state: 'CA',
      zip_code: '90210',
      country: 'US',
      tax_id: '12-3456789',
      notes: 'Preferred vendor for electrical work',
      is_active: true,
    };

    const { data: vendor, error: insertError } = await supabase
      .from('vendors')
      .insert(vendorData)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(vendor).toBeTruthy();
    expect(vendor?.company_id).toBe(testCompanyId);
    expect(vendor?.name).toBe('Test Vendor LLC');
    expect(vendor?.contact_name).toBe('John Doe');
    expect(vendor?.contact_email).toBe('john@testvendor.com');
    expect(vendor?.contact_phone).toBe('555-0123');
    expect(vendor?.address).toBe('123 Main St');
    expect(vendor?.city).toBe('Test City');
    expect(vendor?.state).toBe('CA');
    expect(vendor?.zip_code).toBe('90210');
    expect(vendor?.country).toBe('US');
    expect(vendor?.tax_id).toBe('12-3456789');
    expect(vendor?.notes).toBe('Preferred vendor for electrical work');
    expect(vendor?.is_active).toBe(true);

    // Cleanup
    if (vendor?.id) {
      await supabaseAdmin.from('vendors').delete().eq('id', vendor.id);
    }
  });

  test('should link vendor to contract using FK constraint', async () => {
    // Create vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        company_id: testCompanyId,
        name: 'Contractor Inc',
      })
      .select()
      .single();

    expect(vendor).toBeTruthy();

    // Update contract to link vendor
    const { data: updated, error: updateError } = await supabase
      .from('prime_contracts')
      .update({ vendor_id: vendor!.id })
      .eq('id', testContractId)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updated).toBeTruthy();
    expect(updated!.vendor_id).toBe(vendor!.id);

    // Clear vendor_id
    await supabaseAdmin
      .from('prime_contracts')
      .update({ vendor_id: null })
      .eq('id', testContractId);

    // Cleanup
    if (vendor?.id) {
      await supabaseAdmin.from('vendors').delete().eq('id', vendor.id);
    }
  });

  test('should verify unique constraint on vendor name per company', async () => {
    // Create first vendor
    const { data: vendor1 } = await supabase
      .from('vendors')
      .insert({
        company_id: testCompanyId,
        name: 'ACME Construction',
      })
      .select()
      .single();

    expect(vendor1).toBeTruthy();

    // Try to create duplicate vendor name in same company
    const { data: vendor2, error: duplicateError } = await supabase
      .from('vendors')
      .insert({
        company_id: testCompanyId,
        name: 'ACME Construction', // Same name
      })
      .select()
      .single();

    // Should fail due to unique constraint
    expect(duplicateError).toBeTruthy();
    expect(duplicateError?.code).toBe('23505'); // Unique violation
    expect(vendor2).toBeNull();

    // Cleanup
    if (vendor1?.id) {
      await supabaseAdmin.from('vendors').delete().eq('id', vendor1.id);
    }
  });

  test('should create document and verify all fields', async () => {
    const documentData = {
      contract_id: testContractId,
      document_name: 'Contract Agreement.pdf',
      document_type: 'contract' as const,
      file_path: 'contracts/test/agreement.pdf',
      file_size: 1024000,
      mime_type: 'application/pdf',
      notes: 'Original signed contract',
    };

    const { data: document, error: insertError } = await supabase
      .from('contract_documents')
      .insert(documentData)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(document).toBeTruthy();
    expect(document?.contract_id).toBe(testContractId);
    expect(document?.document_name).toBe('Contract Agreement.pdf');
    expect(document?.document_type).toBe('contract');
    expect(document?.file_path).toBe('contracts/test/agreement.pdf');
    expect(Number(document?.file_size)).toBe(1024000);
    expect(document?.mime_type).toBe('application/pdf');
    expect(document?.version).toBe(1);
    expect(document?.is_current_version).toBe(true);
    expect(document?.notes).toBe('Original signed contract');

    // Cleanup
    if (document?.id) {
      await supabaseAdmin.from('contract_documents').delete().eq('id', document.id);
    }
  });

  test('should support all document types', async () => {
    const documentTypes = [
      'contract',
      'amendment',
      'insurance',
      'bond',
      'lien_waiver',
      'change_order',
      'invoice',
      'other',
    ] as const;

    for (const docType of documentTypes) {
      const { data: document, error } = await supabase
        .from('contract_documents')
        .insert({
          contract_id: testContractId,
          document_name: `Test ${docType}.pdf`,
          document_type: docType,
          file_path: `contracts/test/${docType}.pdf`,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(document).toBeTruthy();
      expect(document?.document_type).toBe(docType);

      // Cleanup
      if (document?.id) {
        await supabaseAdmin.from('contract_documents').delete().eq('id', document.id);
      }
    }
  });

  test('should handle document versioning', async () => {
    // Create version 1
    const { data: v1 } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: testContractId,
        document_name: 'Insurance Certificate.pdf',
        document_type: 'insurance',
        file_path: 'contracts/test/insurance_v1.pdf',
        version: 1,
        is_current_version: true,
      })
      .select()
      .single();

    expect(v1).toBeTruthy();
    expect(v1!.version).toBe(1);
    expect(v1!.is_current_version).toBe(true);

    // Mark v1 as not current
    await supabase
      .from('contract_documents')
      .update({ is_current_version: false })
      .eq('id', v1!.id);

    // Create version 2
    const { data: v2 } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: testContractId,
        document_name: 'Insurance Certificate.pdf',
        document_type: 'insurance',
        file_path: 'contracts/test/insurance_v2.pdf',
        version: 2,
        is_current_version: true,
      })
      .select()
      .single();

    expect(v2).toBeTruthy();
    expect(v2!.version).toBe(2);
    expect(v2!.is_current_version).toBe(true);

    // Cleanup
    if (v1?.id) await supabaseAdmin.from('contract_documents').delete().eq('id', v1.id);
    if (v2?.id) await supabaseAdmin.from('contract_documents').delete().eq('id', v2.id);
  });

  test('should create snapshot with JSONB data', async () => {
    const snapshotData = {
      contract_id: testContractId,
      snapshot_data: {
        contract_number: 'PC-123',
        title: 'Test Contract',
        original_value: 100000,
        revised_value: 105000,
        status: 'active',
        line_items_count: 5,
        total_change_orders: 2,
      },
      reason: 'Monthly Backup',
      notes: 'End of month snapshot',
    };

    const { data: snapshot, error: insertError } = await supabase
      .from('contract_snapshots')
      .insert(snapshotData)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(snapshot).toBeTruthy();
    expect(snapshot?.contract_id).toBe(testContractId);
    expect(snapshot?.snapshot_data).toBeTruthy();
    expect(snapshot?.snapshot_data.contract_number).toBe('PC-123');
    expect(snapshot?.snapshot_data.original_value).toBe(100000);
    expect(snapshot?.reason).toBe('Monthly Backup');
    expect(snapshot?.notes).toBe('End of month snapshot');

    // Cleanup
    if (snapshot?.id) {
      await supabaseAdmin.from('contract_snapshots').delete().eq('id', snapshot.id);
    }
  });

  test('should create custom contract view', async () => {
    const viewData = {
      user_id: testUserId,
      company_id: testCompanyId,
      view_name: 'My Active Contracts',
      description: 'All active contracts for my projects',
      filters: {
        status: ['active', 'pending'],
        min_value: 10000,
      },
      columns: {
        visible: ['contract_number', 'title', 'vendor', 'original_value', 'status'],
        order: ['contract_number', 'title', 'vendor', 'original_value', 'status'],
      },
      sort_order: {
        field: 'contract_number',
        direction: 'asc',
      },
      is_default: true,
      is_shared: false,
    };

    const { data: view, error: insertError } = await supabase
      .from('contract_views')
      .insert(viewData)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(view).toBeTruthy();
    expect(view?.user_id).toBe(testUserId);
    expect(view?.company_id).toBe(testCompanyId);
    expect(view?.view_name).toBe('My Active Contracts');
    expect(view?.description).toBe('All active contracts for my projects');
    expect(view?.filters).toBeTruthy();
    expect(view?.filters?.status).toEqual(['active', 'pending']);
    expect(view?.columns).toBeTruthy();
    expect(view?.sort_order).toBeTruthy();
    expect(view?.is_default).toBe(true);
    expect(view?.is_shared).toBe(false);

    // Cleanup
    if (view?.id) {
      await supabaseAdmin.from('contract_views').delete().eq('id', view.id);
    }
  });

  test('should verify unique constraint on view name per user', async () => {
    // Create first view
    const { data: view1 } = await supabase
      .from('contract_views')
      .insert({
        user_id: testUserId,
        company_id: testCompanyId,
        view_name: 'My Favorites',
      })
      .select()
      .single();

    expect(view1).toBeTruthy();

    // Try to create duplicate view name for same user
    const { data: view2, error: duplicateError } = await supabase
      .from('contract_views')
      .insert({
        user_id: testUserId,
        company_id: testCompanyId,
        view_name: 'My Favorites', // Same name
      })
      .select()
      .single();

    // Should fail due to unique constraint
    expect(duplicateError).toBeTruthy();
    expect(duplicateError?.code).toBe('23505'); // Unique violation
    expect(view2).toBeNull();

    // Cleanup
    if (view1?.id) {
      await supabaseAdmin.from('contract_views').delete().eq('id', view1.id);
    }
  });

  test('should verify cascade delete when contract deleted', async () => {
    // Create temporary contract
    const { data: tempContract } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-CASCADE-SUPPORT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: 'Cascade Delete Test Contract',
        original_contract_value: 50000,
        revised_contract_value: 50000,
        status: 'active',
      })
      .select()
      .single();

    expect(tempContract).toBeTruthy();

    // Create documents
    const { data: documents } = await supabase
      .from('contract_documents')
      .insert([
        {
          contract_id: tempContract!.id,
          document_name: 'Doc 1.pdf',
          document_type: 'contract',
          file_path: 'test/doc1.pdf',
        },
        {
          contract_id: tempContract!.id,
          document_name: 'Doc 2.pdf',
          document_type: 'invoice',
          file_path: 'test/doc2.pdf',
        },
      ])
      .select();

    expect(documents).toBeTruthy();
    expect(documents?.length).toBe(2);

    // Create snapshot
    const { data: snapshot } = await supabase
      .from('contract_snapshots')
      .insert({
        contract_id: tempContract!.id,
        snapshot_data: { test: 'data' },
      })
      .select()
      .single();

    expect(snapshot).toBeTruthy();

    // Delete contract
    const { error: deleteError } = await supabaseAdmin
      .from('prime_contracts')
      .delete()
      .eq('id', tempContract!.id);

    expect(deleteError).toBeNull();

    // Verify documents were cascade deleted
    const { data: remainingDocs } = await supabaseAdmin
      .from('contract_documents')
      .select()
      .eq('contract_id', tempContract!.id);

    expect(remainingDocs).toBeTruthy();
    expect(remainingDocs?.length).toBe(0);

    // Verify snapshots were cascade deleted
    const { data: remainingSnapshots } = await supabaseAdmin
      .from('contract_snapshots')
      .select()
      .eq('contract_id', tempContract!.id);

    expect(remainingSnapshots).toBeTruthy();
    expect(remainingSnapshots?.length).toBe(0);
  });

  test('should verify RLS policies block unauthorized access', async () => {
    // Create vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        company_id: testCompanyId,
        name: 'RLS Test Vendor',
      })
      .select()
      .single();

    expect(vendor).toBeTruthy();

    // Create document
    const { data: document } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: testContractId,
        document_name: 'RLS Test.pdf',
        document_type: 'contract',
        file_path: 'test/rls.pdf',
      })
      .select()
      .single();

    expect(document).toBeTruthy();

    // Create unauthenticated client
    const unauthClient = createClient(supabaseUrl, supabaseAnonKey);

    // Try to access vendor without authentication
    const { data: unauthorizedVendor } = await unauthClient
      .from('vendors')
      .select()
      .eq('id', vendor!.id);

    // Should return empty array due to RLS
    expect(unauthorizedVendor?.length || 0).toBe(0);

    // Try to access document without authentication
    const { data: unauthorizedDoc } = await unauthClient
      .from('contract_documents')
      .select()
      .eq('id', document!.id);

    // Should return empty array due to RLS
    expect(unauthorizedDoc?.length || 0).toBe(0);

    // Cleanup
    if (vendor?.id) {
      await supabaseAdmin.from('vendors').delete().eq('id', vendor.id);
    }
    if (document?.id) {
      await supabaseAdmin.from('contract_documents').delete().eq('id', document.id);
    }
  });

  test('should verify vendor SET NULL on delete', async () => {
    // Create vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        company_id: testCompanyId,
        name: 'Temp Vendor',
      })
      .select()
      .single();

    expect(vendor).toBeTruthy();

    // Link vendor to contract
    await supabaseAdmin
      .from('prime_contracts')
      .update({ vendor_id: vendor!.id })
      .eq('id', testContractId);

    // Verify link
    const { data: linked } = await supabase
      .from('prime_contracts')
      .select()
      .eq('id', testContractId)
      .single();

    expect(linked?.vendor_id).toBe(vendor!.id);

    // Delete vendor
    await supabaseAdmin
      .from('vendors')
      .delete()
      .eq('id', vendor!.id);

    // Verify vendor_id was set to null
    const { data: afterDelete } = await supabase
      .from('prime_contracts')
      .select()
      .eq('id', testContractId)
      .single();

    expect(afterDelete?.vendor_id).toBeNull();
  });

  test('should verify updated_at trigger for vendors', async () => {
    // Create vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        company_id: testCompanyId,
        name: 'Update Test Vendor',
      })
      .select()
      .single();

    expect(vendor).toBeTruthy();
    const originalUpdatedAt = vendor!.updated_at;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update vendor
    const { data: updated } = await supabase
      .from('vendors')
      .update({ contact_name: 'Jane Doe' })
      .eq('id', vendor!.id)
      .select()
      .single();

    expect(updated).toBeTruthy();
    expect(updated!.updated_at).not.toBe(originalUpdatedAt);
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());

    // Cleanup
    if (vendor?.id) {
      await supabaseAdmin.from('vendors').delete().eq('id', vendor.id);
    }
  });

  test('should verify updated_at trigger for documents', async () => {
    // Create document
    const { data: document } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: testContractId,
        document_name: 'Update Test.pdf',
        document_type: 'contract',
        file_path: 'test/update.pdf',
      })
      .select()
      .single();

    expect(document).toBeTruthy();
    const originalUpdatedAt = document!.updated_at;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update document
    const { data: updated } = await supabase
      .from('contract_documents')
      .update({ notes: 'Updated notes' })
      .eq('id', document!.id)
      .select()
      .single();

    expect(updated).toBeTruthy();
    expect(updated!.updated_at).not.toBe(originalUpdatedAt);
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());

    // Cleanup
    if (document?.id) {
      await supabaseAdmin.from('contract_documents').delete().eq('id', document.id);
    }
  });

  test('should verify updated_at trigger for views', async () => {
    // Create view
    const { data: view } = await supabase
      .from('contract_views')
      .insert({
        user_id: testUserId,
        company_id: testCompanyId,
        view_name: 'Update Test View',
      })
      .select()
      .single();

    expect(view).toBeTruthy();
    const originalUpdatedAt = view!.updated_at;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update view
    const { data: updated } = await supabase
      .from('contract_views')
      .update({ description: 'Updated description' })
      .eq('id', view!.id)
      .select()
      .single();

    expect(updated).toBeTruthy();
    expect(updated!.updated_at).not.toBe(originalUpdatedAt);
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());

    // Cleanup
    if (view?.id) {
      await supabaseAdmin.from('contract_views').delete().eq('id', view.id);
    }
  });
});
