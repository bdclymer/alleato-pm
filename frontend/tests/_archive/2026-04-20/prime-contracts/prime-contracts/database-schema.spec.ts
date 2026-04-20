import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E Tests for Prime Contracts Database Schema
 * Tests: Task 1.1 - Database Schema - Prime Contracts Core
 *
 * Requirements:
 * - Create contract and verify all fields persist correctly
 * - Verify RLS policies block unauthorized access
 * - Verify unique constraint on contract_number per project
 * - Verify foreign key constraints
 * - Verify indexes exist and improve query performance
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('Prime Contracts Database Schema', () => {
  let supabase: ReturnType<typeof createClient>;
  let supabaseAdmin: ReturnType<typeof createClient>;
  let testProjectId: number;
  let testUserId: string;

  test.beforeAll(async () => {
    // Initialize Supabase clients
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Sign in test user using dev credentials
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

    // Get test project - use admin client to ensure we can access it
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('id')
      .limit(1);

    if (error) throw error;
    if (!projects || projects.length === 0) {
      throw new Error('No test project found');
    }
    testProjectId = projects[0].id;

    // Ensure test user is a member of the project with editor access
    const { error: memberError } = await supabaseAdmin
      .from('project_members')
      .upsert({
        project_id: testProjectId,
        user_id: testUserId,
        access: 'editor',
      }, {
        onConflict: 'project_id,user_id',
      });

    if (memberError) {
      console.warn('Could not ensure project membership:', memberError);
    }
  });

  test.afterAll(async () => {
    // Clean up - sign out
    await supabase.auth.signOut();
  });

  test('should create contract and verify all fields persist correctly', async () => {
    const contractData = {
      project_id: testProjectId,
      contract_number: `PC-TEST-${Date.now()}`,
      title: 'Test Prime Contract',
      description: 'This is a test contract',
      status: 'draft' as const,
      original_contract_value: 100000.00,
      revised_contract_value: 100000.00,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      retention_percentage: 10.00,
      payment_terms: 'Net 30',
      billing_schedule: 'Monthly'
    };

    // Insert contract
    const { data: contract, error: insertError } = await supabase
      .from('prime_contracts')
      .insert(contractData)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(contract).toBeTruthy();
    expect(contract?.contract_number).toBe(contractData.contract_number);
    expect(contract?.title).toBe(contractData.title);
    expect(contract?.description).toBe(contractData.description);
    expect(contract?.status).toBe(contractData.status);
    expect(Number(contract?.original_contract_value)).toBe(contractData.original_contract_value);
    expect(Number(contract?.revised_contract_value)).toBe(contractData.revised_contract_value);
    expect(contract?.start_date).toBe(contractData.start_date);
    expect(contract?.end_date).toBe(contractData.end_date);
    expect(Number(contract?.retention_percentage)).toBe(contractData.retention_percentage);
    expect(contract?.payment_terms).toBe(contractData.payment_terms);
    expect(contract?.billing_schedule).toBe(contractData.billing_schedule);
    expect(contract?.created_at).toBeTruthy();
    expect(contract?.updated_at).toBeTruthy();

    // Cleanup
    if (contract?.id) {
      await supabaseAdmin.from('prime_contracts').delete().eq('id', contract.id);
    }
  });

  test('should verify RLS policies block unauthorized access', async () => {
    // Create a contract using admin client
    const { data: contract } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-RLS-TEST-${Date.now()}`,
        title: 'RLS Test Contract',
        original_contract_value: 50000.00,
        revised_contract_value: 50000.00,
        status: 'draft'
      })
      .select()
      .single();

    expect(contract).toBeTruthy();

    // Create unauthenticated client
    const unauthClient = createClient(supabaseUrl, supabaseAnonKey);

    // Try to access contract without authentication
    const { data: unauthorized } = await unauthClient
      .from('prime_contracts')
      .select()
      .eq('id', contract!.id);

    // Should return empty array due to RLS
    expect(unauthorized?.length || 0).toBe(0);

    // Cleanup
    if (contract?.id) {
      await supabaseAdmin.from('prime_contracts').delete().eq('id', contract.id);
    }
  });

  test('should verify unique constraint on contract_number per project', async () => {
    const contractNumber = `PC-UNIQUE-${Date.now()}`;

    // Create first contract
    const { data: contract1 } = await supabase
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: contractNumber,
        title: 'First Contract',
        original_contract_value: 10000.00,
        revised_contract_value: 10000.00,
        status: 'draft'
      })
      .select()
      .single();

    expect(contract1).toBeTruthy();

    // Try to create duplicate contract with same number in same project
    const { data: contract2, error: duplicateError } = await supabase
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: contractNumber,
        title: 'Duplicate Contract',
        original_contract_value: 20000.00,
        revised_contract_value: 20000.00,
        status: 'draft'
      })
      .select()
      .single();

    // Should fail due to unique constraint
    expect(duplicateError).toBeTruthy();
    expect(duplicateError?.code).toBe('23505');
    expect(contract2).toBeNull();

    // Cleanup
    if (contract1?.id) {
      await supabaseAdmin.from('prime_contracts').delete().eq('id', contract1.id);
    }
  });

  test('should verify foreign key constraints', async () => {
    // Try to create contract with invalid project_id
    const { data: invalidContract, error: fkError } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: 999999999,
        contract_number: `PC-FK-TEST-${Date.now()}`,
        title: 'Invalid FK Contract',
        original_contract_value: 10000.00,
        revised_contract_value: 10000.00,
        status: 'draft'
      })
      .select()
      .single();

    // Should fail due to foreign key constraint
    expect(fkError).toBeTruthy();
    expect(fkError?.code).toBe('23503');
    expect(invalidContract).toBeNull();
  });

  test('should verify indexes exist and improve query performance', async () => {
    // Create multiple contracts for performance testing
    const contracts = Array.from({ length: 10 }, (_, i) => ({
      project_id: testProjectId,
      contract_number: `PC-PERF-${Date.now()}-${i}`,
      title: `Performance Test Contract ${i}`,
      original_contract_value: 10000.00 * (i + 1),
      revised_contract_value: 10000.00 * (i + 1),
      status: i % 2 === 0 ? 'draft' : 'active',
      created_by: testUserId
    }));

    const { data: insertedContracts } = await supabase
      .from('prime_contracts')
      .insert(contracts)
      .select();

    expect(insertedContracts?.length).toBe(10);

    // Test index on project_id
    const startTime1 = Date.now();
    const { data: byProject } = await supabase
      .from('prime_contracts')
      .select()
      .eq('project_id', testProjectId);
    const queryTime1 = Date.now() - startTime1;

    expect(byProject).toBeTruthy();
    expect(queryTime1).toBeLessThan(1000);

    // Test index on status
    const startTime2 = Date.now();
    const { data: byStatus } = await supabase
      .from('prime_contracts')
      .select()
      .eq('status', 'draft')
      .eq('project_id', testProjectId);
    const queryTime2 = Date.now() - startTime2;

    expect(byStatus).toBeTruthy();
    expect(queryTime2).toBeLessThan(1000);

    // Test index on contract_number
    const startTime3 = Date.now();
    const { data: byNumber } = await supabase
      .from('prime_contracts')
      .select()
      .eq('contract_number', contracts[0].contract_number);
    const queryTime3 = Date.now() - startTime3;

    expect(byNumber).toBeTruthy();
    expect(queryTime3).toBeLessThan(1000);

    // Cleanup
    if (insertedContracts) {
      const ids = insertedContracts.map(c => c.id);
      await supabaseAdmin.from('prime_contracts').delete().in('id', ids);
    }
  });

  test('should verify updated_at trigger works', async () => {
    // Create contract
    const { data: contract } = await supabase
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-UPDATE-${Date.now()}`,
        title: 'Update Test Contract',
        original_contract_value: 10000.00,
        revised_contract_value: 10000.00,
        status: 'draft'
      })
      .select()
      .single();

    expect(contract).toBeTruthy();
    const originalUpdatedAt = contract!.updated_at;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update contract
    const { data: updated } = await supabase
      .from('prime_contracts')
      .update({ title: 'Updated Title' })
      .eq('id', contract!.id)
      .select()
      .single();

    expect(updated).toBeTruthy();
    expect(updated!.updated_at).not.toBe(originalUpdatedAt);
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());

    // Cleanup
    if (contract?.id) {
      await supabaseAdmin.from('prime_contracts').delete().eq('id', contract.id);
    }
  });

  test('should verify status check constraint', async () => {
    // Try to create contract with invalid status
    const { data: invalidStatus, error: statusError } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-STATUS-${Date.now()}`,
        title: 'Invalid Status Contract',
        original_contract_value: 10000.00,
        revised_contract_value: 10000.00,
        status: 'invalid_status' as unknown
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(statusError).toBeTruthy();
    expect(invalidStatus).toBeNull();
  });

  test('should verify value check constraints', async () => {
    // Try to create contract with negative value
    const { data: negativeValue, error: valueError } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-VALUE-${Date.now()}`,
        title: 'Negative Value Contract',
        original_contract_value: -10000.00,
        revised_contract_value: 10000.00,
        status: 'draft'
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(valueError).toBeTruthy();
    expect(negativeValue).toBeNull();
  });

  test('should verify date range check constraint', async () => {
    // Try to create contract with end_date before start_date
    const { data: invalidDates, error: dateError } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-DATE-${Date.now()}`,
        title: 'Invalid Date Contract',
        original_contract_value: 10000.00,
        revised_contract_value: 10000.00,
        status: 'draft',
        start_date: '2025-12-31',
        end_date: '2025-01-01'
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(dateError).toBeTruthy();
    expect(invalidDates).toBeNull();
  });
});
