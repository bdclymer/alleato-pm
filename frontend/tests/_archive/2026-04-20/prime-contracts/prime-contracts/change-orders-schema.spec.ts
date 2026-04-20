import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E Tests for Contract Change Orders Schema
 * Tests: Task 1.3 - Database Schema - Change Orders
 *
 * Requirements:
 * - Create change order with pending status
 * - Update status from pending to approved
 * - Update status from pending to rejected
 * - Verify unique constraint on change_order_number
 * - Verify approval fields update correctly
 * - Verify RLS policies
 * - Verify status workflow constraints
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('Contract Change Orders Schema', () => {
  let supabase: ReturnType<typeof createClient>;
  let supabaseAdmin: ReturnType<typeof createClient>;
  let testProjectId: number;
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

    // Create a test contract for change orders
    const { data: contract } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-CHANGE-ORDERS-${Date.now()}`,
        title: 'Test Contract for Change Orders',
        original_contract_value: 100000,
        revised_contract_value: 100000,
        status: 'active',
      })
      .select()
      .single();

    if (!contract) {
      throw new Error('Failed to create test contract');
    }

    testContractId = contract.id;
  });

  test.afterAll(async () => {
    // Clean up test contract (will cascade delete change orders)
    if (testContractId) {
      await supabaseAdmin
        .from('prime_contracts')
        .delete()
        .eq('id', testContractId);
    }

    // Sign out
    await supabase.auth.signOut();
  });

  test('should create change order with pending status', async () => {
    const changeOrderData = {
      contract_id: testContractId,
      change_order_number: 'CO-001',
      description: 'Additional electrical work',
      amount: 5000.00,
      status: 'pending' as const,
      requested_by: testUserId,
      requested_date: '2025-01-15',
    };

    // Insert change order
    const { data: changeOrder, error: insertError } = await supabase
      .from('contract_change_orders')
      .insert(changeOrderData)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(changeOrder).toBeTruthy();
    expect(changeOrder?.contract_id).toBe(testContractId);
    expect(changeOrder?.change_order_number).toBe('CO-001');
    expect(changeOrder?.description).toBe('Additional electrical work');
    expect(Number(changeOrder?.amount)).toBe(5000.00);
    expect(changeOrder?.status).toBe('pending');
    expect(changeOrder?.requested_by).toBe(testUserId);
    expect(changeOrder?.requested_date).toBe('2025-01-15');
    expect(changeOrder?.approved_by).toBeNull();
    expect(changeOrder?.approved_date).toBeNull();
    expect(changeOrder?.rejection_reason).toBeNull();

    // Cleanup
    if (changeOrder?.id) {
      await supabaseAdmin.from('contract_change_orders').delete().eq('id', changeOrder.id);
    }
  });

  test('should update status from pending to approved', async () => {
    // Create pending change order
    const { data: changeOrder } = await supabase
      .from('contract_change_orders')
      .insert({
        contract_id: testContractId,
        change_order_number: 'CO-002',
        description: 'Upgrade materials',
        amount: 3000.00,
        status: 'pending',
        requested_by: testUserId,
      })
      .select()
      .single();

    expect(changeOrder).toBeTruthy();
    expect(changeOrder!.status).toBe('pending');

    // Approve the change order
    const { data: approved, error: approveError } = await supabase
      .from('contract_change_orders')
      .update({
        status: 'approved',
        approved_by: testUserId,
        approved_date: '2025-01-16',
      })
      .eq('id', changeOrder!.id)
      .select()
      .single();

    expect(approveError).toBeNull();
    expect(approved).toBeTruthy();
    expect(approved!.status).toBe('approved');
    expect(approved!.approved_by).toBe(testUserId);
    expect(approved!.approved_date).toBe('2025-01-16');
    expect(approved!.rejection_reason).toBeNull();

    // Cleanup
    if (changeOrder?.id) {
      await supabaseAdmin.from('contract_change_orders').delete().eq('id', changeOrder.id);
    }
  });

  test('should update status from pending to rejected with reason', async () => {
    // Create pending change order
    const { data: changeOrder } = await supabase
      .from('contract_change_orders')
      .insert({
        contract_id: testContractId,
        change_order_number: 'CO-003',
        description: 'Extra features',
        amount: 10000.00,
        status: 'pending',
        requested_by: testUserId,
      })
      .select()
      .single();

    expect(changeOrder).toBeTruthy();

    // Reject the change order
    const { data: rejected, error: rejectError } = await supabase
      .from('contract_change_orders')
      .update({
        status: 'rejected',
        approved_by: testUserId,
        approved_date: '2025-01-17',
        rejection_reason: 'Out of budget scope',
      })
      .eq('id', changeOrder!.id)
      .select()
      .single();

    expect(rejectError).toBeNull();
    expect(rejected).toBeTruthy();
    expect(rejected!.status).toBe('rejected');
    expect(rejected!.approved_by).toBe(testUserId);
    expect(rejected!.approved_date).toBe('2025-01-17');
    expect(rejected!.rejection_reason).toBe('Out of budget scope');

    // Cleanup
    if (changeOrder?.id) {
      await supabaseAdmin.from('contract_change_orders').delete().eq('id', changeOrder.id);
    }
  });

  test('should verify unique constraint on change_order_number per contract', async () => {
    // Create first change order
    const { data: co1 } = await supabase
      .from('contract_change_orders')
      .insert({
        contract_id: testContractId,
        change_order_number: 'CO-UNIQUE-001',
        description: 'First change order',
        amount: 1000.00,
        status: 'pending',
      })
      .select()
      .single();

    expect(co1).toBeTruthy();

    // Try to create duplicate change order number in same contract
    const { data: co2, error: duplicateError } = await supabase
      .from('contract_change_orders')
      .insert({
        contract_id: testContractId,
        change_order_number: 'CO-UNIQUE-001', // Same number
        description: 'Duplicate change order',
        amount: 2000.00,
        status: 'pending',
      })
      .select()
      .single();

    // Should fail due to unique constraint
    expect(duplicateError).toBeTruthy();
    expect(duplicateError?.code).toBe('23505'); // Unique violation
    expect(co2).toBeNull();

    // Cleanup
    if (co1?.id) {
      await supabaseAdmin.from('contract_change_orders').delete().eq('id', co1.id);
    }
  });

  test('should allow same change_order_number in different contracts', async () => {
    // Create second test contract
    const { data: contract2 } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-CO-2-${Date.now()}`,
        title: 'Second Test Contract',
        original_contract_value: 50000,
        revised_contract_value: 50000,
        status: 'active',
      })
      .select()
      .single();

    expect(contract2).toBeTruthy();

    // Create change order in first contract
    const { data: co1 } = await supabase
      .from('contract_change_orders')
      .insert({
        contract_id: testContractId,
        change_order_number: 'CO-MULTI-001',
        description: 'Change in Contract 1',
        amount: 1000.00,
        status: 'pending',
      })
      .select()
      .single();

    expect(co1).toBeTruthy();

    // Create change order with same number in second contract (should succeed)
    const { data: co2, error: insertError } = await supabase
      .from('contract_change_orders')
      .insert({
        contract_id: contract2!.id,
        change_order_number: 'CO-MULTI-001', // Same number, different contract
        description: 'Change in Contract 2',
        amount: 2000.00,
        status: 'pending',
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(co2).toBeTruthy();
    expect(co2?.change_order_number).toBe('CO-MULTI-001');

    // Cleanup
    if (co1?.id) {
      await supabaseAdmin.from('contract_change_orders').delete().eq('id', co1.id);
    }
    if (contract2?.id) {
      await supabaseAdmin.from('prime_contracts').delete().eq('id', contract2.id);
    }
  });

  test('should verify cascade delete when contract deleted', async () => {
    // Create temporary contract
    const { data: tempContract } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-CASCADE-CO-${Date.now()}`,
        title: 'Cascade Delete Test Contract',
        original_contract_value: 20000,
        revised_contract_value: 20000,
        status: 'active',
      })
      .select()
      .single();

    expect(tempContract).toBeTruthy();

    // Create change orders
    const { data: changeOrders } = await supabase
      .from('contract_change_orders')
      .insert([
        {
          contract_id: tempContract!.id,
          change_order_number: 'CO-CASCADE-1',
          description: 'Change 1',
          amount: 1000.00,
          status: 'pending',
        },
        {
          contract_id: tempContract!.id,
          change_order_number: 'CO-CASCADE-2',
          description: 'Change 2',
          amount: 2000.00,
          status: 'approved',
          approved_by: testUserId,
          approved_date: '2025-01-18',
        },
      ])
      .select();

    expect(changeOrders).toBeTruthy();
    expect(changeOrders?.length).toBe(2);

    // Delete contract
    const { error: deleteError } = await supabaseAdmin
      .from('prime_contracts')
      .delete()
      .eq('id', tempContract!.id);

    expect(deleteError).toBeNull();

    // Verify change orders were cascade deleted
    const { data: remainingCOs } = await supabaseAdmin
      .from('contract_change_orders')
      .select()
      .eq('contract_id', tempContract!.id);

    expect(remainingCOs).toBeTruthy();
    expect(remainingCOs?.length).toBe(0);
  });

  test('should verify RLS policies block unauthorized access', async () => {
    // Create change order
    const { data: changeOrder } = await supabase
      .from('contract_change_orders')
      .insert({
        contract_id: testContractId,
        change_order_number: 'CO-RLS-001',
        description: 'RLS Test Change Order',
        amount: 1000.00,
        status: 'pending',
      })
      .select()
      .single();

    expect(changeOrder).toBeTruthy();

    // Create unauthenticated client
    const unauthClient = createClient(supabaseUrl, supabaseAnonKey);

    // Try to access change order without authentication
    const { data: unauthorized } = await unauthClient
      .from('contract_change_orders')
      .select()
      .eq('id', changeOrder!.id);

    // Should return empty array due to RLS
    expect(unauthorized?.length || 0).toBe(0);

    // Cleanup
    if (changeOrder?.id) {
      await supabaseAdmin.from('contract_change_orders').delete().eq('id', changeOrder.id);
    }
  });

  test('should verify status check constraint', async () => {
    // Try to create change order with invalid status
    const { data: invalidStatus, error: statusError } = await supabaseAdmin
      .from('contract_change_orders')
      .insert({
        contract_id: testContractId,
        change_order_number: 'CO-INVALID-STATUS',
        description: 'Invalid Status Test',
        amount: 1000.00,
        status: 'invalid_status' as unknown,
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(statusError).toBeTruthy();
    expect(invalidStatus).toBeNull();
  });

  test('should verify updated_at trigger works', async () => {
    // Create change order
    const { data: changeOrder } = await supabase
      .from('contract_change_orders')
      .insert({
        contract_id: testContractId,
        change_order_number: 'CO-UPDATE-TRIGGER',
        description: 'Update Trigger Test',
        amount: 1000.00,
        status: 'pending',
      })
      .select()
      .single();

    expect(changeOrder).toBeTruthy();
    const originalUpdatedAt = changeOrder!.updated_at;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update change order
    const { data: updated } = await supabase
      .from('contract_change_orders')
      .update({ description: 'Updated Description' })
      .eq('id', changeOrder!.id)
      .select()
      .single();

    expect(updated).toBeTruthy();
    expect(updated!.updated_at).not.toBe(originalUpdatedAt);
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());

    // Cleanup
    if (changeOrder?.id) {
      await supabaseAdmin.from('contract_change_orders').delete().eq('id', changeOrder.id);
    }
  });

  test('should handle negative amounts for deductions', async () => {
    const { data: changeOrder } = await supabase
      .from('contract_change_orders')
      .insert({
        contract_id: testContractId,
        change_order_number: 'CO-NEGATIVE',
        description: 'Credit change order',
        amount: -2500.00, // Negative amount for deduction
        status: 'pending',
      })
      .select()
      .single();

    expect(changeOrder).toBeTruthy();
    expect(Number(changeOrder!.amount)).toBe(-2500.00);

    // Cleanup
    if (changeOrder?.id) {
      await supabaseAdmin.from('contract_change_orders').delete().eq('id', changeOrder.id);
    }
  });

  test('should use default requested_date when not provided', async () => {
    const { data: changeOrder } = await supabase
      .from('contract_change_orders')
      .insert({
        contract_id: testContractId,
        change_order_number: 'CO-DEFAULT-DATE',
        description: 'Default Date Test',
        amount: 1000.00,
        status: 'pending',
      })
      .select()
      .single();

    expect(changeOrder).toBeTruthy();
    expect(changeOrder!.requested_date).toBeTruthy();

    // Verify it's a valid date
    const requestedDate = new Date(changeOrder!.requested_date);
    expect(requestedDate).toBeInstanceOf(Date);
    expect(requestedDate.toString()).not.toBe('Invalid Date');

    // Cleanup
    if (changeOrder?.id) {
      await supabaseAdmin.from('contract_change_orders').delete().eq('id', changeOrder.id);
    }
  });
});
