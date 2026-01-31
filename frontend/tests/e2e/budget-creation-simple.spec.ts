import { test, expect } from '@playwright/test';

test('simple budget line item API test', async ({ request }) => {
  // First, we need to authenticate
  const loginResponse = await request.post('/api/auth/signup', {
    data: {
      email: 'test@example.com',
      password: 'password123'
    }
  });

  // Test the budget API directly
  const response = await request.post('/api/projects/1/budget', {
    data: {
      lineItems: [{
        costCodeId: '01-3120', // This will be looked up in cost_codes table
        amount: '1000'
      }]
    }
  });

  console.log('Response status:', response.status());
  const body = await response.json();
  console.log('Response body:', JSON.stringify(body, null, 2));

  if (!response.ok()) {
    throw new Error(`API Error: ${body.error || 'Unknown error'} - ${body.details || ''}`);
  }

  expect(response.ok()).toBeTruthy();
  expect(body.success).toBe(true);
});