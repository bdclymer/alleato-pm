import { expect, test, type APIRequestContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { join } from 'node:path';

import { createAuthenticatedRequestContext } from '../../helpers/api-auth';

test.describe('Prime Contracts - Change Orders API Routes', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const storageStatePath = join(__dirname, '../..', '.auth/user.json');
const appUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  let supabase: ReturnType<typeof createClient>;
  let supabaseAdmin: ReturnType<typeof createClient>;
  let userId: string;
  let testProjectId: number;
  let testContractId: string;
  let apiContext: APIRequestContext;
  const createdChangeOrderIds: string[] = [];

  test.beforeAll(async ({ playwright }) => {
    apiContext = await createAuthenticatedRequestContext(
      playwright,
      storageStatePath,
      appUrl,
    );

    // Initialize Supabase clients
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate
    const { data: authData, error: authError} = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_1 || 'test1@mail.com',
      password: process.env.TEST_PASSWORD_1 || 'test12026!!!',
    });

    if (authError) throw authError;

    if (!authData.user || !authData.session) {
      throw new Error('No user or session returned from authentication');
    }

    userId = authData.user.id;

    // Get a test project
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('id')
      .limit(1);

    if (error) throw error;
    if (!projects || projects.length === 0) {
      throw new Error('No test project found');
    }
    testProjectId = projects[0].id;

    // Create a test contract
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `PC-CO-TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: 'Test Contract for Change Orders',
        status: 'active',
        original_contract_value: 100000,
        revised_contract_value: 100000,
        created_by: userId,
      })
      .select('id')
      .single();

    if (contractError || !contract) {
      throw new Error(`Failed to create test contract: ${contractError?.message}`);
    }

    testContractId = contract.id;
  });

  test.afterAll(async () => {
    // Clean up: Delete all created change orders
    if (createdChangeOrderIds.length > 0) {
      await supabaseAdmin
        .from('contract_change_orders')
        .delete()
        .in('id', createdChangeOrderIds);
    }

    // Clean up: Delete test contract
    if (testContractId) {
      await supabaseAdmin
        .from('prime_contracts')
        .delete()
        .eq('id', testContractId);
    }

    await apiContext.dispose();
  });

  test('GET should return 200 with empty array when no change orders exist', async () => {
    const response = await apiContext.get(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('POST should create change order and return 201', async () => {
    const changeOrderData = {
      change_order_number: 'CO-001',
      description: 'Additional foundation work',
      amount: 5000,
      status: 'pending',
    };

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders`,
      {
        data: changeOrderData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.change_order_number).toBe(changeOrderData.change_order_number);
    expect(data.description).toBe(changeOrderData.description);
    expect(data.amount).toBe(changeOrderData.amount);
    expect(data.status).toBe('pending');
    expect(data.requested_by).toBe(userId);

    createdChangeOrderIds.push(data.id);
  });

  test('POST should return 400 for duplicate change_order_number', async () => {
    const changeOrderData = {
      change_order_number: 'CO-001', // Duplicate from previous test
      description: 'Another change order',
      amount: 3000,
    };

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders`,
      {
        data: changeOrderData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('already exists');
  });

  test('POST should return 400 for invalid data (missing required fields)', async () => {
    const invalidData = {
      description: 'Missing change_order_number',
      amount: 1000,
    };

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders`,
      {
        data: invalidData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Validation error');
  });

  test('GET should return 200 with change order data', async () => {
    const changeOrderId = createdChangeOrderIds[0];

    const response = await apiContext.get(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders/${changeOrderId}`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(changeOrderId);
    expect(data.change_order_number).toBe('CO-001');
  });

  test('GET should return 404 for non-existent change order', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await apiContext.get(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders/${nonExistentId}`,
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toContain('not found');
  });

  test('PUT should update change order and return 200', async () => {
    const changeOrderId = createdChangeOrderIds[0];
    const updateData = {
      description: 'Updated foundation work description',
      amount: 5500,
    };

    const response = await apiContext.put(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders/${changeOrderId}`,
      {
        data: updateData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.description).toBe(updateData.description);
    expect(data.amount).toBe(updateData.amount);
  });

  test('PUT should return 400 for invalid data', async () => {
    const changeOrderId = createdChangeOrderIds[0];
    const invalidData = {
      change_order_number: '', // Empty string should fail validation
    };

    const response = await apiContext.put(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders/${changeOrderId}`,
      {
        data: invalidData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(400);
  });

  test('POST /approve should approve change order and update contract value', async () => {
    const changeOrderId = createdChangeOrderIds[0];

    // Get current contract value
    const { data: contractBefore } = await supabaseAdmin
      .from('prime_contracts')
      .select('revised_contract_value')
      .eq('id', testContractId)
      .single();

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders/${changeOrderId}/approve`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('approved');
    expect(data.approved_by).toBe(userId);
    expect(data.approved_date).toBeDefined();
    expect(data.contract_updated).toBe(true);

    // Verify contract value was updated
    const expectedValue = (contractBefore?.revised_contract_value || 0) + 5500; // Updated amount from previous test
    expect(data.new_contract_value).toBe(expectedValue);

    // Verify in database
    const { data: contractAfter } = await supabaseAdmin
      .from('prime_contracts')
      .select('revised_contract_value')
      .eq('id', testContractId)
      .single();

    expect(contractAfter?.revised_contract_value).toBe(expectedValue);
  });

  test('POST /approve should return 400 if already approved', async () => {
    const changeOrderId = createdChangeOrderIds[0];

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders/${changeOrderId}/approve`,
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('already approved');
  });

  test('POST /reject should reject change order with reason', async () => {
    // Create a new change order to reject
    const changeOrderData = {
      change_order_number: 'CO-002',
      description: 'Change order to be rejected',
      amount: 2000,
    };

    const createResponse = await apiContext.post(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders`,
      {
        data: changeOrderData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const createdChangeOrder = await createResponse.json();
    createdChangeOrderIds.push(createdChangeOrder.id);

    // Reject the change order
    const rejectionData = {
      rejection_reason: 'Exceeds budget constraints',
    };

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders/${createdChangeOrder.id}/reject`,
      {
        data: rejectionData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('rejected');
    expect(data.approved_by).toBe(userId);
    expect(data.approved_date).toBeDefined();
    expect(data.rejection_reason).toBe(rejectionData.rejection_reason);
  });

  test('POST /reject should return 400 if already rejected', async () => {
    const changeOrderId = createdChangeOrderIds[1]; // The one we just rejected

    const rejectionData = {
      rejection_reason: 'Another reason',
    };

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders/${changeOrderId}/reject`,
      {
        data: rejectionData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('already rejected');
  });

  test('DELETE should delete change order and return 200', async () => {
    // Create a change order to delete
    const changeOrderData = {
      change_order_number: 'CO-003',
      description: 'Change order to be deleted',
      amount: 1000,
    };

    const createResponse = await apiContext.post(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders`,
      {
        data: changeOrderData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const createdChangeOrder = await createResponse.json();
    const changeOrderId = createdChangeOrder.id;

    const response = await apiContext.delete(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders/${changeOrderId}`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.message).toContain('deleted successfully');

    // Verify deletion
    const { data: deletedChangeOrder } = await supabaseAdmin
      .from('contract_change_orders')
      .select('id')
      .eq('id', changeOrderId)
      .single();

    expect(deletedChangeOrder).toBeNull();
  });

  test('DELETE should return 404 for non-existent change order', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await apiContext.delete(
      `/api/projects/${testProjectId}/contracts/${testContractId}/change-orders/${nonExistentId}`,
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toContain('not found');
  });
});

test.describe('Project-Level Change Orders API Routes', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const storageStatePath = join(__dirname, '../..', '.auth/user.json');
  const appUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  let supabase: ReturnType<typeof createClient>;
  let supabaseAdmin: ReturnType<typeof createClient>;
  let userId: string;
  let testProjectId: number;
  let testContractId: number;
  let apiContext: APIRequestContext;
  const createdChangeOrderIds: number[] = [];

  test.beforeAll(async ({ playwright }) => {
    apiContext = await createAuthenticatedRequestContext(
      playwright,
      storageStatePath,
      appUrl,
    );

    // Initialize Supabase clients
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate
    const { data: authData, error: authError} = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_1 || 'test1@mail.com',
      password: process.env.TEST_PASSWORD_1 || 'test12026!!!',
    });

    if (authError) throw authError;

    if (!authData.user || !authData.session) {
      throw new Error('No user or session returned from authentication');
    }

    userId = authData.user.id;

    // Get a test project
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('id')
      .limit(1);

    if (error) throw error;
    if (!projects || projects.length === 0) {
      throw new Error('No test project found');
    }
    testProjectId = projects[0].id;

    // Create a test contract
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .insert({
        project_id: testProjectId,
        contract_number: `CONTRACT-TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        contract_name: 'Test Contract for Project-Level Change Orders',
        contract_type: 'prime',
        status: 'active',
        original_contract_value: 150000,
        revised_contract_value: 150000,
      })
      .select('id')
      .single();

    if (contractError || !contract) {
      throw new Error(`Failed to create test contract: ${contractError?.message}`);
    }

    testContractId = contract.id;
  });

  test.afterAll(async () => {
    // Clean up: Delete all created change orders
    if (createdChangeOrderIds.length > 0) {
      await supabaseAdmin
        .from('change_orders')
        .delete()
        .in('id', createdChangeOrderIds);
    }

    // Clean up: Delete test contract
    if (testContractId) {
      await supabaseAdmin
        .from('contracts')
        .delete()
        .eq('id', testContractId);
    }

    await apiContext.dispose();
  });

  test('GET should return paginated list of change orders for project', async () => {
    const response = await apiContext.get(
      `/api/projects/${testProjectId}/change-orders`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.meta).toHaveProperty('page');
    expect(data.meta).toHaveProperty('limit');
    expect(data.meta).toHaveProperty('total');
    expect(data.meta).toHaveProperty('totalPages');
  });

  test('GET should filter by status', async () => {
    const response = await apiContext.get(
      `/api/projects/${testProjectId}/change-orders?status=draft`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.data.every((co: any) => co.status === 'draft')).toBe(true);
  });

  test('GET should filter by contractId', async () => {
    const response = await apiContext.get(
      `/api/projects/${testProjectId}/change-orders?contractId=${testContractId}`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.data.every((co: any) => co.contract_id === testContractId)).toBe(true);
  });

  test('GET should search by co_number, title, and description', async () => {
    const response = await apiContext.get(
      `/api/projects/${testProjectId}/change-orders?search=test`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('POST should create change order and return 201', async () => {
    const changeOrderData = {
      contract_id: testContractId,
      co_number: 'CO-PROJECT-001',
      title: 'Foundation work',
      description: 'Additional foundation reinforcement',
      amount: 7500,
      status: 'draft',
    };

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders`,
      {
        data: changeOrderData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.co_number).toBe(changeOrderData.co_number);
    expect(data.title).toBe(changeOrderData.title);
    expect(data.description).toBe(changeOrderData.description);
    expect(Number(data.amount)).toBe(changeOrderData.amount);
    expect(data.status).toBe('draft');
    expect(data.submitted_by).toBe(userId);

    createdChangeOrderIds.push(data.id);
  });

  test('POST should return 400 for missing required fields', async () => {
    const invalidData = {
      description: 'Missing co_number and title',
      amount: 1000,
    };

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders`,
      {
        data: invalidData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Validation error');
  });

  test('POST should return 400 for invalid project ID', async () => {
    const changeOrderData = {
      contract_id: testContractId,
      co_number: 'CO-INVALID-001',
      title: 'Invalid project',
      amount: 1000,
    };

    const response = await apiContext.post(
      `/api/projects/invalid/change-orders`,
      {
        data: changeOrderData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Invalid project ID');
  });

  test('GET should return 200 with change order detail', async () => {
    const changeOrderId = createdChangeOrderIds[0];

    const response = await apiContext.get(
      `/api/projects/${testProjectId}/change-orders/${changeOrderId}`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(changeOrderId);
    expect(data.co_number).toBe('CO-PROJECT-001');
    expect(data.contracts).toBeDefined(); // Should include contract relation
  });

  test('GET should return 404 for non-existent change order ID', async () => {
    const nonExistentId = 999999;

    const response = await apiContext.get(
      `/api/projects/${testProjectId}/change-orders/${nonExistentId}`,
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toContain('not found');
  });

  test('PUT should update change order and return 200', async () => {
    const changeOrderId = createdChangeOrderIds[0];
    const updateData = {
      title: 'Updated foundation work',
      description: 'Updated description with more details',
      amount: 8000,
    };

    const response = await apiContext.put(
      `/api/projects/${testProjectId}/change-orders/${changeOrderId}`,
      {
        data: updateData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.title).toBe(updateData.title);
    expect(data.description).toBe(updateData.description);
    expect(Number(data.amount)).toBe(updateData.amount);
  });

  test('PUT should return 404 for non-existent change order', async () => {
    const nonExistentId = 999999;
    const updateData = {
      title: 'Update non-existent',
    };

    const response = await apiContext.put(
      `/api/projects/${testProjectId}/change-orders/${nonExistentId}`,
      {
        data: updateData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toContain('not found');
  });

  test('PUT should handle status transitions correctly', async () => {
    const changeOrderId = createdChangeOrderIds[0];

    // Transition from draft to pending
    const response = await apiContext.put(
      `/api/projects/${testProjectId}/change-orders/${changeOrderId}`,
      {
        data: { status: 'pending' },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('pending');
    expect(data.submitted_at).toBeDefined();
    expect(data.submitted_by).toBe(userId);
  });

  test('POST /approve should approve change order and update contract value', async () => {
    const changeOrderId = createdChangeOrderIds[0];

    // Get current contract value
    const { data: contractBefore } = await supabaseAdmin
      .from('contracts')
      .select('revised_contract_value')
      .eq('id', testContractId)
      .single();

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders/${changeOrderId}/approve`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('approved');
    expect(data.approved_by).toBe(userId);
    expect(data.approved_at).toBeDefined();
    expect(data.contract_updated).toBe(true);

    // Verify contract value was updated
    const expectedValue = (contractBefore?.revised_contract_value || 0) + 8000; // Updated amount from previous test
    expect(data.new_contract_value).toBe(expectedValue);

    // Verify in database
    const { data: contractAfter } = await supabaseAdmin
      .from('contracts')
      .select('revised_contract_value')
      .eq('id', testContractId)
      .single();

    expect(contractAfter?.revised_contract_value).toBe(expectedValue);
  });

  test('POST /approve should return 400 if already approved', async () => {
    const changeOrderId = createdChangeOrderIds[0];

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders/${changeOrderId}/approve`,
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('already approved');
  });

  test('POST /approve should return 404 for non-existent change order', async () => {
    const nonExistentId = 999999;

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders/${nonExistentId}/approve`,
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toContain('not found');
  });

  test('POST /reject should reject change order with reason', async () => {
    // Create a new change order to reject
    const changeOrderData = {
      contract_id: testContractId,
      co_number: 'CO-PROJECT-002',
      title: 'Change order to be rejected',
      description: 'Testing rejection',
      amount: 2500,
      status: 'pending',
    };

    const createResponse = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders`,
      {
        data: changeOrderData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const createdChangeOrder = await createResponse.json();
    createdChangeOrderIds.push(createdChangeOrder.id);

    // Reject the change order
    const rejectionData = {
      rejection_reason: 'Exceeds budget constraints for this quarter',
    };

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders/${createdChangeOrder.id}/reject`,
      {
        data: rejectionData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('rejected');
    expect(data.approved_by).toBe(userId); // approved_by is used for both approve and reject
    expect(data.approved_at).toBeDefined();
    expect(data.rejection_reason).toBe(rejectionData.rejection_reason);
  });

  test('POST /reject should return 400 if already rejected', async () => {
    const changeOrderId = createdChangeOrderIds[1]; // The one we just rejected

    const rejectionData = {
      rejection_reason: 'Another reason',
    };

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders/${changeOrderId}/reject`,
      {
        data: rejectionData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('already rejected');
  });

  test('POST /reject should return 400 for missing rejection_reason', async () => {
    // Create a new change order
    const changeOrderData = {
      contract_id: testContractId,
      co_number: 'CO-PROJECT-003',
      title: 'Testing missing reason',
      amount: 1000,
      status: 'pending',
    };

    const createResponse = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders`,
      {
        data: changeOrderData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const createdChangeOrder = await createResponse.json();
    createdChangeOrderIds.push(createdChangeOrder.id);

    // Attempt to reject without reason
    const response = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders/${createdChangeOrder.id}/reject`,
      {
        data: {},
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Validation error');
  });

  test('POST /reject should return 404 for non-existent change order', async () => {
    const nonExistentId = 999999;

    const rejectionData = {
      rejection_reason: 'Test reason',
    };

    const response = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders/${nonExistentId}/reject`,
      {
        data: rejectionData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toContain('not found');
  });

  test('DELETE should delete non-approved change order and return 200', async () => {
    // Create a change order to delete
    const changeOrderData = {
      contract_id: testContractId,
      co_number: 'CO-PROJECT-004',
      title: 'Change order to be deleted',
      amount: 1500,
      status: 'draft',
    };

    const createResponse = await apiContext.post(
      `/api/projects/${testProjectId}/change-orders`,
      {
        data: changeOrderData,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const createdChangeOrder = await createResponse.json();
    const changeOrderId = createdChangeOrder.id;

    const response = await apiContext.delete(
      `/api/projects/${testProjectId}/change-orders/${changeOrderId}`,
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.message).toContain('deleted successfully');

    // Verify deletion
    const { data: deletedChangeOrder } = await supabaseAdmin
      .from('change_orders')
      .select('id')
      .eq('id', changeOrderId)
      .single();

    expect(deletedChangeOrder).toBeNull();
  });

  test('DELETE should return 400 for approved change orders', async () => {
    const approvedChangeOrderId = createdChangeOrderIds[0]; // This one was approved earlier

    const response = await apiContext.delete(
      `/api/projects/${testProjectId}/change-orders/${approvedChangeOrderId}`,
    );

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Cannot delete approved change orders');
  });

  test('DELETE should return 404 for non-existent change order', async () => {
    const nonExistentId = 999999;

    const response = await apiContext.delete(
      `/api/projects/${testProjectId}/change-orders/${nonExistentId}`,
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toContain('not found');
  });
});
