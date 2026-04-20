import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E Tests for Contract Line Items Schema
 * Tests: Task 1.2 - Database Schema - Contract Line Items
 *
 * Requirements:
 * - Create line items and verify total_cost auto-calculation
 * - Verify line_number uniqueness per contract
 * - Verify cascade delete when contract deleted
 * - Verify cost_code relationship
 * - Verify RLS policies
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('Contract Line Items Schema', () => {
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

    // Create a test contract for line items
    const { data: contract } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-LINE-ITEMS-${Date.now()}`,
        title: 'Test Contract for Line Items',
        original_contract_value: 0,
        revised_contract_value: 0,
        status: 'draft',
      })
      .select()
      .single();

    if (!contract) {
      throw new Error('Failed to create test contract');
    }

    testContractId = contract.id;
  });

  test.afterAll(async () => {
    // Clean up test contract (will cascade delete line items)
    if (testContractId) {
      await supabaseAdmin
        .from('prime_contracts')
        .delete()
        .eq('id', testContractId);
    }

    // Sign out
    await supabase.auth.signOut();
  });

  test('should create line item and verify total_cost auto-calculation', async () => {
    const lineItemData = {
      contract_id: testContractId,
      line_number: 1,
      description: 'Test Line Item',
      quantity: 10.5,
      unit_of_measure: 'EA',
      unit_cost: 25.50,
    };

    // Insert line item
    const { data: lineItem, error: insertError } = await supabase
      .from('contract_line_items')
      .insert(lineItemData)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(lineItem).toBeTruthy();
    expect(lineItem?.contract_id).toBe(testContractId);
    expect(lineItem?.line_number).toBe(1);
    expect(lineItem?.description).toBe('Test Line Item');
    expect(Number(lineItem?.quantity)).toBe(10.5);
    expect(lineItem?.unit_of_measure).toBe('EA');
    expect(Number(lineItem?.unit_cost)).toBe(25.50);

    // Verify auto-calculated total_cost
    const expectedTotal = 10.5 * 25.50; // = 267.75
    expect(Number(lineItem?.total_cost)).toBeCloseTo(expectedTotal, 2);

    // Cleanup
    if (lineItem?.id) {
      await supabaseAdmin.from('contract_line_items').delete().eq('id', lineItem.id);
    }
  });

  test('should update quantity and verify total_cost recalculates', async () => {
    // Create line item
    const { data: lineItem } = await supabase
      .from('contract_line_items')
      .insert({
        contract_id: testContractId,
        line_number: 2,
        description: 'Update Test Line Item',
        quantity: 5,
        unit_cost: 10.00,
      })
      .select()
      .single();

    expect(lineItem).toBeTruthy();
    expect(Number(lineItem!.total_cost)).toBe(50.00);

    // Update quantity
    const { data: updated } = await supabase
      .from('contract_line_items')
      .update({ quantity: 8 })
      .eq('id', lineItem!.id)
      .select()
      .single();

    expect(updated).toBeTruthy();
    expect(Number(updated!.quantity)).toBe(8);
    expect(Number(updated!.total_cost)).toBe(80.00);

    // Update unit_cost
    const { data: updated2 } = await supabase
      .from('contract_line_items')
      .update({ unit_cost: 15.00 })
      .eq('id', lineItem!.id)
      .select()
      .single();

    expect(updated2).toBeTruthy();
    expect(Number(updated2!.unit_cost)).toBe(15.00);
    expect(Number(updated2!.total_cost)).toBe(120.00); // 8 * 15

    // Cleanup
    if (lineItem?.id) {
      await supabaseAdmin.from('contract_line_items').delete().eq('id', lineItem.id);
    }
  });

  test('should verify line_number uniqueness per contract', async () => {
    // Create first line item
    const { data: lineItem1 } = await supabase
      .from('contract_line_items')
      .insert({
        contract_id: testContractId,
        line_number: 10,
        description: 'First Line Item',
        quantity: 1,
        unit_cost: 100,
      })
      .select()
      .single();

    expect(lineItem1).toBeTruthy();

    // Try to create duplicate line number in same contract
    const { data: lineItem2, error: duplicateError } = await supabase
      .from('contract_line_items')
      .insert({
        contract_id: testContractId,
        line_number: 10, // Same line number
        description: 'Duplicate Line Item',
        quantity: 2,
        unit_cost: 200,
      })
      .select()
      .single();

    // Should fail due to unique constraint
    expect(duplicateError).toBeTruthy();
    expect(duplicateError?.code).toBe('23505'); // Unique violation
    expect(lineItem2).toBeNull();

    // Cleanup
    if (lineItem1?.id) {
      await supabaseAdmin.from('contract_line_items').delete().eq('id', lineItem1.id);
    }
  });

  test('should allow same line_number in different contracts', async () => {
    // Create second test contract
    const { data: contract2 } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-LINE-ITEMS-2-${Date.now()}`,
        title: 'Second Test Contract',
        original_contract_value: 0,
        revised_contract_value: 0,
        status: 'draft',
      })
      .select()
      .single();

    expect(contract2).toBeTruthy();

    // Create line item in first contract
    const { data: lineItem1 } = await supabase
      .from('contract_line_items')
      .insert({
        contract_id: testContractId,
        line_number: 20,
        description: 'Line in Contract 1',
        quantity: 1,
        unit_cost: 100,
      })
      .select()
      .single();

    expect(lineItem1).toBeTruthy();

    // Create line item with same line_number in second contract (should succeed)
    const { data: lineItem2, error: insertError } = await supabase
      .from('contract_line_items')
      .insert({
        contract_id: contract2!.id,
        line_number: 20, // Same line number, different contract
        description: 'Line in Contract 2',
        quantity: 2,
        unit_cost: 200,
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(lineItem2).toBeTruthy();
    expect(lineItem2?.line_number).toBe(20);

    // Cleanup
    if (lineItem1?.id) {
      await supabaseAdmin.from('contract_line_items').delete().eq('id', lineItem1.id);
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
        contract_number: `PC-CASCADE-${Date.now()}`,
        title: 'Cascade Delete Test Contract',
        original_contract_value: 0,
        revised_contract_value: 0,
        status: 'draft',
      })
      .select()
      .single();

    expect(tempContract).toBeTruthy();

    // Create line items
    const { data: lineItems } = await supabase
      .from('contract_line_items')
      .insert([
        {
          contract_id: tempContract!.id,
          line_number: 1,
          description: 'Line 1',
          quantity: 1,
          unit_cost: 100,
        },
        {
          contract_id: tempContract!.id,
          line_number: 2,
          description: 'Line 2',
          quantity: 2,
          unit_cost: 200,
        },
      ])
      .select();

    expect(lineItems).toBeTruthy();
    expect(lineItems?.length).toBe(2);

    // Delete contract
    const { error: deleteError } = await supabaseAdmin
      .from('prime_contracts')
      .delete()
      .eq('id', tempContract!.id);

    expect(deleteError).toBeNull();

    // Verify line items were cascade deleted
    const { data: remainingItems } = await supabaseAdmin
      .from('contract_line_items')
      .select()
      .eq('contract_id', tempContract!.id);

    expect(remainingItems).toBeTruthy();
    expect(remainingItems?.length).toBe(0);
  });

  test('should verify RLS policies block unauthorized access', async () => {
    // Create line item
    const { data: lineItem } = await supabase
      .from('contract_line_items')
      .insert({
        contract_id: testContractId,
        line_number: 30,
        description: 'RLS Test Line Item',
        quantity: 1,
        unit_cost: 100,
      })
      .select()
      .single();

    expect(lineItem).toBeTruthy();

    // Create unauthenticated client
    const unauthClient = createClient(supabaseUrl, supabaseAnonKey);

    // Try to access line item without authentication
    const { data: unauthorized } = await unauthClient
      .from('contract_line_items')
      .select()
      .eq('id', lineItem!.id);

    // Should return empty array due to RLS
    expect(unauthorized?.length || 0).toBe(0);

    // Cleanup
    if (lineItem?.id) {
      await supabaseAdmin.from('contract_line_items').delete().eq('id', lineItem.id);
    }
  });

  test('should verify check constraints on quantity and unit_cost', async () => {
    // Try to create line item with negative quantity
    const { data: negativeQty, error: qtyError } = await supabaseAdmin
      .from('contract_line_items')
      .insert({
        contract_id: testContractId,
        line_number: 40,
        description: 'Negative Quantity Test',
        quantity: -5, // Negative quantity
        unit_cost: 100,
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(qtyError).toBeTruthy();
    expect(negativeQty).toBeNull();

    // Try to create line item with negative unit_cost
    const { data: negativeCost, error: costError } = await supabaseAdmin
      .from('contract_line_items')
      .insert({
        contract_id: testContractId,
        line_number: 41,
        description: 'Negative Cost Test',
        quantity: 5,
        unit_cost: -100, // Negative unit_cost
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(costError).toBeTruthy();
    expect(negativeCost).toBeNull();
  });

  test('should verify updated_at trigger works', async () => {
    // Create line item
    const { data: lineItem } = await supabase
      .from('contract_line_items')
      .insert({
        contract_id: testContractId,
        line_number: 50,
        description: 'Update Trigger Test',
        quantity: 1,
        unit_cost: 100,
      })
      .select()
      .single();

    expect(lineItem).toBeTruthy();
    const originalUpdatedAt = lineItem!.updated_at;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update line item
    const { data: updated } = await supabase
      .from('contract_line_items')
      .update({ description: 'Updated Description' })
      .eq('id', lineItem!.id)
      .select()
      .single();

    expect(updated).toBeTruthy();
    expect(updated!.updated_at).not.toBe(originalUpdatedAt);
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());

    // Cleanup
    if (lineItem?.id) {
      await supabaseAdmin.from('contract_line_items').delete().eq('id', lineItem.id);
    }
  });

  test('should handle zero quantity and unit_cost correctly', async () => {
    const { data: lineItem } = await supabase
      .from('contract_line_items')
      .insert({
        contract_id: testContractId,
        line_number: 60,
        description: 'Zero Values Test',
        quantity: 0,
        unit_cost: 0,
      })
      .select()
      .single();

    expect(lineItem).toBeTruthy();
    expect(Number(lineItem!.quantity)).toBe(0);
    expect(Number(lineItem!.unit_cost)).toBe(0);
    expect(Number(lineItem!.total_cost)).toBe(0);

    // Cleanup
    if (lineItem?.id) {
      await supabaseAdmin.from('contract_line_items').delete().eq('id', lineItem.id);
    }
  });

  test('should handle decimal precision correctly', async () => {
    const { data: lineItem } = await supabase
      .from('contract_line_items')
      .insert({
        contract_id: testContractId,
        line_number: 70,
        description: 'Decimal Precision Test',
        quantity: 12.3456, // 4 decimal places
        unit_cost: 99.99,  // 2 decimal places
      })
      .select()
      .single();

    expect(lineItem).toBeTruthy();
    expect(Number(lineItem!.quantity)).toBeCloseTo(12.3456, 4);
    expect(Number(lineItem!.unit_cost)).toBeCloseTo(99.99, 2);

    // total_cost should be calculated with proper precision
    const expectedTotal = 12.3456 * 99.99;
    expect(Number(lineItem!.total_cost)).toBeCloseTo(expectedTotal, 2);

    // Cleanup
    if (lineItem?.id) {
      await supabaseAdmin.from('contract_line_items').delete().eq('id', lineItem.id);
    }
  });
});
