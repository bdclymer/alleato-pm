/**
 * extract-manifest.js
 * DOM extraction function that runs inside page.evaluate().
 *
 * CRITICAL: page.evaluate() serializes the function body to send to the browser.
 * ALL helper functions MUST be nested inside extractPageData — nothing can be imported
 * from outer scope. No imports, no Node.js APIs, no external variables.
 *
 * Usage: const data = await page.evaluate(extractPageData, { id, description });
 */

export function extractPageData(state) {
  // ── NESTED HELPERS (must live inside this function for page.evaluate serialization) ──

  function extractAgGridColumns(agRoot) {
    const groups = [];
    const groupHeaderCells = agRoot.querySelectorAll(
      '.ag-header-row--column-groups .ag-header-group-cell'
    );

    if (groupHeaderCells.length > 0) {
      const leafRow = agRoot.querySelector('.ag-header-row--columns');
      const leafCells = leafRow
        ? Array.from(leafRow.querySelectorAll('.ag-header-cell'))
        : [];

      let leafIndex = 0;
      groupHeaderCells.forEach(function(groupCell) {
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
          groups.push({ label: label, columns: childCols, colspan: colspan });
        }
      });
    } else {
      const leafCells = agRoot.querySelectorAll('.ag-header-row .ag-header-cell');
      const columns = Array.from(leafCells)
        .map(function(cell) {
          return (cell.querySelector('.ag-header-cell-text') || cell).textContent.trim();
        })
        .filter(Boolean);
      if (columns.length > 0) {
        groups.push({ label: '', columns: columns, colspan: columns.length });
      }
    }
    return groups;
  }

  function extractTableColumns(table) {
    const groups = [];
    const rows = Array.from(table.querySelectorAll('thead tr'));
    if (rows.length === 0) return groups;

    if (rows.length >= 2) {
      const groupCells = Array.from(rows[0].querySelectorAll('th'));
      const leafCells = Array.from(rows[1].querySelectorAll('th'));
      let leafIndex = 0;
      groupCells.forEach(function(th) {
        const label = th.textContent.trim();
        const colspan = parseInt(th.getAttribute('colspan') || '1', 10);
        const childCols = [];
        for (let i = 0; i < colspan && leafIndex < leafCells.length; i++, leafIndex++) {
          const colLabel = leafCells[leafIndex].textContent.trim();
          if (colLabel) childCols.push(colLabel);
        }
        groups.push({ label: label, columns: childCols, colspan: colspan });
      });
    } else {
      const cells = Array.from(rows[0].querySelectorAll('th'));
      const columns = cells.map(function(th) { return th.textContent.trim(); }).filter(Boolean);
      if (columns.length > 0) {
        groups.push({ label: '', columns: columns, colspan: columns.length });
      }
    }
    return groups;
  }

  function extractAutoRows(agRoot) {
    const autoRows = [];
    const rows = agRoot.querySelectorAll('.ag-row');
    rows.forEach(function(row) {
      const hasBolt = row.querySelector('[title*="auto"], [title*="calculated"], [data-icon="zap"]');
      const cellText = (row.querySelector('.ag-cell:first-child') || row).textContent.trim();
      if (hasBolt || cellText.includes('⚡')) {
        autoRows.push({ label: cellText, autoCalculated: true });
      }
    });
    return autoRows;
  }

  function findLabel(input) {
    if (input.getAttribute('aria-label')) return input.getAttribute('aria-label').trim();
    if (input.id) {
      const lbl = document.querySelector('label[for="' + input.id + '"]');
      if (lbl) return lbl.textContent.trim().replace(/\s*\*\s*$/, '');
    }
    const labelledBy = input.getAttribute('aria-labelledby');
    if (labelledBy) {
      const el = document.getElementById(labelledBy);
      if (el) return el.textContent.trim();
    }
    const wrapping = input.closest('label');
    if (wrapping) return wrapping.textContent.trim().replace(input.value || '', '').trim();
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

  function extractFieldsFromContainer(container) {
    const fields = [];
    const seen = new Set();
    const inputs = container.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), ' +
      'textarea, select, [role="combobox"], [role="listbox"], [role="switch"], ' +
      '[contenteditable="true"]'
    );
    inputs.forEach(function(input) {
      const label = findLabel(input);
      if (!label || seen.has(label)) return;
      seen.add(label);
      const type = input.getAttribute('role') ||
        (input.tagName === 'SELECT' ? 'select' :
          input.tagName === 'TEXTAREA' ? 'textarea' :
          input.getAttribute('type') || 'text');
      const required = input.required || input.getAttribute('aria-required') === 'true';
      const options = type === 'select'
        ? Array.from(input.querySelectorAll('option'))
            .map(function(o) { return o.textContent.trim(); })
            .filter(function(o) { return o && o !== 'Select...' && o !== '--'; })
        : [];
      fields.push({
        name: input.name || input.id || label.toLowerCase().replace(/\s+/g, '_'),
        label: label,
        type: type,
        required: !!required,
        placeholder: input.placeholder || '',
        options: options,
        helpText: findHelpText(input),
      });
    });
    return fields;
  }

  function extractForms() {
    const sections = [];
    const forms = document.querySelectorAll('form, [role="dialog"] [class*="form"]');
    forms.forEach(function(form) {
      const sectionEls = form.querySelectorAll('[class*="section"], [class*="group"], fieldset');
      if (sectionEls.length > 0) {
        sectionEls.forEach(function(sectionEl) {
          const titleEl = sectionEl.querySelector(
            'legend, [class*="section-title"], [class*="group-title"], h2, h3, h4'
          );
          const title = titleEl ? titleEl.textContent.trim() : '';
          const fields = extractFieldsFromContainer(sectionEl);
          if (fields.length > 0) sections.push({ title: title, fields: fields });
        });
      } else {
        const fields = extractFieldsFromContainer(form);
        if (fields.length > 0) sections.push({ title: '', fields: fields });
      }
    });
    return sections;
  }

  function extractToolbarActions() {
    const actions = [];
    const seen = new Set();
    const selectors = [
      '[data-cy*="toolbar"]', '[class*="toolbar"]',
      '[class*="page-header"] [role="toolbar"]', 'header [role="toolbar"]',
      '.action-bar', '[class*="action-bar"]',
    ];
    let toolbar = null;
    for (let i = 0; i < selectors.length; i++) {
      toolbar = document.querySelector(selectors[i]);
      if (toolbar) break;
    }
    if (!toolbar) toolbar = document.querySelector('main, [role="main"]') || document.body;

    const actionEls = toolbar.querySelectorAll(
      'button:not([disabled]):not([aria-hidden="true"]), [role="button"]:not([aria-hidden])'
    );
    actionEls.forEach(function(el) {
      const label = el.textContent.trim() || el.getAttribute('aria-label') || '';
      if (!label || seen.has(label)) return;
      if (/^(next|prev|previous|page \d|show \d|cancel|close|×)$/i.test(label)) return;
      seen.add(label);
      const isDropdown = el.getAttribute('aria-haspopup') === 'true' ||
        el.getAttribute('aria-expanded') !== null ||
        !!el.querySelector('[class*="dropdown"], [class*="caret"]');
      actions.push({
        label: label,
        type: isDropdown ? 'dropdown' : 'button',
        variant: el.className && el.className.includes('primary') ? 'primary' : 'default',
      });
    });
    return actions.slice(0, 20);
  }

  function extractFilters() {
    const filters = [];
    const containers = document.querySelectorAll(
      '[class*="filter-panel"], [class*="filter-dropdown"], [aria-label*="Filter"]'
    );
    containers.forEach(function(container) {
      const inputs = container.querySelectorAll('input, select, [role="combobox"]');
      inputs.forEach(function(input) {
        const label = findLabel(input);
        if (!label) return;
        const type = input.tagName === 'SELECT' ? 'select' :
          input.getAttribute('role') === 'combobox' ? 'combobox' :
          input.getAttribute('type') || 'text';
        const options = type === 'select'
          ? Array.from(input.querySelectorAll('option')).map(function(o) { return o.textContent.trim(); }).filter(Boolean)
          : [];
        filters.push({ label: label, type: type, options: options });
      });
    });
    return filters;
  }

  function extractRowActions() {
    const actions = [];
    const seen = new Set();
    const menuItems = document.querySelectorAll(
      '[role="menuitem"], [class*="dropdown-item"], [class*="context-menu-item"]'
    );
    menuItems.forEach(function(item) {
      const label = item.textContent.trim();
      if (label && !seen.has(label)) {
        seen.add(label);
        actions.push({ label: label });
      }
    });
    return actions;
  }

  function extractTabs() {
    const tabs = [];
    const tabEls = document.querySelectorAll(
      '[role="tab"], [class*="tab-item"] a, [class*="tab-label"], nav a[class*="tab"]'
    );
    tabEls.forEach(function(tab) {
      const label = tab.textContent.trim();
      if (label && tabs.indexOf(label) === -1) tabs.push(label);
    });
    return tabs;
  }

  function extractHeaderFields() {
    const fields = [];
    const kvEls = document.querySelectorAll(
      '[class*="detail-header"] [class*="field"], ' +
      '[class*="show-header"] [class*="kv"], ' +
      '[class*="summary"] [class*="label"]'
    );
    kvEls.forEach(function(el) {
      const labelEl = el.querySelector('[class*="label"], dt, th');
      const valueEl = el.querySelector('[class*="value"], dd, td');
      if (labelEl && valueEl) {
        fields.push({ label: labelEl.textContent.trim(), value: valueEl.textContent.trim() });
      }
    });
    return fields;
  }

  // ── MAIN EXTRACTION ──────────────────────────────────────────────────────

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

  // AG Grid (Procore primary table format)
  const agRoot = document.querySelector('.ag-root, .ag-root-wrapper');
  if (agRoot) {
    result.columnGroups = extractAgGridColumns(agRoot);
    result.columns = result.columnGroups.flatMap(function(g) {
      return g.columns.map(function(c) { return { label: c, columnGroup: g.label || null }; });
    });
    result.autoRows = extractAutoRows(agRoot);
  } else {
    // Standard HTML table fallback
    const table = document.querySelector('table');
    if (table) {
      result.columnGroups = extractTableColumns(table);
      result.columns = result.columnGroups.flatMap(function(g) {
        return g.columns.map(function(c) { return { label: c, columnGroup: g.label || null }; });
      });
    }
  }

  result.toolbarActions = extractToolbarActions();
  result.filters = extractFilters();
  result.rowActions = extractRowActions();
  result.formSections = extractForms();
  result.tabs = extractTabs();
  result.headerFields = extractHeaderFields();

  return result;
}
