import { expect, test } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Setup Dropdown - Verify Fix', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test('verify cost code titles are showing in dropdown', async ({ page }) => {
    // Capture all console messages to see the data
    const allConsoleLogs: Array<{ type: string; args: unknown[] }> = [];
    page.on('console', async (msg) => {
      const args = [];
      for (const arg of msg.args()) {
        try {
          args.push(await arg.jsonValue());
        } catch {
          args.push(msg.text());
        }
      }
      allConsoleLogs.push({ type: msg.type(), args });
    });

    // Navigate and wait for page load
    const response = await page.goto(`http://localhost:3000/${projectId}/budget/setup`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Check if page loaded successfully (200) or has errors (500)
    console.warn(`Page response status: ${response?.status()}`);

    // Wait a bit for data to load
    await page.waitForTimeout(2000);

    // Find the console.warn that shows "Loaded project cost codes:"
    const loadedDataLog = allConsoleLogs.find(log =>
      log.type === 'warning' && log.args?.[0] === 'Loaded project cost codes:'
    );

    if (loadedDataLog?.args?.[1]) {
      const costCodes = loadedDataLog.args[1] as Array<{
        cost_code_id: string;
        cost_codes: { title: string } | null;
      }>;

      console.warn('\n=== VERIFICATION RESULTS ===\n');
      console.warn(`Found ${costCodes.length} cost codes`);

      // Check first 5 cost codes to see if they have titles
      const firstFive = costCodes.slice(0, 5);
      firstFive.forEach((code, idx) => {
        const title = code.cost_codes?.title || 'NO TITLE';
        console.warn(`${idx + 1}. ${code.cost_code_id} - ${title}`);
      });

      // Verify that cost_codes is an object with a title property
      const firstCode = costCodes[0];
      expect(firstCode.cost_codes).toBeTruthy();
      expect(typeof firstCode.cost_codes).toBe('object');
      expect(Array.isArray(firstCode.cost_codes)).toBe(false);
      expect(firstCode.cost_codes?.title).toBeTruthy();

      console.warn('\n✅ SUCCESS: cost_codes is an object with title property');
      console.warn(`Example: ${firstCode.cost_code_id} – ${firstCode.cost_codes?.title}`);
    } else {
      console.warn('❌ Could not find loaded data in console logs');
      console.warn(`Total console messages: ${allConsoleLogs.length}`);
      console.warn('Console message types:', allConsoleLogs.map(l => l.type).join(', '));

      // Check if there are any warning messages
      const warnings = allConsoleLogs.filter(l => l.type === 'warning');
      console.warn(`Found ${warnings.length} warning messages`);
      warnings.forEach((w, idx) => {
        console.warn(`Warning ${idx + 1}:`, w.args?.[0]);
      });
    }
  });
});
