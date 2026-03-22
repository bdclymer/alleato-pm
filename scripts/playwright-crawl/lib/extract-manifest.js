/**
 * extract-manifest.js
 * DOM extraction function that runs inside page.evaluate().
 *
 * IMPORTANT: This function is serialized and sent to the browser.
 * - No imports, no Node.js APIs, no closures over outer-scope variables
 * - Must be a plain exported function — page.evaluate(() => extractPageData(state)) works
 *   because state is passed as a separate argument: page.evaluate(extractPageData, state)
 */

/**
 * Main extraction function. Called via:
 *   const data = await page.evaluate(extractPageData, { id, description });
 *
 * @param {object} state - { id: string, description: string }
 * @returns {object} structured manifest for this page state
 */
export function extractPageData(state) {
  const result = {
    id: state.id,
    description: state.description,
    url: window.location.href,
    columnGroups: [],
    columns: [],
    toolbarActions: [],
    filters: [],
    rowActions: [],
    autoRows: [],
    formSections: [],
    tabs: [],
    headerFields: [],
    _capture_note: '',
  };

  // ── AG Grid extraction (Procore's primary table format) ──────────────────
  const agRoot = document.querySelector('.ag-root, .ag-root-wrapper');
  if (agRoot) {
    result.columnGroups = extractAgGridColumns(agRoot);
    result.columns = result.columnGroups.flatMap(g => g.columns.map(c => ({
      label: c,
      columnGroup: g.label || null,
    })));
    result.autoRows = extractAutoRows(agRoot);
  } else {
    // ── Standard HTML table fallback ────────────────────────────────────────
    const table = document.querySelector('table');
    if (table) {
      result.columnGroups = extractTableColumns(table);
      result.columns = result.columnGroups.flatMap(g => g.columns.map(c => ({
        label: c,
        columnGroup: g.label || null,
      })));
    }
  }

  // ── Toolbar actions ────────────────────────────────────────────────────────
  result.toolbarActions = extractToolbarActions();

  // ── Filters ───────────────────────────────────────────────────────────────
  result.filters = extractFilters();

  // ── Row actions (kebab menus) ───────────────────────────────────────────────
  result.rowActions = extractRowActions();

  // ── Forms ─────────────────────────────────────────────────────────────────
  result.formSections = extractForms();

  // ── Detail page: tabs ────────────────────────────────────────────────────
  result.tabs = extractTabs();

  // ── Detail page: header key-value fields ────────────────────────────────
  result.headerFields = extractHeaderFields();

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS (must be defined in the same scope — no imports)
// ─────────────────────────────────────────────────────────────────────────────

function extractAgGridColumns(agRoot) {
  const groups = [];

  // First check for group header rows
  const groupHeaderCells = agRoot.querySelectorAll(
    '.ag-header-row--column-groups .ag-header-group-cell'
  );

  if (groupHeaderCells.length > 0) {
    // Multi-level headers: groups + leaf columns
    const leafRow = agRoot.querySelector('.ag-header-row--columns');
    const leafCells = leafRow
      ? Array.from(leafRow.querySelectorAll('.ag-header-cell'))
      : [];

    let leafIndex = 0;
    groupHeaderCells.forEach(groupCell => {
      const label = (groupCell.querySelector('.ag-header-group-text') || groupCell)
        .textContent.trim();
      const colspan = parseInt(groupCell.getAttribute('aria-colspan') || '1', 10);
      const childCols = [];

      for (let i = 0; i < colspan && leafIndex < leafCells.length; i++, leafIndex++) {
        const cellLabel = (
          leafCells[leafIndex].querySelector('.ag-header-cell-text') || leafCells[leafIndex]
        ).textContent.trim();
        if (cellLabel) childCols.push(cellLabel);
      }

      if (label || childCols.length > 0) {
        groups.push({ label, columns: childCols, colspan });
      }
    });
  } else {
    // Single-level headers: no groups, just leaf columns
    const leafCells = agRoot.querySelectorAll(
      '.ag-header-row .ag-header-cell'
    );
    const columns = Array.from(leafCells)
      .map(cell => (cell.querySelector('.ag-header-cell-text') || cell).textContent.trim())
      .filter(Boolean);

    if (columns.length > 0) {
      groups.push({ label: '', columns, colspan: columns.length });
    }
  }

  return groups;
}

function extractTableColumns(table) {
  const groups = [];
  const rows = Array.from(table.querySelectorAll('thead tr'));

  if (rows.length === 0) return groups;

  if (rows.length >= 2) {
    // Multi-level: first row = groups, second row = leaves
    const groupCells = Array.from(rows[0].querySelectorAll('th'));
    const leafCells = Array.from(rows[1].querySelectorAll('th'));

    let leafIndex = 0;
    groupCells.forEach(th => {
      const label = th.textContent.trim();
      const colspan = parseInt(th.getAttribute('colspan') || '1', 10);
      const childCols = [];

      for (let i = 0; i < colspan && leafIndex < leafCells.length; i++, leafIndex++) {
        const colLabel = leafCells[leafIndex].textContent.trim();
        if (colLabel) childCols.push(colLabel);
      }

      groups.push({ label, columns: childCols, colspan });
    });
  } else {
    // Single-level
    const cells = Array.from(rows[0].querySelectorAll('th'));
    const columns = cells.map(th => th.textContent.trim()).filter(Boolean);
    if (columns.length > 0) {
      groups.push({ label: '', columns, colspan: columns.length });
    }
  }

  return groups;
}

function extractAutoRows(agRoot) {
  const autoRows = [];
  const rows = agRoot.querySelectorAll('.ag-row');

  rows.forEach(row => {
    // Lightning bolt SVG = auto-calculated markup row
    const hasLightningBolt = row.querySelector('svg[data-icon="zap"], svg[class*="lightning"], [title*="auto"], [title*="calculated"]');
    const cellText = (row.querySelector('.ag-cell:first-child') || row).textContent.trim();

    // Also match ⚡ unicode in cell text
    if (hasLightningBolt || cellText.includes('⚡')) {
      autoRows.push({ label: cellText, autoCalculated: true });
    }
  });

  return autoRows;
}

function extractToolbarActions() {
  const actions = [];

  // Primary action buttons (outside tables, in page header or toolbar)
  const toolbarSelectors = [
    '[data-cy*="toolbar"]',
    '[class*="toolbar"]',
    '[class*="page-header"] [role="toolbar"]',
    'header [role="toolbar"]',
    '.action-bar',
    '[class*="action-bar"]',
  ];

  let toolbar = null;
  for (const sel of toolbarSelectors) {
    toolbar = document.querySelector(sel);
    if (toolbar) break;
  }

  // If no explicit toolbar, look for button clusters near the top of the page
  if (!toolbar) {
    toolbar = document.querySelector('main, [role="main"]') || document.body;
  }

  // Collect all buttons and links that look like actions
  const actionEls = toolbar.querySelectorAll(
    'button:not([disabled]):not([aria-hidden="true"]), [role="button"]:not([aria-hidden])'
  );

  const seen = new Set();
  actionEls.forEach(el => {
    const label = el.textContent.trim() || el.getAttribute('aria-label') || '';
    if (!label || seen.has(label)) return;
    seen.add(label);

    // Skip nav items, pagination, etc.
    if (/^(next|prev|previous|page \d|show \d|cancel|close|×)$/i.test(label)) return;

    const isDropdown = el.getAttribute('aria-haspopup') === 'true' ||
      el.getAttribute('aria-expanded') !== null ||
      el.querySelector('[class*="dropdown"], [class*="caret"]') !== null;

    actions.push({
      label,
      type: isDropdown ? 'dropdown' : 'button',
      variant: el.getAttribute('data-variant') ||
        (el.className.includes('primary') ? 'primary' : 'default'),
    });
  });

  return actions.slice(0, 20); // Cap at 20 to avoid noise
}

function extractFilters() {
  const filters = [];

  // Filter panels, dropdowns labeled "Filter"
  const filterContainers = document.querySelectorAll(
    '[class*="filter-panel"], [class*="filter-dropdown"], [aria-label*="Filter"]'
  );

  filterContainers.forEach(container => {
    const inputs = container.querySelectorAll('input, select, [role="combobox"]');
    inputs.forEach(input => {
      const label = findLabel(input);
      if (!label) return;

      const type = input.tagName === 'SELECT' ? 'select' :
        input.getAttribute('role') === 'combobox' ? 'combobox' :
        input.getAttribute('type') || 'text';

      const options = type === 'select'
        ? Array.from(input.querySelectorAll('option')).map(o => o.textContent.trim()).filter(Boolean)
        : [];

      filters.push({ label, type, options });
    });
  });

  return filters;
}

function extractRowActions() {
  const actions = [];

  // Kebab menus / context menus on rows
  const menuItems = document.querySelectorAll(
    '[role="menuitem"], [class*="dropdown-item"], [class*="context-menu-item"]'
  );

  const seen = new Set();
  menuItems.forEach(item => {
    const label = item.textContent.trim();
    if (label && !seen.has(label)) {
      seen.add(label);
      actions.push({ label });
    }
  });

  return actions;
}

function extractForms() {
  const sections = [];
  const forms = document.querySelectorAll('form, [role="dialog"] [class*="form"]');

  forms.forEach(form => {
    // Try to find sections within the form
    const sectionEls = form.querySelectorAll(
      '[class*="section"], [class*="group"], fieldset'
    );

    if (sectionEls.length > 0) {
      sectionEls.forEach(sectionEl => {
        const titleEl = sectionEl.querySelector(
          'legend, [class*="section-title"], [class*="group-title"], h2, h3, h4'
        );
        const title = titleEl ? titleEl.textContent.trim() : '';
        const fields = extractFieldsFromContainer(sectionEl);

        if (fields.length > 0) {
          sections.push({ title, fields });
        }
      });
    } else {
      // No explicit sections — everything is one section
      const fields = extractFieldsFromContainer(form);
      if (fields.length > 0) {
        sections.push({ title: '', fields });
      }
    }
  });

  return sections;
}

function extractFieldsFromContainer(container) {
  const fields = [];
  const inputs = container.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), ' +
    'textarea, select, [role="combobox"], [role="listbox"], [role="switch"], ' +
    '[contenteditable="true"]'
  );

  const seen = new Set();
  inputs.forEach(input => {
    const label = findLabel(input);
    if (!label || seen.has(label)) return;
    seen.add(label);

    const type = input.getAttribute('role') ||
      (input.tagName === 'SELECT' ? 'select' :
        input.tagName === 'TEXTAREA' ? 'textarea' :
        input.getAttribute('type') || 'text');

    const required = input.required ||
      input.getAttribute('aria-required') === 'true' ||
      !!input.closest('[data-required="true"]') ||
      !!container.querySelector(`[for="${input.id}"] .required, [for="${input.id}"]::after`);

    const options = type === 'select'
      ? Array.from(input.querySelectorAll('option')).map(o => o.textContent.trim()).filter(o => o && o !== 'Select...' && o !== '--')
      : [];

    fields.push({
      name: input.name || input.id || label.toLowerCase().replace(/\s+/g, '_'),
      label,
      type,
      required: !!required,
      placeholder: input.placeholder || '',
      options,
      helpText: findHelpText(input),
    });
  });

  return fields;
}

