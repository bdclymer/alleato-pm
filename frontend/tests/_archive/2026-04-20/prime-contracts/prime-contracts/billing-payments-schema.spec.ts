import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E Tests for Contract Billing & Payments Schema
 * Tests: Task 1.4 - Database Schema - Billing & Payments
 *
 * Requirements:
 * - Create billing period and verify auto-calculated fields
 * - Create payment records with status workflow
 * - Verify unique constraints on period_number and payment_number
 * - Verify date range constraints
 * - Verify retention calculations
 * - Verify payment approval workflow
 * - Verify cascade delete behavior
 * - Verify RLS policies
 * - Verify status constraints
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('Contract Billing & Payments Schema', () => {
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

    // Create a test contract for billing and payments
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-BILLING-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: 'Test Contract for Billing & Payments',
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
    // Clean up test contract (will cascade delete billing periods and payments)
    if (testContractId) {
      await supabaseAdmin
        .from('prime_contracts')
        .delete()
        .eq('id', testContractId);
    }

    // Sign out
    await supabase.auth.signOut();
  });

  test('should create billing period and verify auto-calculated fields', async () => {
    const billingPeriodData = {
      contract_id: testContractId,
      period_number: 1,
      billing_date: '2025-01-31',
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      work_completed: 25000.00,
      stored_materials: 5000.00,
      retention_percentage: 10.00,
      retention_amount: 3000.00,
      status: 'draft' as const,
    };

    // Insert billing period
    const { data: billingPeriod, error: insertError } = await supabase
      .from('contract_billing_periods')
      .insert(billingPeriodData)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(billingPeriod).toBeTruthy();
    expect(billingPeriod?.contract_id).toBe(testContractId);
    expect(billingPeriod?.period_number).toBe(1);
    expect(billingPeriod?.billing_date).toBe('2025-01-31');
    expect(billingPeriod?.start_date).toBe('2025-01-01');
    expect(billingPeriod?.end_date).toBe('2025-01-31');
    expect(Number(billingPeriod?.work_completed)).toBe(25000.00);
    expect(Number(billingPeriod?.stored_materials)).toBe(5000.00);
    expect(Number(billingPeriod?.retention_percentage)).toBe(10.00);
    expect(Number(billingPeriod?.retention_amount)).toBe(3000.00);

    // Verify auto-calculated current_payment_due (work_completed + stored_materials)
    expect(Number(billingPeriod?.current_payment_due)).toBe(30000.00);

    // Verify auto-calculated net_payment_due (current_payment_due - retention_amount)
    expect(Number(billingPeriod?.net_payment_due)).toBe(27000.00);

    expect(billingPeriod?.status).toBe('draft');

    // Cleanup
    if (billingPeriod?.id) {
      await supabaseAdmin.from('contract_billing_periods').delete().eq('id', billingPeriod.id);
    }
  });

  test('should recalculate auto-calculated fields when values updated', async () => {
    // Create billing period
    const { data: billingPeriod } = await supabase
      .from('contract_billing_periods')
      .insert({
        contract_id: testContractId,
        period_number: 2,
        billing_date: '2025-02-28',
        start_date: '2025-02-01',
        end_date: '2025-02-28',
        work_completed: 10000.00,
        stored_materials: 2000.00,
        retention_amount: 1200.00,
      })
      .select()
      .single();

    expect(billingPeriod).toBeTruthy();
    expect(Number(billingPeriod!.current_payment_due)).toBe(12000.00);
    expect(Number(billingPeriod!.net_payment_due)).toBe(10800.00);

    // Update work_completed
    const { data: updated1 } = await supabase
      .from('contract_billing_periods')
      .update({ work_completed: 15000.00 })
      .eq('id', billingPeriod!.id)
      .select()
      .single();

    expect(updated1).toBeTruthy();
    expect(Number(updated1!.work_completed)).toBe(15000.00);
    expect(Number(updated1!.current_payment_due)).toBe(17000.00); // 15000 + 2000
    expect(Number(updated1!.net_payment_due)).toBe(15800.00); // 17000 - 1200

    // Update retention_amount
    const { data: updated2 } = await supabase
      .from('contract_billing_periods')
      .update({ retention_amount: 1700.00 })
      .eq('id', billingPeriod!.id)
      .select()
      .single();

    expect(updated2).toBeTruthy();
    expect(Number(updated2!.retention_amount)).toBe(1700.00);
    expect(Number(updated2!.net_payment_due)).toBe(15300.00); // 17000 - 1700

    // Cleanup
    if (billingPeriod?.id) {
      await supabaseAdmin.from('contract_billing_periods').delete().eq('id', billingPeriod.id);
    }
  });

  test('should verify unique constraint on period_number per contract', async () => {
    // Create first billing period
    const { data: period1 } = await supabase
      .from('contract_billing_periods')
      .insert({
        contract_id: testContractId,
        period_number: 10,
        billing_date: '2025-01-31',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        work_completed: 10000.00,
      })
      .select()
      .single();

    expect(period1).toBeTruthy();

    // Try to create duplicate period number in same contract
    const { data: period2, error: duplicateError } = await supabase
      .from('contract_billing_periods')
      .insert({
        contract_id: testContractId,
        period_number: 10, // Same period number
        billing_date: '2025-02-28',
        start_date: '2025-02-01',
        end_date: '2025-02-28',
        work_completed: 15000.00,
      })
      .select()
      .single();

    // Should fail due to unique constraint
    expect(duplicateError).toBeTruthy();
    expect(duplicateError?.code).toBe('23505'); // Unique violation
    expect(period2).toBeNull();

    // Cleanup
    if (period1?.id) {
      await supabaseAdmin.from('contract_billing_periods').delete().eq('id', period1.id);
    }
  });

  test('should verify date range constraint', async () => {
    // Try to create billing period with end_date before start_date
    const { data: invalidRange, error: rangeError } = await supabaseAdmin
      .from('contract_billing_periods')
      .insert({
        contract_id: testContractId,
        period_number: 20,
        billing_date: '2025-01-31',
        start_date: '2025-01-31',
        end_date: '2025-01-01', // End before start
        work_completed: 10000.00,
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(rangeError).toBeTruthy();
    expect(invalidRange).toBeNull();
  });

  test('should verify billing_date constraint', async () => {
    // Try to create billing period with billing_date before start_date
    const { data: invalidBilling, error: billingError } = await supabaseAdmin
      .from('contract_billing_periods')
      .insert({
        contract_id: testContractId,
        period_number: 21,
        billing_date: '2024-12-31', // Before start_date
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        work_completed: 10000.00,
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(billingError).toBeTruthy();
    expect(invalidBilling).toBeNull();
  });

  test('should create payment and verify all fields', async () => {
    const paymentData = {
      contract_id: testContractId,
      payment_number: 'PAY-001',
      payment_date: '2025-01-31',
      amount: 27000.00,
      payment_type: 'progress' as const,
      status: 'pending' as const,
      reference_number: 'REF-12345',
    };

    // Insert payment
    const { data: payment, error: insertError } = await supabase
      .from('contract_payments')
      .insert(paymentData)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(payment).toBeTruthy();
    expect(payment?.contract_id).toBe(testContractId);
    expect(payment?.payment_number).toBe('PAY-001');
    expect(payment?.payment_date).toBe('2025-01-31');
    expect(Number(payment?.amount)).toBe(27000.00);
    expect(payment?.payment_type).toBe('progress');
    expect(payment?.status).toBe('pending');
    expect(payment?.reference_number).toBe('REF-12345');
    expect(payment?.approved_by).toBeNull();
    expect(payment?.approved_date).toBeNull();
    expect(payment?.paid_date).toBeNull();

    // Cleanup
    if (payment?.id) {
      await supabaseAdmin.from('contract_payments').delete().eq('id', payment.id);
    }
  });

  test('should update payment status from pending to approved', async () => {
    // Create pending payment
    const { data: payment } = await supabase
      .from('contract_payments')
      .insert({
        contract_id: testContractId,
        payment_number: 'PAY-002',
        payment_date: '2025-01-31',
        amount: 15000.00,
        status: 'pending',
      })
      .select()
      .single();

    expect(payment).toBeTruthy();
    expect(payment!.status).toBe('pending');

    // Approve the payment
    const { data: approved, error: approveError } = await supabase
      .from('contract_payments')
      .update({
        status: 'approved',
        approved_by: testUserId,
        approved_date: '2025-02-01',
      })
      .eq('id', payment!.id)
      .select()
      .single();

    expect(approveError).toBeNull();
    expect(approved).toBeTruthy();
    expect(approved!.status).toBe('approved');
    expect(approved!.approved_by).toBe(testUserId);
    expect(approved!.approved_date).toBe('2025-02-01');
    expect(approved!.paid_date).toBeNull();

    // Cleanup
    if (payment?.id) {
      await supabaseAdmin.from('contract_payments').delete().eq('id', payment.id);
    }
  });

  test('should update payment status from approved to paid', async () => {
    // Create approved payment
    const { data: payment } = await supabase
      .from('contract_payments')
      .insert({
        contract_id: testContractId,
        payment_number: 'PAY-003',
        payment_date: '2025-01-31',
        amount: 20000.00,
        status: 'approved',
        approved_by: testUserId,
        approved_date: '2025-02-01',
      })
      .select()
      .single();

    expect(payment).toBeTruthy();
    expect(payment!.status).toBe('approved');

    // Mark as paid
    const { data: paid, error: paidError } = await supabase
      .from('contract_payments')
      .update({
        status: 'paid',
        paid_date: '2025-02-05',
        check_number: 'CHK-98765',
      })
      .eq('id', payment!.id)
      .select()
      .single();

    expect(paidError).toBeNull();
    expect(paid).toBeTruthy();
    expect(paid!.status).toBe('paid');
    expect(paid!.paid_date).toBe('2025-02-05');
    expect(paid!.check_number).toBe('CHK-98765');

    // Cleanup
    if (payment?.id) {
      await supabaseAdmin.from('contract_payments').delete().eq('id', payment.id);
    }
  });

  test('should verify unique constraint on payment_number per contract', async () => {
    // Create first payment
    const { data: pay1 } = await supabase
      .from('contract_payments')
      .insert({
        contract_id: testContractId,
        payment_number: 'PAY-UNIQUE-001',
        payment_date: '2025-01-31',
        amount: 10000.00,
      })
      .select()
      .single();

    expect(pay1).toBeTruthy();

    // Try to create duplicate payment number in same contract
    const { data: pay2, error: duplicateError } = await supabase
      .from('contract_payments')
      .insert({
        contract_id: testContractId,
        payment_number: 'PAY-UNIQUE-001', // Same number
        payment_date: '2025-02-28',
        amount: 15000.00,
      })
      .select()
      .single();

    // Should fail due to unique constraint
    expect(duplicateError).toBeTruthy();
    expect(duplicateError?.code).toBe('23505'); // Unique violation
    expect(pay2).toBeNull();

    // Cleanup
    if (pay1?.id) {
      await supabaseAdmin.from('contract_payments').delete().eq('id', pay1.id);
    }
  });

  test('should link payment to billing period', async () => {
    // Create billing period
    const { data: billingPeriod } = await supabase
      .from('contract_billing_periods')
      .insert({
        contract_id: testContractId,
        period_number: 30,
        billing_date: '2025-03-31',
        start_date: '2025-03-01',
        end_date: '2025-03-31',
        work_completed: 20000.00,
        retention_amount: 2000.00,
      })
      .select()
      .single();

    expect(billingPeriod).toBeTruthy();

    // Create payment linked to billing period
    const { data: payment, error: insertError } = await supabase
      .from('contract_payments')
      .insert({
        contract_id: testContractId,
        billing_period_id: billingPeriod!.id,
        payment_number: 'PAY-LINKED-001',
        payment_date: '2025-04-05',
        amount: 18000.00, // net_payment_due from billing period
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(payment).toBeTruthy();
    expect(payment?.billing_period_id).toBe(billingPeriod!.id);

    // Cleanup
    if (payment?.id) {
      await supabaseAdmin.from('contract_payments').delete().eq('id', payment.id);
    }
    if (billingPeriod?.id) {
      await supabaseAdmin.from('contract_billing_periods').delete().eq('id', billingPeriod.id);
    }
  });

  test('should handle billing period delete with SET NULL on payment', async () => {
    // Create billing period
    const { data: billingPeriod } = await supabase
      .from('contract_billing_periods')
      .insert({
        contract_id: testContractId,
        period_number: 31,
        billing_date: '2025-04-30',
        start_date: '2025-04-01',
        end_date: '2025-04-30',
        work_completed: 25000.00,
      })
      .select()
      .single();

    expect(billingPeriod).toBeTruthy();

    // Create payment linked to billing period
    const { data: payment } = await supabase
      .from('contract_payments')
      .insert({
        contract_id: testContractId,
        billing_period_id: billingPeriod!.id,
        payment_number: 'PAY-SET-NULL',
        payment_date: '2025-05-01',
        amount: 25000.00,
      })
      .select()
      .single();

    expect(payment).toBeTruthy();
    expect(payment!.billing_period_id).toBe(billingPeriod!.id);

    // Delete billing period
    await supabaseAdmin
      .from('contract_billing_periods')
      .delete()
      .eq('id', billingPeriod!.id);

    // Verify payment still exists but billing_period_id is set to null
    const { data: updatedPayment } = await supabase
      .from('contract_payments')
      .select()
      .eq('id', payment!.id)
      .single();

    expect(updatedPayment).toBeTruthy();
    expect(updatedPayment!.billing_period_id).toBeNull();

    // Cleanup
    if (payment?.id) {
      await supabaseAdmin.from('contract_payments').delete().eq('id', payment.id);
    }
  });

  test('should verify cascade delete when contract deleted', async () => {
    // Create temporary contract
    const { data: tempContract } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-CASCADE-BILLING-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: 'Cascade Delete Test Contract',
        original_contract_value: 50000,
        revised_contract_value: 50000,
        status: 'active',
      })
      .select()
      .single();

    expect(tempContract).toBeTruthy();

    // Create billing periods
    const { data: billingPeriods } = await supabase
      .from('contract_billing_periods')
      .insert([
        {
          contract_id: tempContract!.id,
          period_number: 1,
          billing_date: '2025-01-31',
          start_date: '2025-01-01',
          end_date: '2025-01-31',
          work_completed: 10000.00,
        },
        {
          contract_id: tempContract!.id,
          period_number: 2,
          billing_date: '2025-02-28',
          start_date: '2025-02-01',
          end_date: '2025-02-28',
          work_completed: 15000.00,
        },
      ])
      .select();

    expect(billingPeriods).toBeTruthy();
    expect(billingPeriods?.length).toBe(2);

    // Create payments
    const { data: payments } = await supabase
      .from('contract_payments')
      .insert([
        {
          contract_id: tempContract!.id,
          payment_number: 'PAY-CASCADE-1',
          payment_date: '2025-02-05',
          amount: 10000.00,
        },
        {
          contract_id: tempContract!.id,
          payment_number: 'PAY-CASCADE-2',
          payment_date: '2025-03-05',
          amount: 15000.00,
        },
      ])
      .select();

    expect(payments).toBeTruthy();
    expect(payments?.length).toBe(2);

    // Delete contract
    const { error: deleteError } = await supabaseAdmin
      .from('prime_contracts')
      .delete()
      .eq('id', tempContract!.id);

    expect(deleteError).toBeNull();

    // Verify billing periods were cascade deleted
    const { data: remainingPeriods } = await supabaseAdmin
      .from('contract_billing_periods')
      .select()
      .eq('contract_id', tempContract!.id);

    expect(remainingPeriods).toBeTruthy();
    expect(remainingPeriods?.length).toBe(0);

    // Verify payments were cascade deleted
    const { data: remainingPayments } = await supabaseAdmin
      .from('contract_payments')
      .select()
      .eq('contract_id', tempContract!.id);

    expect(remainingPayments).toBeTruthy();
    expect(remainingPayments?.length).toBe(0);
  });

  test('should verify RLS policies block unauthorized access', async () => {
    // Create billing period
    const { data: billingPeriod } = await supabase
      .from('contract_billing_periods')
      .insert({
        contract_id: testContractId,
        period_number: 40,
        billing_date: '2025-05-31',
        start_date: '2025-05-01',
        end_date: '2025-05-31',
        work_completed: 10000.00,
      })
      .select()
      .single();

    expect(billingPeriod).toBeTruthy();

    // Create payment
    const { data: payment } = await supabase
      .from('contract_payments')
      .insert({
        contract_id: testContractId,
        payment_number: 'PAY-RLS-001',
        payment_date: '2025-06-05',
        amount: 10000.00,
      })
      .select()
      .single();

    expect(payment).toBeTruthy();

    // Create unauthenticated client
    const unauthClient = createClient(supabaseUrl, supabaseAnonKey);

    // Try to access billing period without authentication
    const { data: unauthorizedPeriod } = await unauthClient
      .from('contract_billing_periods')
      .select()
      .eq('id', billingPeriod!.id);

    // Should return empty array due to RLS
    expect(unauthorizedPeriod?.length || 0).toBe(0);

    // Try to access payment without authentication
    const { data: unauthorizedPayment } = await unauthClient
      .from('contract_payments')
      .select()
      .eq('id', payment!.id);

    // Should return empty array due to RLS
    expect(unauthorizedPayment?.length || 0).toBe(0);

    // Cleanup
    if (payment?.id) {
      await supabaseAdmin.from('contract_payments').delete().eq('id', payment.id);
    }
    if (billingPeriod?.id) {
      await supabaseAdmin.from('contract_billing_periods').delete().eq('id', billingPeriod.id);
    }
  });

  test('should verify billing period status check constraint', async () => {
    // Try to create billing period with invalid status
    const { data: invalidStatus, error: statusError } = await supabaseAdmin
      .from('contract_billing_periods')
      .insert({
        contract_id: testContractId,
        period_number: 50,
        billing_date: '2025-06-30',
        start_date: '2025-06-01',
        end_date: '2025-06-30',
        work_completed: 10000.00,
        status: 'invalid_status' as unknown,
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(statusError).toBeTruthy();
    expect(invalidStatus).toBeNull();
  });

  test('should verify payment status check constraint', async () => {
    // Try to create payment with invalid status
    const { data: invalidStatus, error: statusError } = await supabaseAdmin
      .from('contract_payments')
      .insert({
        contract_id: testContractId,
        payment_number: 'PAY-INVALID-STATUS',
        payment_date: '2025-06-30',
        amount: 10000.00,
        status: 'invalid_status' as unknown,
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(statusError).toBeTruthy();
    expect(invalidStatus).toBeNull();
  });

  test('should verify updated_at trigger works for billing periods', async () => {
    // Create billing period
    const { data: billingPeriod } = await supabase
      .from('contract_billing_periods')
      .insert({
        contract_id: testContractId,
        period_number: 60,
        billing_date: '2025-07-31',
        start_date: '2025-07-01',
        end_date: '2025-07-31',
        work_completed: 10000.00,
      })
      .select()
      .single();

    expect(billingPeriod).toBeTruthy();
    const originalUpdatedAt = billingPeriod!.updated_at;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update billing period
    const { data: updated } = await supabase
      .from('contract_billing_periods')
      .update({ work_completed: 15000.00 })
      .eq('id', billingPeriod!.id)
      .select()
      .single();

    expect(updated).toBeTruthy();
    expect(updated!.updated_at).not.toBe(originalUpdatedAt);
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());

    // Cleanup
    if (billingPeriod?.id) {
      await supabaseAdmin.from('contract_billing_periods').delete().eq('id', billingPeriod.id);
    }
  });

  test('should verify updated_at trigger works for payments', async () => {
    // Create payment
    const { data: payment } = await supabase
      .from('contract_payments')
      .insert({
        contract_id: testContractId,
        payment_number: 'PAY-UPDATE-TRIGGER',
        payment_date: '2025-07-31',
        amount: 10000.00,
      })
      .select()
      .single();

    expect(payment).toBeTruthy();
    const originalUpdatedAt = payment!.updated_at;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update payment
    const { data: updated } = await supabase
      .from('contract_payments')
      .update({ amount: 15000.00 })
      .eq('id', payment!.id)
      .select()
      .single();

    expect(updated).toBeTruthy();
    expect(updated!.updated_at).not.toBe(originalUpdatedAt);
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());

    // Cleanup
    if (payment?.id) {
      await supabaseAdmin.from('contract_payments').delete().eq('id', payment.id);
    }
  });

  test('should support different payment types', async () => {
    const paymentTypes = ['progress', 'retention', 'final', 'advance'] as const;

    for (const paymentType of paymentTypes) {
      const { data: payment, error } = await supabase
        .from('contract_payments')
        .insert({
          contract_id: testContractId,
          payment_number: `PAY-TYPE-${paymentType.toUpperCase()}`,
          payment_date: '2025-08-01',
          amount: 5000.00,
          payment_type: paymentType,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(payment).toBeTruthy();
      expect(payment?.payment_type).toBe(paymentType);

      // Cleanup
      if (payment?.id) {
        await supabaseAdmin.from('contract_payments').delete().eq('id', payment.id);
      }
    }
  });

  test('should verify retention percentage constraint', async () => {
    // Try to create billing period with retention percentage > 100
    const { data: invalidRetention, error: retentionError } = await supabaseAdmin
      .from('contract_billing_periods')
      .insert({
        contract_id: testContractId,
        period_number: 70,
        billing_date: '2025-08-31',
        start_date: '2025-08-01',
        end_date: '2025-08-31',
        work_completed: 10000.00,
        retention_percentage: 150.00, // Invalid: > 100
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(retentionError).toBeTruthy();
    expect(invalidRetention).toBeNull();
  });

  test('should verify payment amount constraint', async () => {
    // Try to create payment with zero or negative amount
    const { data: invalidAmount, error: amountError } = await supabaseAdmin
      .from('contract_payments')
      .insert({
        contract_id: testContractId,
        payment_number: 'PAY-INVALID-AMOUNT',
        payment_date: '2025-08-31',
        amount: 0, // Invalid: must be > 0
      })
      .select()
      .single();

    // Should fail due to check constraint
    expect(amountError).toBeTruthy();
    expect(invalidAmount).toBeNull();
  });
});
