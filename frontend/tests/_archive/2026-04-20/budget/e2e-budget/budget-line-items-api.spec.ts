import { test, expect } from '../../fixtures/index';
import path from 'path';
import { createTestProject } from '../../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

const TEST_PROJECT_ID = '118';
const BASE_URL = `${process.env.BASE_URL || 'http://localhost:3005'}/api/projects/${TEST_PROJECT_ID}/budget/lines`;

test.describe.skip('Budget Line Items API - Complete CRUD Testing', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  let authCookies: string;
  let createdLineItemId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    // Load authentication
    const authFile = path.join(__dirname, '../.auth/user.json');
    const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));
    authCookies = authData.cookies
      .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
      .join('; ');
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: Delete created line item if it exists
    if (createdLineItemId) {
      await request.delete(`${BASE_URL}/${createdLineItemId}`, {
        headers: { Cookie: authCookies },
      });
    }
  });

  test.describe('GET /api/projects/[id]/budget/lines/[lineId]', () => {
    test('should fetch individual budget line item', async ({ request }) => {
      // First get all budget lines to get a valid ID
      const listResponse = await request.get(
        `${process.env.BASE_URL || 'http://localhost:3005'}/api/projects/${TEST_PROJECT_ID}/budget`,
        {
          headers: { Cookie: authCookies },
        }
      );

      if (listResponse.status() !== 200) {
        test.skip('No budget data available for testing');
      }

      const listData = await listResponse.json();

      if (!listData.lines || listData.lines.length === 0) {
        test.skip('No budget lines available for testing');
      }

      const lineId = listData.lines[0].id;

      // Fetch single line item
      const response = await request.get(`${BASE_URL}/${lineId}`, {
        headers: { Cookie: authCookies },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('line');
      expect(data.line).toHaveProperty('id');
      expect(data.line.id).toBe(lineId);
      expect(data.line).toHaveProperty('budget_amount');
      expect(data.line).toHaveProperty('description');
    });

    test('should return 404 for non-existent line item', async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request.get(`${BASE_URL}/${fakeId}`, {
        headers: { Cookie: authCookies },
      });

      expect([404, 500]).toContain(response.status());
    });
  });

  test.describe('PATCH /api/projects/[id]/budget/lines/[lineId]', () => {
    let testLineId: string;

    test.beforeAll(async ({ request }) => {
      // Create a test budget line to update
      const createResponse = await request.post(BASE_URL, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: {
          cost_code: '01-1000',
          description: 'Test Line Item for Updates',
          budget_amount: 5000,
          unit_quantity: 100,
          unit_of_measure: 'EA',
          unit_cost: 50,
        },
      });

      if (createResponse.status() === 201) {
        const createData = await createResponse.json();
        testLineId = createData.line.id;
      } else {
        test.skip('Cannot create test line item');
      }
    });

    test.afterAll(async ({ request }) => {
      // Cleanup
      if (testLineId) {
        await request.delete(`${BASE_URL}/${testLineId}`, {
          headers: { Cookie: authCookies },
        });
      }
    });

    test('should update budget line item description', async ({ request }) => {
      const updates = {
        description: 'Updated Description via API Test',
      };

      const response = await request.patch(`${BASE_URL}/${testLineId}`, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: updates,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.line.description).toBe(updates.description);
    });

    test('should update budget line item amount', async ({ request }) => {
      const updates = {
        budget_amount: 7500,
        unit_cost: 75,
      };

      const response = await request.patch(`${BASE_URL}/${testLineId}`, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: updates,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.line.budget_amount).toBe(updates.budget_amount);
      expect(data.line.unit_cost).toBe(updates.unit_cost);
    });

    test('should validate required fields on update', async ({ request }) => {
      const invalidUpdates = {
        budget_amount: -1000, // Negative amount should be invalid
      };

      const response = await request.patch(`${BASE_URL}/${testLineId}`, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: invalidUpdates,
      });

      // Should return error for invalid data
      expect([400, 422]).toContain(response.status());
    });
  });

  test.describe('DELETE /api/projects/[id]/budget/lines/[lineId]', () => {
    test('should delete a budget line item', async ({ request }) => {
      // Create a line item to delete
      const createResponse = await request.post(BASE_URL, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: {
          cost_code: '01-1001',
          description: 'Line Item To Delete',
          budget_amount: 1000,
          unit_quantity: 10,
          unit_of_measure: 'EA',
          unit_cost: 100,
        },
      });

      if (createResponse.status() !== 201) {
        test.skip('Cannot create line item for deletion test');
      }

      const createData = await createResponse.json();
      const lineId = createData.line.id;

      // Delete it
      const deleteResponse = await request.delete(`${BASE_URL}/${lineId}`, {
        headers: { Cookie: authCookies },
      });

      expect(deleteResponse.status()).toBe(200);

      const deleteData = await deleteResponse.json();
      expect(deleteData.success).toBe(true);

      // Verify it's deleted by trying to fetch it
      const getResponse = await request.get(`${BASE_URL}/${lineId}`, {
        headers: { Cookie: authCookies },
      });
      expect([404, 500]).toContain(getResponse.status());
    });

    test('should fail to delete non-existent line item', async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request.delete(`${BASE_URL}/${fakeId}`, {
        headers: { Cookie: authCookies },
      });

      expect([404, 500]).toContain(response.status());
    });
  });

  test.describe('Budget Line History API', () => {
    test('should fetch line item history', async ({ request }) => {
      // Get a line item ID first
      const listResponse = await request.get(
        `${process.env.BASE_URL || 'http://localhost:3005'}/api/projects/${TEST_PROJECT_ID}/budget`,
        {
          headers: { Cookie: authCookies },
        }
      );

      if (listResponse.status() !== 200) {
        test.skip('No budget data available');
      }

      const listData = await listResponse.json();
      if (!listData.lines || listData.lines.length === 0) {
        test.skip('No budget lines available');
      }

      const lineId = listData.lines[0].id;

      // Fetch history
      const response = await request.get(`${BASE_URL}/${lineId}/history`, {
        headers: { Cookie: authCookies },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('history');
      expect(Array.isArray(data.history)).toBe(true);
    });
  });

  test.describe('Integration with Budget Lock Status', () => {
    test('should respect budget lock status for modifications', async ({ request }) => {
      // Check current lock status
      const lockStatusResponse = await request.get(
        `${process.env.BASE_URL || 'http://localhost:3005'}/api/projects/${TEST_PROJECT_ID}/budget/lock`,
        {
          headers: { Cookie: authCookies },
        }
      );

      if (lockStatusResponse.status() !== 200) {
        test.skip('Cannot check lock status');
      }

      const lockData = await lockStatusResponse.json();

      // If budget is locked, line item creation should be restricted
      if (lockData.is_locked) {
        const createResponse = await request.post(BASE_URL, {
          headers: {
            Cookie: authCookies,
            'Content-Type': 'application/json',
          },
          data: {
            cost_code: '01-1002',
            description: 'Should Fail When Locked',
            budget_amount: 1000,
          },
        });

        // Should fail when budget is locked
        expect([403, 423]).toContain(createResponse.status());
      }
    });
  });
});