function extractTabs() {
  const tabs = [];
  const tabEls = document.querySelectorAll(
    '[role="tab"], [class*="tab-item"] a, [class*="tab-label"], nav a[class*="tab"]'
  );

  tabEls.forEach(tab => {
    const label = tab.textContent.trim();
    if (label && !tabs.includes(label)) {
      tabs.push(label);
    }
  });

  return tabs;
}

function extractHeaderFields() {
  const fields = [];

  // Detail page header key-value pairs
  const kvEls = document.querySelectorAll(
    '[class*="detail-header"] [class*="field"], ' +
    '[class*="show-header"] [class*="kv"], ' +
    '[class*="summary"] [class*="label"]'
  );

  kvEls.forEach(el => {
    const labelEl = el.querySelector('[class*="label"], dt, th');
    const valueEl = el.querySelector('[class*="value"], dd, td');
    if (labelEl && valueEl) {
      fields.push({
        label: labelEl.textContent.trim(),
        value: valueEl.textContent.trim(),
      });
    }
  });

  return fields;
}

function findLabel(input) {
  // 1. aria-label
  if (input.getAttribute('aria-label')) return input.getAttribute('aria-label').trim();

  // 2. <label for="id">
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.textContent.trim().replace(/\s*\*\s*$/, '');
  }

  // 3. aria-labelledby
  const labelledBy = input.getAttribute('aria-labelledby');
  if (labelledBy) {
    const el = document.getElementById(labelledBy);
    if (el) return el.textContent.trim();
  }

  // 4. Wrapping label
  const wrappingLabel = input.closest('label');
  if (wrappingLabel) {
    // Remove the input's text content equivalent
    return wrappingLabel.textContent.trim().replace(input.value || '', '').trim();
  }

  // 5. Preceding sibling text
  const prev = input.previousElementSibling;
  if (prev && /label|legend|span|div/i.test(prev.tagName)) {
    return prev.textContent.trim();
  }

  return '';
}

function findHelpText(input) {
  const describedBy = input.getAttribute('aria-describedby');
  if (describedBy) {
    const el = document.getElementById(describedBy);
    if (el) return el.textContent.trim();
  }

  const parent = input.parentElement;
  if (parent) {
    const help = parent.querySelector('[class*="help"], [class*="hint"], [class*="description"]');
    if (help) return help.textContent.trim();
  }

  return '';
}
