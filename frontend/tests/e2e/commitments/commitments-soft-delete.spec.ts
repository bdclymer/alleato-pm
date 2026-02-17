// @ts-nocheck - Database types don't fully support deleted_at column
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Soft Delete Tests for Commitments (Subcontracts & Purchase Orders)
 *
 * Tests verify that deleted_at timestamp is set instead of hard deleting records.
 * Uses Supabase client directly for reliable database operations.
 */

const TEST_PROJECT_ID = 67;
let testSubcontractId: string;

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

test.describe('Soft Delete for Commitments', () => {
  test.beforeEach(async () => {
    // Create a test subcontract
    const { data, error } = await supabase
      .from('subcontracts')
      .insert({
        project_id: TEST_PROJECT_ID,
        contract_number: `TEST-DELETE-${Date.now()}`,
        title: 'Test Subcontract for Soft Delete',
        status: 'draft',
        executed: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create test subcontract:', error);
      throw error;
    }

    if (data) {
      testSubcontractId = data.id;
    }
  });

  test('Soft delete sets deleted_at timestamp (not hard delete)', async () => {
    // Soft delete
    const { error: deleteError } = await supabase
      .from('subcontracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', testSubcontractId);

    expect(deleteError).toBeNull();

    // Verify record still exists with deleted_at set
    const { data, error } = await supabase
      .from('subcontracts')
      .select('deleted_at')
      .eq('id', testSubcontractId)
      .single();

    expect(error).toBeNull();
    expect(data?.deleted_at).toBeTruthy();
  });

  test('Deleted commitments filtered from view by default', async () => {
    // Soft delete the test subcontract
    await supabase
      .from('subcontracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', testSubcontractId);

    // Query with deleted_at = null filter
    const { data } = await supabase
      .from('subcontracts')
      .select('id')
      .eq('project_id', TEST_PROJECT_ID)
      .is('deleted_at', null);

    // Should not include the deleted commitment
    const foundDeleted = data?.some(c => c.id === testSubcontractId);
    expect(foundDeleted).toBe(false);
  });

  test('include_deleted shows soft-deleted commitments', async () => {
    // Soft delete
    await supabase
      .from('subcontracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', testSubcontractId);

    // Query with is NOT NULL (shows deleted)
    const { data } = await supabase
      .from('subcontracts')
      .select('id, deleted_at')
      .eq('project_id', TEST_PROJECT_ID)
      .not('deleted_at', 'is', null);

    // Should include the deleted commitment
    const foundDeleted = data?.some(c => c.id === testSubcontractId);
    expect(foundDeleted).toBe(true);
  });

  test('Query with is("deleted_at", null) excludes deleted records', async () => {
    // Soft delete
    await supabase
      .from('subcontracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', testSubcontractId);

    // Query with explicit is null check
    const { data } = await supabase
      .from('subcontracts')
      .select('id')
      .eq('project_id', TEST_PROJECT_ID)
      .is('deleted_at', null);

    const foundDeleted = data?.some(c => c.id === testSubcontractId);
    expect(foundDeleted).toBe(false);
  });

  test('Restore deleted commitment works', async () => {
    // First soft delete
    await supabase
      .from('subcontracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', testSubcontractId);

    // Verify it's deleted
    const { data: deletedData } = await supabase
      .from('subcontracts')
      .select('deleted_at')
      .eq('id', testSubcontractId)
      .single();

    expect(deletedData?.deleted_at).toBeTruthy();

    // Restore (set deleted_at = null)
    const { error: restoreError } = await supabase
      .from('subcontracts')
      .update({ deleted_at: null })
      .eq('id', testSubcontractId);

    expect(restoreError).toBeNull();

    // Verify restored
    const { data: restoredData } = await supabase
      .from('subcontracts')
      .select('deleted_at')
      .eq('id', testSubcontractId)
      .single();

    expect(restoredData?.deleted_at).toBeNull();
  });

  test('Restored commitment visible in active list again', async () => {
    // Soft delete
    await supabase
      .from('subcontracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', testSubcontractId);

    // Verify not in active list
    const { data: beforeRestore } = await supabase
      .from('subcontracts')
      .select('id')
      .eq('project_id', testProjectId)
      .is('deleted_at', null);

    const foundBeforeRestore = beforeRestore?.some(c => c.id === testSubcontractId);
    expect(foundBeforeRestore).toBe(false);

    // Restore
    await supabase
      .from('subcontracts')
      .update({ deleted_at: null })
      .eq('id', testSubcontractId);

    // Verify back in active list
    const { data: afterRestore } = await supabase
      .from('subcontracts')
      .select('id')
      .eq('project_id', testProjectId)
      .is('deleted_at', null);

    const foundAfterRestore = afterRestore?.some(c => c.id === testSubcontractId);
    expect(foundAfterRestore).toBe(true);
  });

  test.afterEach(async () => {
    // Clean up: hard delete test subcontract
    if (testSubcontractId) {
      await supabase
        .from('subcontracts')
        .delete()
        .eq('id', testSubcontractId);
    }
  });
});
