import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Debug Auth', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  test('should access API with cookies from storage state', async ({ page }) => {
    // Navigate to homepage first to establish context and load cookies
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check what cookies are actually set
    const cookies = await page.context().cookies();
    console.log('Cookies in context:', cookies.map(c => `${c.name}: ${c.value.substring(0, 50)}...`));

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get first project
    const { data: projects } = await supabaseAdmin.from('projects').select('id').limit(1);
    const projectId = projects![0].id;

    console.log(`Project ID: ${projectId}`);

    // Create a test contract
    const { data: contract } = await supabaseAdmin
      .from('prime_contracts')
      .insert({
        project_id: projectId,
        contract_number: `PC-DEBUG-${Date.now()}`,
        title: 'Debug Test Contract',
        original_contract_value: 100000,
        revised_contract_value: 100000,
        status: 'active',
      })
      .select()
      .single();

    console.log(`Created contract: ${contract!.id}`);

    // Make API call from browser context using fetch (cookies are automatically included)
    const result = await page.evaluate(async (url) => {
      const response = await fetch(url);
      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? await response.json() : await response.text(),
      };
    }, `${process.env.NEXT_PUBLIC_APP_URL}/api/projects/${projectId}/contracts/${contract!.id}`);

    console.log(`API Response Status: ${result.status}`);
    console.log(`API Response Data:`, JSON.stringify(result.data).substring(0, 200));

    if (result.ok) {
      console.log(`✓ SUCCESS: Got contract ${result.data.contract_number}`);
      expect(result.data.id).toBe(contract!.id);
    } else {
      console.log(`❌ FAIL: Got ${result.status} - ${result.data}`);
    }

    // Clean up
    await supabaseAdmin.from('prime_contracts').delete().eq('id', contract!.id);
  });
});
