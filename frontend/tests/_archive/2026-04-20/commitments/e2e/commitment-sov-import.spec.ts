import { test, expect } from '../../fixtures/index';

type BootstrapResponse = {
  project?: { id: number };
  commitment?: { id: string };
};

type ImportResponse = {
  importedCount?: number;
  totalRows?: number;
  message?: string;
};

const getLineItems = (payload: unknown): unknown[] => {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as { data?: unknown; line_items?: unknown };
  const source = record.data ?? record;
  if (!source || typeof source !== 'object') return [];
  const items = (source as { line_items?: unknown }).line_items;
  return Array.isArray(items) ? items : [];
};

test('imports commitment SOV line items from budget', async ({ authenticatedRequest }) => {
  const bootstrapResponse = await authenticatedRequest.post('/api/projects/bootstrap', {
    data: { name: `SOV Import Test ${Date.now()}` },
  });

  expect(bootstrapResponse.ok()).toBe(true);

  const bootstrapData = (await bootstrapResponse.json()) as BootstrapResponse;
  const projectId = bootstrapData.project?.id;
  const commitmentId = bootstrapData.commitment?.id;

  if (!projectId || !commitmentId) {
    throw new Error('Bootstrap response missing project or commitment data.');
  }

  const importResponse = await authenticatedRequest.post(
    `/api/projects/${projectId}/commitments/${commitmentId}/line-items/import`,
    {
      data: { source: 'budget' },
    }
  );

  expect(importResponse.ok()).toBe(true);

  const importData = (await importResponse.json()) as ImportResponse;
  expect(importData.importedCount).toBeGreaterThan(0);

  const commitmentResponse = await authenticatedRequest.get(`/api/commitments/${commitmentId}`);
  expect(commitmentResponse.ok()).toBe(true);

  const commitmentPayload = await commitmentResponse.json();
  const lineItems = getLineItems(commitmentPayload);

  expect(lineItems.length).toBeGreaterThan(0);
});
