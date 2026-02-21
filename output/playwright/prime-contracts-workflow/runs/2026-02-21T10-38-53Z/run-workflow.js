async (page) => {
  const runDir = '/Users/meganharrison/Documents/github/alleato-pm/output/playwright/prime-contracts-workflow/runs/2026-02-21T10-38-53Z';
  const baseUrl = 'http://localhost:3000';
  const candidateProjectIds = ['67', '60'];
  const attachmentPath = '/Users/meganharrison/Documents/github/alleato-pm/frontend/tests/fixtures/prime-contract-attachment.txt';
  const attachmentExists = true;

  const report = {
    runTimestamp: new Date().toISOString(),
    baseUrl,
    selectedProjectId: null,
    requiresAuth: false,
    createdContractId: null,
    createdContractNumber: null,
    steps: [],
    assertions: [],
    urlsVisited: [],
    selectorFallbacksUsed: [],
    blockers: [],
    artifacts: []
  };

  const usedFallback = (name, reason) => report.selectorFallbacksUsed.push({ name, reason });
  const addStep = (name, status, details = '') => report.steps.push({ name, status, details, at: new Date().toISOString() });
  const addAssertion = (name, status, details = '') => report.assertions.push({ name, status, details });
  const visit = async (url) => { await page.goto(url, { waitUntil: 'domcontentloaded' }); report.urlsVisited.push(page.url()); };
  const screenshot = async (name) => { const p = `${runDir}/${name}`; await page.screenshot({ path: p, fullPage: true }); report.artifacts.push(p); };

  const isAuthPage = async () => {
    const url = page.url().toLowerCase();
    if (url.includes('/login') || url.includes('/signin') || url.includes('/auth')) return true;
    if (await page.locator('input[type="password"]').count()) return true;
    return await page.getByText(/sign in|log in|two-factor|verification code|one-time passcode/i).first().isVisible().catch(() => false);
  };

  const tryProject = async () => {
    for (const projectId of candidateProjectIds) {
      const url = `${baseUrl}/${projectId}/prime-contracts/new`;
      await visit(url);
      if (await isAuthPage()) {
        report.requiresAuth = true;
        report.blockers.push({ blocker: 'Authentication required', rootCause: 'App redirected to auth gate before prime contracts form could load.' });
        addStep('Navigate to prime contract form', 'blocked', `Auth required at ${page.url()}`);
        return null;
      }
      if (await page.getByLabel('Contract #').first().isVisible().catch(() => false)) {
        report.selectedProjectId = projectId;
        addStep('Navigate to prime contract form', 'pass', `Loaded ${url}`);
        return projectId;
      }
      const unavailable = await page.getByText(/not found|unable to load|project not found|404/i).first().isVisible().catch(() => false);
      if (unavailable) addStep('Project availability check', 'fail', `Project ${projectId} unavailable at ${page.url()}`);
    }
    report.blockers.push({ blocker: 'No usable project ID', rootCause: 'Neither project 67 nor fallback 60 loaded the prime contract form.' });
    addStep('Project selection', 'blocked', 'Could not load form with candidate project IDs');
    return null;
  };

  try {
    const projectId = await tryProject();
    if (!projectId || report.requiresAuth) {
      await screenshot('99-auth-or-project-blocked.png').catch(() => {});
      return report;
    }

    await page.waitForLoadState('domcontentloaded');
    await screenshot('01-initial-form.png');

    const statusField = page.getByLabel('Status').first();
    let statusText = (await statusField.textContent().catch(() => '')) || '';
    if (!statusText) {
      statusText = (await page.getByRole('button', { name: /status/i }).first().textContent().catch(() => '')) || '';
      if (statusText) usedFallback('status-label', 'Used status button text fallback.');
    }
    const hasDraft = /draft/i.test((statusText || '').trim());
    addAssertion('Default status is Draft', hasDraft ? 'pass' : 'fail', `Observed: ${(statusText || '').trim()}`);

    const retainageValue = await page.getByLabel('Default Retainage').first().inputValue();
    addAssertion('Default Retainage is 10', retainageValue === '10' ? 'pass' : 'fail', `Observed: ${retainageValue}`);
    addStep('Verify default form state', hasDraft && retainageValue === '10' ? 'pass' : 'fail');

    await page.getByRole('button', { name: /^Create$/i }).click();

    const contractInvalid = await page.getByLabel('Contract #').first().getAttribute('aria-invalid');
    const titleInvalid = await page.getByLabel('Title').first().getAttribute('aria-invalid');
    let executedVisible = await page.getByTestId('executed-error').first().isVisible().catch(() => false);
    if (!executedVisible) {
      usedFallback('executed-error', 'data-testid missing, used text fallback');
      executedVisible = await page.getByText(/executed/i).first().isVisible().catch(() => false);
    }

    addAssertion('Contract # invalid on empty submit', contractInvalid === 'true' ? 'pass' : 'fail', `aria-invalid=${contractInvalid}`);
    addAssertion('Title invalid on empty submit', titleInvalid === 'true' ? 'pass' : 'fail', `aria-invalid=${titleInvalid}`);
    addAssertion('Executed error visible on empty submit', executedVisible ? 'pass' : 'fail');
    addStep('Required-field validation on empty submit', contractInvalid === 'true' && titleInvalid === 'true' && executedVisible ? 'pass' : 'fail');

    await screenshot('02-validation-errors.png');

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const contractNumber = `PC-E2E-${stamp}`;
    const title = `Prime Contract E2E ${stamp}`;
    report.createdContractNumber = contractNumber;

    await page.getByLabel('Contract #').first().fill(contractNumber);
    await page.getByLabel('Title').first().fill(title);

    await statusField.click();
    await page.getByRole('option', { name: /approved/i }).first().click();

    const executedCheckbox = page.getByLabel('Contract is executed').first();
    if (!(await executedCheckbox.isChecked())) await executedCheckbox.click();
    await page.getByLabel('Default Retainage').first().fill('5');

    const ownerClientSelect = page.getByTestId('owner-client-select').first();
    if (await ownerClientSelect.isVisible().catch(() => false)) {
      await ownerClientSelect.click();
      await page.locator('[data-testid^="owner-client-option-"]').first().click();
    } else {
      usedFallback('owner-client-select', 'testid absent, used combobox fallback');
      await page.getByLabel(/owner\/client/i).first().click();
      await page.getByRole('option').first().click();
    }

    const privateToggle = page.getByLabel('Private').first();
    if (!(await privateToggle.isChecked())) await privateToggle.click();

    const addLineEmpty = page.getByTestId('sov-add-line-empty').first();
    if (await addLineEmpty.isVisible().catch(() => false)) {
      await addLineEmpty.click();
    } else {
      usedFallback('sov-add-line-empty', 'testid absent, used footer add-line');
      await page.getByTestId('sov-add-line-footer').first().click();
    }

    const line0 = page.getByTestId('sov-line-0').first();
    await line0.getByTestId('sov-line-description').first().fill('Site prep');
    await line0.getByTestId('sov-line-amount').first().fill('1000');

    await page.getByTestId('sov-add-line-footer').first().click();
    const line1 = page.getByTestId('sov-line-1').first();
    await line1.getByTestId('sov-line-description').first().fill('Concrete');
    await line1.getByTestId('sov-line-amount').first().fill('500');

    const sovTotalText = ((await page.getByTestId('sov-total-amount').first().textContent()) || '').trim();
    addAssertion('SOV total is $1500.00', sovTotalText.includes('$1500.00') ? 'pass' : 'fail', `Observed: ${sovTotalText}`);

    const line0Remain = ((await line0.getByTestId('sov-line-amount-remaining').first().textContent()) || '').trim();
    const line1Remain = ((await line1.getByTestId('sov-line-amount-remaining').first().textContent()) || '').trim();
    addAssertion('Line 1 remaining is $1000.00', line0Remain.includes('$1000.00') ? 'pass' : 'fail', `Observed: ${line0Remain}`);
    addAssertion('Line 2 remaining is $500.00', line1Remain.includes('$500.00') ? 'pass' : 'fail', `Observed: ${line1Remain}`);
    addStep('Add and validate SOV line items', sovTotalText.includes('$1500.00') && line0Remain.includes('$1000.00') && line1Remain.includes('$500.00') ? 'pass' : 'fail');

    if (attachmentExists) {
      await page.getByTestId('prime-contract-attachments-input').first().setInputFiles(attachmentPath);
      const attachedText = ((await page.getByTestId('prime-contract-attachments-list').first().textContent().catch(() => '')) || '');
      const hasAttachment = /prime-contract-attachment\.txt/i.test(attachedText);
      addAssertion('Attachment upload visible in form', hasAttachment ? 'pass' : 'fail', hasAttachment ? 'Attachment listed' : attachedText || 'Attachment list empty');
      addStep('Upload attachment fixture', hasAttachment ? 'pass' : 'fail', attachmentPath);
    } else {
      addAssertion('Attachment upload', 'blocked', 'Fixture path missing');
      report.blockers.push({ blocker: 'Attachment upload', rootCause: 'Fixture file not found in repo path.' });
      addStep('Upload attachment fixture', 'blocked', 'Fixture path missing');
    }

    await screenshot('03-filled-form-before-submit.png');

    await page.getByRole('button', { name: /^Create$/i }).click();
    await page.waitForURL(new RegExp(`/${projectId}/prime-contracts/[a-f0-9-]{36}`), { timeout: 25000 });
    const detailUrl = page.url();
    report.urlsVisited.push(detailUrl);
    const contractId = detailUrl.split('/').pop() || '';
    report.createdContractId = /^[a-f0-9-]{36}$/.test(contractId) ? contractId : null;

    addAssertion('Redirected to contract detail URL with UUID', !!report.createdContractId ? 'pass' : 'fail', detailUrl);
    addStep('Submit create and redirect', !!report.createdContractId ? 'pass' : 'fail', detailUrl);

    await screenshot('04-post-create-detail.png');

    await page.goto(`${baseUrl}/${projectId}/prime-contracts`, { waitUntil: 'domcontentloaded' });
    report.urlsVisited.push(page.url());
    await page.waitForLoadState('domcontentloaded');

    const rowVisible = await page.getByText(contractNumber).first().isVisible().catch(() => false);
    addAssertion('Created contract visible in list', rowVisible ? 'pass' : 'fail', rowVisible ? contractNumber : 'Created row not visible');

    addAssertion('Revised Contract Amount = Original + Approved COs', 'not-testable', 'CO approval path not exercised in this run.');
    addAssertion('% Paid updates when payments exist', 'not-testable', 'Payment entry path not exercised in this run.');
    addAssertion('Pending/Draft COs do not affect Revised amount', 'not-testable', 'CO lifecycle setup unavailable in this flow.');

    report.blockers.push({
      blocker: 'Financial integrity CO/payment assertions',
      rootCause: 'No deterministic change-order approval and payment-entry flow in this run scope.'
    });

    addStep('Financial integrity checks on list/detail views', 'partial', 'CO/payment-dependent assertions marked not-testable with reason');
    return report;
  } catch (error) {
    const failPath = `${runDir}/99-failure-state.png`;
    await page.screenshot({ path: failPath, fullPage: true }).catch(() => {});
    report.artifacts.push(failPath);
    report.blockers.push({ blocker: 'Workflow execution error', rootCause: String(error && error.message ? error.message : error) });
    addStep('Workflow execution', 'fail', String(error && error.message ? error.message : error));
    return report;
  }
}
