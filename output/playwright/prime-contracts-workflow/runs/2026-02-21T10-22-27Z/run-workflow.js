async (page) => {
  const fs = require('fs');
  const path = require('path');

  const runDir = process.env.RUN_DIR;
  const baseUrl = 'http://localhost:3000';
  const candidateProjectIds = ['67', '60'];
  const report = {
    runTimestamp: new Date().toISOString(),
    baseUrl,
    selectedProjectId: null,
    requiresAuth: false,
    steps: [],
    assertions: [],
    urlsVisited: [],
    selectorFallbacksUsed: [],
    blockers: [],
    artifacts: []
  };

  const usedFallback = (name, reason) => {
    report.selectorFallbacksUsed.push({ name, reason });
  };

  const addStep = (name, status, details = '') => {
    report.steps.push({ name, status, details, at: new Date().toISOString() });
  };

  const addAssertion = (name, status, details = '') => {
    report.assertions.push({ name, status, details });
  };

  const visit = async (url) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    report.urlsVisited.push(page.url());
  };

  const screenshot = async (name) => {
    const p = path.join(runDir, name);
    await page.screenshot({ path: p, fullPage: true });
    report.artifacts.push(p);
  };

  const isAuthPage = async () => {
    const url = page.url().toLowerCase();
    if (url.includes('/login') || url.includes('/signin') || url.includes('/auth')) return true;
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.count()) return true;
    const signInText = page.getByText(/sign in|log in|two-factor|verification code|one-time passcode/i);
    return (await signInText.count()) > 0;
  };

  const tryProject = async () => {
    for (const projectId of candidateProjectIds) {
      const url = `${baseUrl}/${projectId}/prime-contracts/new`;
      await visit(url);
      if (await isAuthPage()) {
        report.requiresAuth = true;
        report.blockers.push({
          blocker: 'Authentication required',
          rootCause: 'App redirected to auth gate before prime contracts form could load.'
        });
        addStep('Navigate to prime contract form', 'blocked', `Auth required at ${page.url()}`);
        return null;
      }

      const contractField = page.getByLabel('Contract #');
      if (await contractField.count()) {
        report.selectedProjectId = projectId;
        addStep('Navigate to prime contract form', 'pass', `Loaded ${url}`);
        return projectId;
      }

      const unavailable = page.getByText(/not found|unable to load|project not found|404/i);
      if (await unavailable.count()) {
        addStep('Project availability check', 'fail', `Project ${projectId} unavailable at ${page.url()}`);
      }
    }

    report.blockers.push({
      blocker: 'No usable project ID',
      rootCause: 'Neither project 67 nor fallback 60 loaded the prime contract form.'
    });
    addStep('Project selection', 'blocked', 'Could not load form with candidate project IDs');
    return null;
  };

  try {
    const projectId = await tryProject();
    if (!projectId || report.requiresAuth) {
      const reportPath = path.join(runDir, 'report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      return report;
    }

    await page.waitForLoadState('networkidle');
    await screenshot('01-initial-form.png');

    const statusField = page.getByLabel('Status');
    const statusText = (await statusField.textContent()) || (await statusField.inputValue().catch(() => ''));
    const hasDraft = /draft/i.test(statusText || '');
    addAssertion('Default status is Draft', hasDraft ? 'pass' : 'fail', `Observed: ${String(statusText).trim()}`);

    const retainageValue = await page.getByLabel('Default Retainage').inputValue();
    addAssertion('Default Retainage is 10', retainageValue === '10' ? 'pass' : 'fail', `Observed: ${retainageValue}`);
    addStep('Verify default form state', hasDraft && retainageValue === '10' ? 'pass' : 'fail');

    await page.getByRole('button', { name: /^Create$/i }).click();

    const contractInvalid = await page.getByLabel('Contract #').getAttribute('aria-invalid');
    const titleInvalid = await page.getByLabel('Title').getAttribute('aria-invalid');
    const executedError = page.getByTestId('executed-error');
    const executedVisible = await executedError.isVisible().catch(async () => {
      usedFallback('executed-error', 'data-testid missing, used text match');
      return await page.getByText(/executed/i).isVisible();
    });

    addAssertion('Contract # invalid on empty submit', contractInvalid === 'true' ? 'pass' : 'fail', `aria-invalid=${contractInvalid}`);
    addAssertion('Title invalid on empty submit', titleInvalid === 'true' ? 'pass' : 'fail', `aria-invalid=${titleInvalid}`);
    addAssertion('Executed error visible on empty submit', executedVisible ? 'pass' : 'fail');
    addStep('Required-field validation on empty submit', contractInvalid === 'true' && titleInvalid === 'true' && executedVisible ? 'pass' : 'fail');

    await screenshot('02-validation-errors.png');

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const contractNumber = `PC-E2E-${stamp}`;
    const title = `Prime Contract E2E ${stamp}`;

    await page.getByLabel('Contract #').fill(contractNumber);
    await page.getByLabel('Title').fill(title);

    await statusField.click();
    await page.getByRole('option', { name: /approved/i }).click();

    const executedCheckbox = page.getByLabel('Contract is executed');
    if (!(await executedCheckbox.isChecked())) {
      await executedCheckbox.click();
    }

    await page.getByLabel('Default Retainage').fill('5');

    const ownerClientSelect = page.getByTestId('owner-client-select');
    if (await ownerClientSelect.count()) {
      await ownerClientSelect.click();
      const firstOption = page.locator('[data-testid^="owner-client-option-"]').first();
      await firstOption.click();
    } else {
      usedFallback('owner-client-select', 'testid absent, attempted Owner/Client combobox fallback');
      const fallbackOwner = page.getByLabel(/owner\/client/i);
      await fallbackOwner.click();
      await page.getByRole('option').first().click();
    }

    const privateToggle = page.getByLabel('Private');
    if (!(await privateToggle.isChecked())) {
      await privateToggle.click();
    }

    const addLineEmpty = page.getByTestId('sov-add-line-empty');
    if (await addLineEmpty.count()) {
      await addLineEmpty.click();
    } else {
      usedFallback('sov-add-line-empty', 'testid absent, used footer add-line');
      await page.getByTestId('sov-add-line-footer').click();
    }

    const line0 = page.getByTestId('sov-line-0');
    await line0.getByTestId('sov-line-description').fill('Site prep');
    await line0.getByTestId('sov-line-amount').fill('1000');

    await page.getByTestId('sov-add-line-footer').click();
    const line1 = page.getByTestId('sov-line-1');
    await line1.getByTestId('sov-line-description').fill('Concrete');
    await line1.getByTestId('sov-line-amount').fill('500');

    const sovTotalText = ((await page.getByTestId('sov-total-amount').textContent()) || '').trim();
    addAssertion('SOV total is $1500.00', sovTotalText.includes('$1500.00') ? 'pass' : 'fail', `Observed: ${sovTotalText}`);

    const line0Remain = ((await line0.getByTestId('sov-line-amount-remaining').textContent()) || '').trim();
    const line1Remain = ((await line1.getByTestId('sov-line-amount-remaining').textContent()) || '').trim();
    addAssertion('Line 1 remaining is $1000.00', line0Remain.includes('$1000.00') ? 'pass' : 'fail', `Observed: ${line0Remain}`);
    addAssertion('Line 2 remaining is $500.00', line1Remain.includes('$500.00') ? 'pass' : 'fail', `Observed: ${line1Remain}`);
    addStep('Add and validate SOV line items', sovTotalText.includes('$1500.00') && line0Remain.includes('$1000.00') && line1Remain.includes('$500.00') ? 'pass' : 'fail');

    const attachmentPath = '/Users/meganharrison/Documents/github/alleato-pm/frontend/tests/fixtures/prime-contract-attachment.txt';
    if (fs.existsSync(attachmentPath)) {
      const attachmentInput = page.getByTestId('prime-contract-attachments-input');
      await attachmentInput.setInputFiles(attachmentPath);
      const attachmentList = page.getByTestId('prime-contract-attachments-list');
      const attached = await attachmentList.textContent();
      const hasAttachment = /prime-contract-attachment\.txt/i.test(attached || '');
      addAssertion('Attachment upload visible in form', hasAttachment ? 'pass' : 'fail', attached || 'No attachment list text');
      addStep('Upload attachment fixture', hasAttachment ? 'pass' : 'fail', attachmentPath);
    } else {
      addAssertion('Attachment upload', 'blocked', 'Fixture path missing');
      report.blockers.push({ blocker: 'Attachment upload', rootCause: 'Fixture file not found in repo path.' });
      addStep('Upload attachment fixture', 'blocked', 'Fixture path missing');
    }

    await screenshot('03-filled-form-before-submit.png');

    await page.getByRole('button', { name: /^Create$/i }).click();
    await page.waitForURL(new RegExp(`/${projectId}/prime-contracts/[a-f0-9-]{36}`), { timeout: 15000 });
    const detailUrl = page.url();
    report.urlsVisited.push(detailUrl);
    const detailMatch = detailUrl.match(new RegExp(`/${projectId}/prime-contracts/([a-f0-9-]{36})`));
    const contractId = detailMatch ? detailMatch[1] : null;

    addAssertion('Redirected to contract detail URL with UUID', !!contractId ? 'pass' : 'fail', detailUrl);
    addStep('Submit create and redirect', !!contractId ? 'pass' : 'fail', detailUrl);

    await screenshot('04-post-create-detail.png');

    // Financial integrity checks where visible
    await page.goto(`${baseUrl}/${projectId}/prime-contracts`, { waitUntil: 'domcontentloaded' });
    report.urlsVisited.push(page.url());
    await page.waitForLoadState('networkidle');

    const createdRow = page.getByText(contractNumber).first();
    const rowVisible = await createdRow.isVisible().catch(() => false);
    addAssertion('Created contract visible in list', rowVisible ? 'pass' : 'fail', rowVisible ? contractNumber : 'Row not visible');

    // CO and payment paths depend on additional setup/UI paths not guaranteed in this run.
    addAssertion('Revised Contract Amount = Original + Approved COs', 'not-testable', 'No change order creation/approval UI path executed in this run.');
    addAssertion('% Paid updates when payments exist', 'not-testable', 'No payment data path executed in this run.');
    addAssertion('Pending/Draft COs do not affect Revised amount', 'not-testable', 'CO lifecycle setup unavailable in this flow.');

    report.blockers.push({
      blocker: 'Financial integrity CO/payment assertions',
      rootCause: 'This run creates a contract only; it does not include deterministic CO approval and payment-entry UI flow.'
    });

    addStep('Financial integrity checks on list/detail views', 'partial', 'Core visibility checked; CO/payment-dependent math marked not-testable with reason.');

    const reportPath = path.join(runDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    report.artifacts.push(reportPath);
    return report;
  } catch (error) {
    const failShot = path.join(runDir, '99-failure-state.png');
    try {
      await page.screenshot({ path: failShot, fullPage: true });
      report.artifacts.push(failShot);
    } catch (_e) {
      // ignore screenshot failure
    }

    report.blockers.push({
      blocker: 'Workflow execution error',
      rootCause: String(error && error.message ? error.message : error)
    });
    addStep('Workflow execution', 'fail', String(error && error.message ? error.message : error));

    const reportPath = path.join(runDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    report.artifacts.push(reportPath);
    return report;
  }
}
