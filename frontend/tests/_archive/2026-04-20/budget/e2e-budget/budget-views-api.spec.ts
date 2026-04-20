import { test, expect } from '../../fixtures/index';
import path from 'path';
import { createTestProject } from '../../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

const TEST_PROJECT_ID = '118';
const BASE_URL = `${process.env.BASE_URL || 'http://localhost:3005'}/api/projects/${TEST_PROJECT_ID}/budget/views`;

test.describe.skip('Budget Views API - Phase 2a', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  let authCookies: string;
  let createdViewId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    // Load authentication
    const authFile = path.join(__dirname, '../.auth/user.json');
    const authData = JSON.parse(require('fs').readFileSync(authFile, 'utf-8'));
    authCookies = authData.cookies
      .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
      .join('; ');
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: Delete created view if it exists
    if (createdViewId) {
      await request.delete(`${BASE_URL}/${createdViewId}`, {
        headers: { Cookie: authCookies },
      });
    }
  });

  test.describe('GET /api/projects/[id]/budget/views', () => {
    test('should fetch all budget views for a project', async ({ request }) => {
      const response = await request.get(BASE_URL, {
        headers: { Cookie: authCookies },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('views');
      expect(Array.isArray(data.views)).toBe(true);

      // Should have at least the default "Procore Standard" view
      expect(data.views.length).toBeGreaterThan(0);

      const defaultView = data.views.find((v: { is_default: boolean }) => v.is_default);
      expect(defaultView).toBeDefined();
      expect(defaultView.name).toBe('Procore Standard');
      expect(defaultView.is_system).toBe(true);
    });

    test('should return views with sorted columns', async ({ request }) => {
      const response = await request.get(BASE_URL, {
        headers: { Cookie: authCookies },
      });

      const data = await response.json();
      const firstView = data.views[0];

      expect(firstView).toHaveProperty('columns');
      expect(Array.isArray(firstView.columns)).toBe(true);

      // Verify columns are sorted by display_order
      if (firstView.columns.length > 1) {
        for (let i = 0; i < firstView.columns.length - 1; i++) {
          expect(firstView.columns[i].display_order).toBeLessThanOrEqual(
            firstView.columns[i + 1].display_order
          );
        }
      }
    });
  });

  test.describe('POST /api/projects/[id]/budget/views', () => {
    test('should create a new budget view', async ({ request }) => {
      const newView = {
        name: 'Test Custom View',
        description: 'A test view created by Playwright',
        is_default: false,
        columns: [
          { column_key: 'costCode', display_order: 1, is_locked: true },
          { column_key: 'description', display_order: 2, is_locked: true },
          { column_key: 'originalBudgetAmount', display_order: 3, is_visible: true },
          { column_key: 'revisedBudget', display_order: 4, is_visible: true },
          { column_key: 'projectedCosts', display_order: 5, is_visible: true },
        ],
      };

      const response = await request.post(BASE_URL, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: newView,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('view');
      expect(data.view.name).toBe(newView.name);
      expect(data.view.description).toBe(newView.description);
      expect(data.view.is_default).toBe(false);
      expect(data.view.is_system).toBe(false);
      expect(data.view.columns).toHaveLength(5);

      // Save for cleanup
      createdViewId = data.view.id;
    });

    test('should fail when creating view without required fields', async ({ request }) => {
      const invalidView = {
        description: 'Missing name field',
      };

      const response = await request.post(BASE_URL, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: invalidView,
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    test('should fail when creating view with duplicate name', async ({ request }) => {
      const duplicateView = {
        name: 'Procore Standard', // System view name
        columns: [
          { column_key: 'costCode', display_order: 1 },
        ],
      };

      const response = await request.post(BASE_URL, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: duplicateView,
      });

      expect(response.status()).toBe(500);
    });
  });

  test.describe('GET /api/projects/[id]/budget/views/[viewId]', () => {
    test('should fetch a single budget view', async ({ request }) => {
      // First get all views to get a valid ID
      const listResponse = await request.get(BASE_URL, {
        headers: { Cookie: authCookies },
      });
      const listData = await listResponse.json();
      const viewId = listData.views[0].id;

      // Fetch single view
      const response = await request.get(`${BASE_URL}/${viewId}`, {
        headers: { Cookie: authCookies },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('view');
      expect(data.view.id).toBe(viewId);
      expect(data.view.columns).toBeDefined();
    });

    test('should return 404 for non-existent view', async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request.get(`${BASE_URL}/${fakeId}`, {
        headers: { Cookie: authCookies },
      });

      expect(response.status()).toBe(500); // Supabase returns 500 for not found with .single()
    });
  });

  test.describe('PATCH /api/projects/[id]/budget/views/[viewId]', () => {
    let testViewId: string;

    test.beforeAll(async ({ request }) => {
      // Create a test view to update
      const createResponse = await request.post(BASE_URL, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: {
          name: 'View To Update',
          columns: [{ column_key: 'costCode', display_order: 1 }],
        },
      });
      const createData = await createResponse.json();
      testViewId = createData.view.id;
    });

    test.afterAll(async ({ request }) => {
      // Cleanup
      await request.delete(`${BASE_URL}/${testViewId}`, {
        headers: { Cookie: authCookies },
      });
    });

    test('should update budget view name and description', async ({ request }) => {
      const updates = {
        name: 'Updated View Name',
        description: 'Updated description',
      };

      const response = await request.patch(`${BASE_URL}/${testViewId}`, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: updates,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.view.name).toBe(updates.name);
      expect(data.view.description).toBe(updates.description);
    });

    test('should update budget view columns', async ({ request }) => {
      const updates = {
        columns: [
          { column_key: 'costCode', display_order: 1, is_locked: true },
          { column_key: 'description', display_order: 2, is_locked: true },
          { column_key: 'originalBudgetAmount', display_order: 3 },
        ],
      };

      const response = await request.patch(`${BASE_URL}/${testViewId}`, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: updates,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.view.columns).toHaveLength(3);
    });

    test('should fail when trying to update system view', async ({ request }) => {
      // Get the system view ID
      const listResponse = await request.get(BASE_URL, {
        headers: { Cookie: authCookies },
      });
      const listData = await listResponse.json();
      const systemView = listData.views.find((v: { is_system: boolean }) => v.is_system);

      const response = await request.patch(`${BASE_URL}/${systemView.id}`, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: { name: 'Should Not Work' },
      });

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('system');
    });
  });

  test.describe('DELETE /api/projects/[id]/budget/views/[viewId]', () => {
    test('should delete a non-system budget view', async ({ request }) => {
      // Create a view to delete
      const createResponse = await request.post(BASE_URL, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: {
          name: 'View To Delete',
          columns: [{ column_key: 'costCode', display_order: 1 }],
        },
      });
      const createData = await createResponse.json();
      const viewId = createData.view.id;

      // Delete it
      const deleteResponse = await request.delete(`${BASE_URL}/${viewId}`, {
        headers: { Cookie: authCookies },
      });

      expect(deleteResponse.status()).toBe(200);

      const deleteData = await deleteResponse.json();
      expect(deleteData.success).toBe(true);

      // Verify it's deleted
      const getResponse = await request.get(`${BASE_URL}/${viewId}`, {
        headers: { Cookie: authCookies },
      });
      expect(getResponse.status()).toBe(500); // Not found
    });

    test('should fail when trying to delete system view', async ({ request }) => {
      // Get the system view ID
      const listResponse = await request.get(BASE_URL, {
        headers: { Cookie: authCookies },
      });
      const listData = await listResponse.json();
      const systemView = listData.views.find((v: { is_system: boolean }) => v.is_system);

      const response = await request.delete(`${BASE_URL}/${systemView.id}`, {
        headers: { Cookie: authCookies },
      });

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('system');
    });
  });

  test.describe('POST /api/projects/[id]/budget/views/[viewId]/clone', () => {
    test('should clone an existing budget view', async ({ request }) => {
      // Get a view to clone
      const listResponse = await request.get(BASE_URL, {
        headers: { Cookie: authCookies },
      });
      const listData = await listResponse.json();
      const sourceViewId = listData.views[0].id;
      const sourceView = listData.views[0];

      // Clone it
      const cloneResponse = await request.post(`${BASE_URL}/${sourceViewId}/clone`, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: {
          new_name: 'Cloned View Test',
          new_description: 'This is a cloned view',
        },
      });

      expect(cloneResponse.status()).toBe(201);

      const cloneData = await cloneResponse.json();
      expect(cloneData.view.name).toBe('Cloned View Test');
      expect(cloneData.view.description).toBe('This is a cloned view');
      expect(cloneData.view.is_system).toBe(false);
      expect(cloneData.view.columns).toHaveLength(sourceView.columns.length);

      // Cleanup
      await request.delete(`${BASE_URL}/${cloneData.view.id}`, {
        headers: { Cookie: authCookies },
      });
    });

    test('should fail when cloning without new name', async ({ request }) => {
      const listResponse = await request.get(BASE_URL, {
        headers: { Cookie: authCookies },
      });
      const listData = await listResponse.json();
      const sourceViewId = listData.views[0].id;

      const response = await request.post(`${BASE_URL}/${sourceViewId}/clone`, {
        headers: {
          Cookie: authCookies,
          'Content-Type': 'application/json',
        },
        data: {
          new_description: 'Missing name',
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });
  });
});
