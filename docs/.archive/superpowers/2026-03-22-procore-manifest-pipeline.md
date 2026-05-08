# Procore Manifest Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-command pipeline that crawls Procore, produces a structured machine-readable manifest, generates clean specs from it, audits the actual codebase for gaps, and drives targeted fixes — replacing the existing narrative-only audit system.

**Architecture:** A Playwright script does the heavy lifting (manifest extraction + screenshots), then four Claude commands orchestrate: deep-crawl → spec-gen → gap-audit → fix. The manifest.json is the single source of truth — every column, field, auto-calculation, tab, toolbar action, and filter captured as structured JSON that can be checked mechanically against code.

**Tech Stack:** Playwright (Node.js), agent-browser (for fix verification), Claude commands (.md files in `.claude/commands/`), JavaScript utilities in `scripts/playwright-crawl/lib/`

---

## File Map

### New files to create
| File | Responsibility |
|------|---------------|
| `scripts/playwright-crawl/lib/manifest-schema.js` | Defines/documents the manifest JSON shape |
| `scripts/playwright-crawl/lib/extract-manifest.js` | DOM extraction logic — runs inside `page.evaluate()` to extract grouped column headers, form fields, auto-calc indicators, toolbar actions, tabs, filters |
| `scripts/playwright-crawl/lib/feature-registry.js` | Maps feature names → Procore URLs + page states to navigate (list, create form, detail tabs, modals) |
| `scripts/playwright-crawl/procore-deep-crawl.js` | Master Playwright script: auth → navigate every state → extract manifest → save screenshots |
| `.claude/commands/procore-deep-crawl.md` | Command: runs the script, reports what was captured |
| `.claude/commands/procore-spec-gen.md` | Command: reads manifest → deletes old spec files → generates clean forms/ui/api/schema specs |
| `.claude/commands/procore-gap-audit.md` | Command: reads manifest → audits real code files → outputs gap-report.md with PRESENT/MISSING/WRONG |
| `.claude/commands/procore-fix.md` | Command: reads gap-report → implements fixes one at a time → verifies each with agent-browser |
| `.claude/commands/procore-complete.md` | Orchestrator: chains all four commands in sequence |

### Output directories (auto-created by script)
| Path | Contents |
|------|----------|
| `.claude/procore-manifests/<feature>/` | `manifest.json`, `gap-report.md` |
| `.claude/procore-manifests/<feature>/screenshots/` | PNG at every state (list, form-top/mid/bottom, detail tabs, modals) |

---

## Task 1: Manifest Schema Definition

**Files:**
- Create: `scripts/playwright-crawl/lib/manifest-schema.js`

The schema defines what a complete manifest looks like — acts as documentation and validation reference.

- [ ] **Step 1.1 — Create the schema file**

```javascript
// scripts/playwright-crawl/lib/manifest-schema.js
// Defines the shape of a Procore feature manifest.
// Every field here represents something that must exist in our app.

export const MANIFEST_SCHEMA = {
  feature: '',                    // e.g. "change-events"
  crawled_at: '',                 // ISO timestamp
  procore_url: '',                // base URL crawled

  list_view: {
    // Table column groups (Procore uses grouped headers like Detail/Revenue/Cost/Budget)
    column_groups: [
      // { label: 'Detail', columns: ['Item Type', 'Budget Code', ...] }
    ],
    // Flat columns (when no grouping)
    columns: [],
    // Toolbar buttons above the table
    toolbar_actions: [],          // e.g. ['Add to', 'Send Requests for Quote']
    // Controls in the table header area
    controls: [],                 // e.g. ['Filters', 'Group by: Item Type']
    // Row-level actions (the ... menu per row)
    row_actions: [],              // e.g. ['View', 'Edit', 'Delete']
    // Bulk actions (when rows are selected)
    bulk_actions: [],
    // Status filter tabs
    status_tabs: [],              // e.g. ['All', 'Open', 'Pending', 'Approved']
    // Auto-generated rows (rows that appear automatically, not created by user)
    auto_rows: [],                // e.g. [{ label: 'Insurance', budget_code: '55-0050.R', auto_calculated: true }]
  },

  create_form: {
    // Named sections within the form
    sections: [],                 // e.g. ['General Information', 'Revenue Settings', 'Line Items']
    // All form fields
    fields: [
      // { label, type, required, placeholder, options, conditional_on }
    ],
    // Conditional logic between fields
    conditional_rules: [],        // e.g. [{ when: 'expecting_revenue', equals: true, show: 'revenue_source' }]
  },

  detail_view: {
    // Tabs in the detail view
    tabs: [],                     // e.g. ['General', 'Change Orders', 'Invoices', 'Payments', 'Emails', 'History']
    // Actions in the detail view header
    actions: [],                  // e.g. ['Edit', 'Approve', 'Export PDF', 'Delete']
    // Whether each tab has its own sub-table
    tab_tables: {},               // { 'Change Orders': { columns: [...] } }
  },

  edit_form: {
    // Same shape as create_form — note any differences
    fields: [],
    sections: [],
  },

  workflows: [
    // Key business workflows
    // e.g. { name: 'Convert to Change Order', trigger: 'button', steps: [...] }
  ],

  calculations: [
    // Auto-calculated fields
    // e.g. { field: 'Insurance', formula: 'line_item_cost * insurance_rate', trigger: 'on_line_item_change' }
  ],
};
```

- [ ] **Step 1.2 — Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add scripts/playwright-crawl/lib/manifest-schema.js
git commit -m "feat: add procore manifest schema definition"
```

---

## Task 2: DOM Extractor Utility

**Files:**
- Create: `scripts/playwright-crawl/lib/extract-manifest.js`

This is the most critical file. It runs inside `page.evaluate()` and extracts every UI element into structured JSON. The key innovation is extracting **grouped column headers** — Procore uses either standard `<table>` with multi-tier `<thead>` OR AG Grid (`div.ag-header-*`) depending on the tool. Both paths must be handled. Auto-calculated rows are identified by lightning bolt SVG icons.

- [ ] **Step 2.1 — Create the extractor**

```javascript
// scripts/playwright-crawl/lib/extract-manifest.js
// NOTE: This file is serialized and sent to the browser via page.evaluate().
// Export a plain function — no closures over Node.js scope, no factory wrappers.

/**
 * Extracts a structured manifest from the current Procore page.
 * Called via: page.evaluate(extractPageData, 'list')
 *
 * @param {string} state - 'list' | 'create_form' | 'detail' | 'edit_form' | 'detail_tab'
 * @returns {Object} Partial manifest for the current page state
 */
export function extractPageData(state) {
    const result = {};

    // ── GROUPED COLUMN HEADERS ─────────────────────────────────────────────
    // Handles two cases:
    // 1. Standard HTML table with multi-row thead (span via colspan attr)
    // 2. AG Grid (div-based, groups via .ag-header-group-cell, cols via .ag-header-cell)
    //    AG Grid uses aria-colspan for group span, not HTML colspan.
    function extractColumnGroups() {
      const groups = [];

      // ─ Path A: AG Grid ─────────────────────────────────────────────────
      const agRoot = document.querySelector('.ag-root-wrapper, [class*="ag-theme"]');
      if (agRoot) {
        const groupCells = Array.from(
          agRoot.querySelectorAll('.ag-header-row:first-child .ag-header-group-cell, .ag-header-row:first-child .ag-header-cell')
        );
        const colCells = Array.from(
          agRoot.querySelectorAll('.ag-header-row:last-child .ag-header-cell')
        );

        if (groupCells.length > 0 && colCells.length > 0 && groupCells.length !== colCells.length) {
          // Multi-row AG Grid header
          let colIndex = 0;
          groupCells.forEach(cell => {
            const span = parseInt(
              cell.getAttribute('aria-colspan') || cell.getAttribute('colspan') || '1', 10
            );
            const label = cell.querySelector('.ag-header-group-cell-label, .ag-header-cell-text')
              ?.textContent.trim() || '';
            const columns = colCells.slice(colIndex, colIndex + span)
              .map(c => c.querySelector('.ag-header-cell-text')?.textContent.trim() || '')
              .filter(Boolean);
            if (label || columns.length > 0) {
              groups.push({ label, columns });
            }
            colIndex += span;
          });
        } else {
          // Single-row AG Grid header (flat)
          const cols = colCells
            .map(c => c.querySelector('.ag-header-cell-text')?.textContent.trim() || '')
            .filter(Boolean);
          if (cols.length > 0) groups.push({ label: '', columns: cols });
        }

        if (groups.length > 0) return groups;
      }

      // ─ Path B: Standard HTML table ──────────────────────────────────────
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const headerRows = table.querySelectorAll('thead tr');
        if (headerRows.length >= 2) {
          const groupRow = headerRows[0];
          const colRow = headerRows[1];
          const groupCells = Array.from(groupRow.querySelectorAll('th, td'));
          const colCells = Array.from(colRow.querySelectorAll('th, td'));

          let colIndex = 0;
          groupCells.forEach(cell => {
            const span = parseInt(cell.getAttribute('colspan') || '1', 10);
            const label = cell.textContent.trim();
            const columns = colCells.slice(colIndex, colIndex + span)
              .map(c => c.textContent.trim())
              .filter(Boolean);
            if (label || columns.length > 0) groups.push({ label, columns });
            colIndex += span;
          });
        } else if (headerRows.length === 1) {
          const cols = Array.from(headerRows[0].querySelectorAll('th, td'))
            .map(c => c.textContent.trim()).filter(Boolean);
          if (cols.length > 0) groups.push({ label: '', columns: cols });
        }
      });

      return groups;
    }

    // ── AUTO-CALCULATED ROWS ───────────────────────────────────────────────
    // Procore marks auto-calc rows with a lightning bolt (⚡ or SVG with specific class)
    function extractAutoRows() {
      const rows = document.querySelectorAll('tr, [role="row"]');
      const autoRows = [];

      rows.forEach(row => {
        const hasLightning =
          row.querySelector('[data-icon="lightning"], .lightning-bolt, svg[aria-label*="auto"]') ||
          row.querySelector('svg title') &&
          row.querySelector('svg title').textContent.toLowerCase().includes('auto') ||
          row.textContent.includes('⚡');

        if (hasLightning) {
          const cells = Array.from(row.querySelectorAll('td'));
          autoRows.push({
            label: cells[1]?.textContent.trim() || cells[0]?.textContent.trim() || '',
            budget_code: cells[0]?.textContent.trim() || '',
            auto_calculated: true,
          });
        }
      });

      return autoRows;
    }

    // ── TOOLBAR ACTIONS ────────────────────────────────────────────────────
    function extractToolbarActions() {
      const toolbarSelectors = [
        '[data-qa="toolbar"]',
        '.toolbar',
        '[class*="toolbar"]',
        '[class*="action-bar"]',
      ];

      const actions = [];
      for (const sel of toolbarSelectors) {
        const toolbar = document.querySelector(sel);
        if (toolbar) {
          toolbar.querySelectorAll('button, a[role="button"]').forEach(btn => {
            const label = btn.textContent.trim() || btn.getAttribute('aria-label') || '';
            if (label) actions.push(label);
          });
          break;
        }
      }

      // Fallback: look for action buttons above the table
      if (actions.length === 0) {
        document.querySelectorAll('button').forEach(btn => {
          const text = btn.textContent.trim();
          if (text && text.length < 50 && !text.includes('\n')) {
            actions.push(text);
          }
        });
      }

      return [...new Set(actions)];
    }

    // ── STATUS TABS ────────────────────────────────────────────────────────
    function extractStatusTabs() {
      const tabSelectors = [
        '[role="tablist"] [role="tab"]',
        '.tab-bar .tab',
        '[class*="status-tab"]',
        'nav[class*="tab"] a',
      ];

      for (const sel of tabSelectors) {
        const tabs = Array.from(document.querySelectorAll(sel));
        if (tabs.length > 0) {
          return tabs.map(t => t.textContent.trim()).filter(Boolean);
        }
      }
      return [];
    }

    // ── FORM FIELDS ────────────────────────────────────────────────────────
    function extractFormFields() {
      const fields = [];
      const fieldContainers = document.querySelectorAll(
        '[data-qa*="field"], .form-field, .field-container, label'
      );

      if (fieldContainers.length === 0) {
        // Fallback: find label+input pairs
        document.querySelectorAll('label').forEach(label => {
          const input = document.getElementById(label.htmlFor) ||
            label.querySelector('input, select, textarea');
          if (input) {
            fields.push({
              label: label.textContent.trim().replace('*', '').trim(),
              type: input.tagName.toLowerCase() === 'select' ? 'select'
                : input.type || input.tagName.toLowerCase(),
              required: label.textContent.includes('*') ||
                input.hasAttribute('required') ||
                input.getAttribute('aria-required') === 'true',
              placeholder: input.placeholder || '',
              options: input.tagName.toLowerCase() === 'select'
                ? Array.from(input.options).map(o => o.text.trim()).filter(Boolean)
                : [],
            });
          }
        });
      }

      return fields;
    }

    // ── DETAIL TABS ────────────────────────────────────────────────────────
    function extractDetailTabs() {
      return extractStatusTabs(); // same logic, reuse
    }

    // ── HEADER ACTIONS ─────────────────────────────────────────────────────
    function extractHeaderActions() {
      const headerSelectors = [
        'header button',
        '[class*="page-header"] button',
        '[class*="detail-header"] button',
        'h1 ~ * button',
      ];

      const actions = [];
      for (const sel of headerSelectors) {
        document.querySelectorAll(sel).forEach(btn => {
          const text = btn.textContent.trim();
          if (text) actions.push(text);
        });
      }
      return [...new Set(actions)];
    }

    // ── ASSEMBLE BY STATE ──────────────────────────────────────────────────
    if (state === 'list') {
      result.column_groups = extractColumnGroups();
      result.toolbar_actions = extractToolbarActions();
      result.status_tabs = extractStatusTabs();
      result.auto_rows = extractAutoRows();
    } else if (state === 'create_form' || state === 'edit_form') {
      result.fields = extractFormFields();
      result.sections = Array.from(
        document.querySelectorAll('fieldset legend, [class*="section-title"], h2, h3')
      ).map(el => el.textContent.trim()).filter(Boolean);
    } else if (state === 'detail' || state === 'detail_tab') {
      result.tabs = extractDetailTabs();
      result.actions = extractHeaderActions();
      // Also extract any table on this tab
      result.column_groups = extractColumnGroups();
    }

    return result;
}
```

- [ ] **Step 2.2 — Commit**

```bash
git add scripts/playwright-crawl/lib/extract-manifest.js
git commit -m "feat: add DOM extractor utility for structured manifest extraction"
```

---

## Task 3: Feature Registry

**Files:**
- Create: `scripts/playwright-crawl/lib/feature-registry.js`

Maps feature names to URLs and the navigation sequence needed to capture every state.

- [ ] **Step 3.1 — Create the registry**

```javascript
// scripts/playwright-crawl/lib/feature-registry.js

const BASE = 'https://us02.procore.com';
const COMPANY = '562949953443325';
const PROJECT = '562949954728542';
const P = `${BASE}/webclients/host/companies/${COMPANY}/projects/${PROJECT}`;

export const FEATURE_REGISTRY = {
  'change-events': {
    list_url: `${P}/tools/events`,
    // States to capture: visit each URL or click each interaction
    states: [
      { name: 'list', url: `${P}/tools/events`, type: 'list' },
      { name: 'create-form', url: `${P}/tools/events/new`, type: 'create_form' },
      // Detail: navigate to first existing record
      { name: 'detail', selector: 'a[href*="/events/"]', type: 'detail' },
      // Detail tabs: click each tab after opening detail
      { name: 'detail-tab-line-items', tab_label: 'Line Items', type: 'detail_tab' },
      { name: 'detail-tab-rfqs', tab_label: 'RFQs', type: 'detail_tab' },
      { name: 'detail-tab-history', tab_label: 'History', type: 'detail_tab' },
    ],
  },

  'prime-contracts': {
    list_url: `${P}/tools/contracts/prime_contracts`,
    states: [
      { name: 'list', url: `${P}/tools/contracts/prime_contracts`, type: 'list' },
      { name: 'create-form', url: `${P}/tools/contracts/prime_contracts/new`, type: 'create_form' },
      { name: 'detail', selector: 'a[href*="/prime_contracts/"]', type: 'detail' },
      { name: 'detail-tab-change-orders', tab_label: 'Change Orders', type: 'detail_tab' },
      { name: 'detail-tab-invoices', tab_label: 'Invoices', type: 'detail_tab' },
      { name: 'detail-tab-payments', tab_label: 'Payments', type: 'detail_tab' },
      { name: 'detail-tab-emails', tab_label: 'Emails', type: 'detail_tab' },
      { name: 'detail-tab-history', tab_label: 'History', type: 'detail_tab' },
      { name: 'detail-tab-markup', tab_label: 'Markup', type: 'detail_tab' },
      { name: 'detail-tab-settings', tab_label: 'Settings', type: 'detail_tab' },
    ],
  },

  'commitments': {
    list_url: `${P}/tools/contracts/purchase_orders`,
    states: [
      { name: 'list', url: `${P}/tools/contracts/purchase_orders`, type: 'list' },
      { name: 'create-form', url: `${P}/tools/contracts/purchase_orders/new`, type: 'create_form' },
      { name: 'detail', selector: 'a[href*="/purchase_orders/"]', type: 'detail' },
      { name: 'detail-tab-sov', tab_label: 'Schedule of Values', type: 'detail_tab' },
      { name: 'detail-tab-change-orders', tab_label: 'Change Orders', type: 'detail_tab' },
      { name: 'detail-tab-invoices', tab_label: 'Invoices', type: 'detail_tab' },
    ],
  },

  'change-orders': {
    list_url: `${P}/tools/contracts/change_orders`,
    states: [
      { name: 'list', url: `${P}/tools/contracts/change_orders`, type: 'list' },
      { name: 'create-form', selector: 'button[aria-label*="Create"], button:text("Create")', type: 'create_form' },
      { name: 'detail', selector: 'a[href*="/change_orders/"]', type: 'detail' },
    ],
  },

  'direct-costs': {
    list_url: `${P}/tools/direct_costs`,
    states: [
      { name: 'list', url: `${P}/tools/direct_costs`, type: 'list' },
      { name: 'create-form', url: `${P}/tools/direct_costs/new`, type: 'create_form' },
      { name: 'detail', selector: 'a[href*="/direct_costs/"]', type: 'detail' },
    ],
  },

  'budget': {
    list_url: `${P}/tools/budget`,
    states: [
      { name: 'list', url: `${P}/tools/budget`, type: 'list' },
      { name: 'detail-tab-direct-costs', tab_label: 'Direct Costs', type: 'detail_tab' },
      { name: 'detail-tab-forecasting', tab_label: 'Forecasting', type: 'detail_tab' },
    ],
  },

  'invoicing': {
    list_url: `${P}/tools/contracts/invoices`,
    states: [
      { name: 'list', url: `${P}/tools/contracts/invoices`, type: 'list' },
      { name: 'detail', selector: 'a[href*="/invoices/"]', type: 'detail' },
    ],
  },
};

export function getFeature(name) {
  const key = name.toLowerCase().replace(/\s+/g, '-');
  const feature = FEATURE_REGISTRY[key];
  if (!feature) {
    throw new Error(
      `Unknown feature: "${name}". Known features: ${Object.keys(FEATURE_REGISTRY).join(', ')}`
    );
  }
  return { key, ...feature };
}
```

- [ ] **Step 3.2 — Commit**

```bash
git add scripts/playwright-crawl/lib/feature-registry.js
git commit -m "feat: add feature registry mapping feature names to Procore URLs and states"
```

---

## Task 4: Deep Crawl Script

**Files:**
- Create: `scripts/playwright-crawl/procore-deep-crawl.js`

The master script. Authenticates, navigates every state, extracts manifest data at each state, takes full-page screenshots, saves everything to `.claude/procore-manifests/<feature>/`.

- [ ] **Step 4.1 — Create the script**

```javascript
// scripts/playwright-crawl/procore-deep-crawl.js
// Usage: node procore-deep-crawl.js <feature-name>
// Example: node procore-deep-crawl.js change-events

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { extractPageData } from './lib/extract-manifest.js';
import { getFeature } from './lib/feature-registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const FEATURE_NAME = process.argv[2];
if (!FEATURE_NAME) {
  console.error('Usage: node procore-deep-crawl.js <feature-name>');
  process.exit(1);
}

const EMAIL = process.env.PROCORE_USER;
const PASSWORD = process.env.PROCORE_PASSWORD;
const OUTPUT_BASE = path.join(__dirname, '../../.claude/procore-manifests', FEATURE_NAME);
const SCREENSHOTS_DIR = path.join(OUTPUT_BASE, 'screenshots');

[OUTPUT_BASE, SCREENSHOTS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

async function login(page) {
  await page.goto('https://login.procore.com/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="session[email]"]', EMAIL);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  await page.fill('input[name="session[password]"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  console.log('✅ Logged in to Procore');
}

async function captureState(page, state, manifest) {
  console.log(`  → Capturing state: ${state.name}`);

  // Navigate
  if (state.url) {
    await page.goto(state.url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  } else if (state.selector) {
    const el = await page.locator(state.selector).first();
    if (await el.isVisible()) {
      await el.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else {
      console.log(`  ⚠ Selector not found: ${state.selector}`);
      console.log(`     → Detail view skipped. If the feature list is empty, create a test record in Procore first, then re-run.`);
      // Record the skip in manifest so gap-audit knows detail was not captured
      if (state.type === 'detail') {
        manifest.detail_view = manifest.detail_view || {};
        manifest.detail_view._capture_note = 'skipped: no records found in project — create a test record and re-crawl';
      }
      return;
    }
  } else if (state.tab_label) {
    const tab = await page.locator(`[role="tab"]:text("${state.tab_label}")`).first();
    if (await tab.isVisible()) {
      await tab.click();
      await page.waitForTimeout(1500);
    } else {
      console.log(`  ⚠ Tab not found: ${state.tab_label}`);
      return;
    }
  }

  // Screenshot (full page)
  const screenshotPath = path.join(SCREENSHOTS_DIR, `${state.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`  📸 Screenshot: ${state.name}.png`);

  // Extract manifest data — extractPageData is a plain serializable function
  const stateData = await page.evaluate(extractPageData, state.type);

  // Merge into manifest by state type
  if (state.type === 'list') {
    manifest.list_view = { ...manifest.list_view, ...stateData };
  } else if (state.type === 'create_form') {
    manifest.create_form = { ...manifest.create_form, ...stateData };
  } else if (state.type === 'edit_form') {
    manifest.edit_form = { ...manifest.edit_form, ...stateData };
  } else if (state.type === 'detail' || state.type === 'detail_tab') {
    manifest.detail_view = manifest.detail_view || { tabs: [], actions: [], tab_tables: {} };
    if (stateData.tabs?.length) manifest.detail_view.tabs = stateData.tabs;
    if (stateData.actions?.length) manifest.detail_view.actions = stateData.actions;
    if (state.tab_label && stateData.column_groups?.length) {
      manifest.detail_view.tab_tables[state.tab_label] = {
        column_groups: stateData.column_groups,
      };
    }
  }
}

async function run() {
  const feature = getFeature(FEATURE_NAME);
  console.log(`\n🚀 Deep-crawling Procore: ${FEATURE_NAME}`);
  console.log(`   Output: ${OUTPUT_BASE}\n`);

  const manifest = {
    feature: FEATURE_NAME,
    crawled_at: new Date().toISOString(),
    procore_url: feature.list_url,
    list_view: {},
    create_form: {},
    detail_view: {},
    edit_form: {},
    calculations: [],
    workflows: [],
  };

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1600, height: 900 });

  try {
    await login(page);

    for (const state of feature.states) {
      await captureState(page, state, manifest);
    }

    // Save manifest
    const manifestPath = path.join(OUTPUT_BASE, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\n✅ Manifest saved: ${manifestPath}`);
    console.log(`📸 Screenshots: ${SCREENSHOTS_DIR}`);
    console.log(`\nManifest summary:`);
    console.log(`  List columns: ${JSON.stringify(manifest.list_view.column_groups?.map(g => g.label) || [])}`);
    console.log(`  Detail tabs: ${JSON.stringify(manifest.detail_view?.tabs || [])}`);
    console.log(`  Create fields: ${manifest.create_form?.fields?.length || 0} fields`);
    console.log(`  Auto-rows: ${manifest.list_view.auto_rows?.length || 0}`);

  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('❌ Crawl failed:', err.message);
  process.exit(1);
});
```

- [ ] **Step 4.2 — Prerequisite: verify the test project has records**

Before running, confirm that Procore project `562949954728542` has at least one Change Event record. The detail-state capture relies on clicking the first record link. If the project is empty, detail view will be skipped and logged as `⚠ Selector not found`. If needed, create a test record manually in Procore first.

- [ ] **Step 4.3 — Test the script manually on change-events**

```bash
cd /Users/meganharrison/Documents/alleato-pm/scripts/playwright-crawl
node procore-deep-crawl.js change-events
```

Expected: Browser opens, logs in, navigates to Change Events list, captures screenshots, prints manifest summary with column groups including "Detail", "Revenue", "Cost", "Budget", and at least 2 auto-rows (Insurance, Fee).

- [ ] **Step 4.4 — Inspect the output** (run from project root)

```bash
cd /Users/meganharrison/Documents/alleato-pm
cat .claude/procore-manifests/change-events/manifest.json | python3 -m json.tool | head -80
ls .claude/procore-manifests/change-events/screenshots/
```

Verify: `list.png`, `create-form.png`, `detail.png`, `detail-tab-line-items.png` all exist. Verify `manifest.json` has `column_groups` with 4 groups.

- [ ] **Step 4.5 — Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm
git add scripts/playwright-crawl/procore-deep-crawl.js
git commit -m "feat: add procore deep-crawl script with structured manifest extraction"
```

---

## Task 5: procore-deep-crawl Command

**Files:**
- Create: `.claude/commands/procore-deep-crawl.md`

- [ ] **Step 5.1 — Create the command**

```markdown
---
description: Crawl a Procore feature and produce a structured manifest.json + screenshots for every page state
argument-hint: "<feature-name>"
---

# /procore-deep-crawl — Procore Feature Deep Crawl

Runs `scripts/playwright-crawl/procore-deep-crawl.js` for the given feature, then summarizes the manifest output.

## Usage

```
/procore-deep-crawl change-events
/procore-deep-crawl prime-contracts
/procore-deep-crawl commitments
```

## Steps

### 1. Run the crawler

```bash
cd /Users/meganharrison/Documents/alleato-pm/scripts/playwright-crawl
node procore-deep-crawl.js <feature-name>
```

Watch for errors. If the script exits with non-zero, check:
- Procore credentials in `.env` (`PROCORE_USER`, `PROCORE_PASSWORD`)
- Feature name is in the registry (see `lib/feature-registry.js`)
- Playwright is installed: `npx playwright install chromium`

### 2. Read and summarize the manifest

```bash
cat .claude/procore-manifests/<feature-name>/manifest.json
```

Report back to the user:

**Manifest Summary for `<feature-name>`**
| Section | What was captured |
|---------|-------------------|
| List view columns | (list all column groups and columns) |
| List toolbar actions | (list buttons) |
| Status tabs | (list tabs) |
| Auto-calculated rows | (list any auto-rows like Insurance, Fee) |
| Create form sections | (list sections) |
| Create form fields | (count + list field labels) |
| Detail view tabs | (list tabs) |
| Detail tab tables | (list per-tab columns if captured) |

### 3. Flag anything suspicious

If a section is empty (e.g., no form fields extracted), note it explicitly:
> ⚠️ `create_form.fields` is empty — the Procore form may use a custom grid that the extractor didn't recognize. Manually review `screenshots/create-form.png` and add the fields manually to the manifest.

### 4. If manual additions needed

The user can edit `.claude/procore-manifests/<feature-name>/manifest.json` directly. The manifest is the source of truth — screenshots are for human review to catch anything the extractor missed.
```

- [ ] **Step 5.2 — Commit**

```bash
git add .claude/commands/procore-deep-crawl.md
git commit -m "feat: add procore-deep-crawl command"
```

---

## Task 6: procore-spec-gen Command

**Files:**
- Create: `.claude/commands/procore-spec-gen.md`

Reads the manifest and generates clean spec files, completely replacing old ones.

- [ ] **Step 6.1 — Create the command**

```markdown
---
description: Generate clean spec files from a procore manifest, replacing all old specs
argument-hint: "<feature-name>"
---

# /procore-spec-gen — Generate Specs from Manifest

Reads `.claude/procore-manifests/<feature>/manifest.json` and generates new spec files
in `_bmad-output/planning-artifacts/<feature>/specs/`, deleting old specs first.

## Usage

```
/procore-spec-gen change-events
```

## Steps

### 1. Read the manifest

```bash
cat .claude/procore-manifests/<feature-name>/manifest.json
```

### 2. Delete old spec files

Different features use different directory layouts. Check which exists first:

```bash
ls _bmad-output/planning-artifacts/<feature-name>/
```

Then delete only the spec/documentation files (not tasks.md, status.md):

```bash
# If using specs/ subdirectory:
rm -f _bmad-output/planning-artifacts/<feature-name>/specs/*.md

# If using specifications/ subdirectory:
rm -f _bmad-output/planning-artifacts/<feature-name>/specifications/*.md

# If flat layout (specs are top-level .md files):
rm -f _bmad-output/planning-artifacts/<feature-name>/FORMS-*.md
rm -f _bmad-output/planning-artifacts/<feature-name>/UI-*.md
rm -f _bmad-output/planning-artifacts/<feature-name>/API-*.md
rm -f _bmad-output/planning-artifacts/<feature-name>/SCHEMA-*.md
```

Write new specs to whatever directory pattern the feature already uses. Do NOT create a new `specs/` subdirectory if the feature uses a flat layout or `specifications/`.

### 3. Generate FORMS-<FEATURE>.md

Based on `manifest.create_form`, write a spec that lists:
- Every form section
- Every field with: label, type, required (Y/N), options (if select), conditional logic
- Use a table format for easy scanning

### 4. Generate UI-<FEATURE>.md

Based on `manifest.list_view` and `manifest.detail_view`, write a spec that describes:
- List view: exact column groups + columns (use the grouped header structure from manifest)
- List view: toolbar actions, status tabs, row actions, auto-generated rows
- Detail view: tabs and what each tab contains
- Any auto-calculated fields (from `manifest.calculations`)

### 5. Generate SCHEMA-<FEATURE>.md

Infer schema additions needed from the manifest fields that don't exist in the current database.
Check `frontend/src/types/database.types.ts` to see what columns already exist.
Only document columns that are missing.

### 6. Generate API-<FEATURE>.md

Infer API endpoint needs from the manifest. List endpoints needed to support every list view,
form submission, tab, and action.

### 7. Commit

```bash
git add _bmad-output/planning-artifacts/<feature-name>/specs/
git commit -m "docs: regenerate <feature> specs from procore manifest"
```
```

- [ ] **Step 6.2 — Commit**

```bash
git add .claude/commands/procore-spec-gen.md
git commit -m "feat: add procore-spec-gen command"
```

---

## Task 7: procore-gap-audit Command

**Files:**
- Create: `.claude/commands/procore-gap-audit.md`

Compares manifest against actual implementation code. Not old spec files — real code.

- [ ] **Step 7.1 — Create the command**

```markdown
---
description: Audit the Alleato implementation against a Procore manifest, producing a binary PRESENT/MISSING/WRONG gap report
argument-hint: "<feature-name>"
---

# /procore-gap-audit — Gap Audit

Reads `.claude/procore-manifests/<feature>/manifest.json` and checks the actual implementation
code for each manifest item. Outputs `.claude/procore-manifests/<feature>/gap-report.md`.

## Usage

```
/procore-gap-audit change-events
```

## Steps

### 1. Read the manifest

```bash
cat .claude/procore-manifests/<feature-name>/manifest.json
```

### 2. Identify the key implementation files

For each feature, check these file locations:
- Page: `frontend/src/app/(main)/[projectId]/<feature-name>/page.tsx`
- Detail page: `frontend/src/app/(main)/[projectId]/<feature-name>/[recordId]/page.tsx`
- Create page: `frontend/src/app/(main)/[projectId]/<feature-name>/new/page.tsx`
- Components: `frontend/src/components/domain/<feature-name>/`
- API routes: `frontend/src/app/api/projects/[projectId]/<feature-name>/`
- Hooks: `frontend/src/hooks/use-<feature-name>.ts`
- DB types: `frontend/src/types/database.types.ts`

Read each file. Do not guess — read the actual code.

### 3. Check each manifest item

For every item in the manifest, determine: PRESENT, MISSING, or WRONG.

**PRESENT** = exists in code and appears to work correctly
**MISSING** = does not exist anywhere in the codebase
**WRONG** = exists but has a bug (wrong type, wrong field name, missing validation, broken logic)

Check these categories in order:

#### List View Columns
For each column in `manifest.list_view.column_groups`:
- Is there a column definition for it in the table columns file?
- Is the column label exactly matching Procore's label?

#### Auto-Calculated Rows
For each row in `manifest.list_view.auto_rows`:
- Is there code that auto-generates these rows when line items change?
- Is the calculation formula implemented?

#### Toolbar Actions
For each action in `manifest.list_view.toolbar_actions`:
- Is there a button with this label?
- Does it do something (not a stub)?

#### Status Tabs
For each tab in `manifest.list_view.status_tabs`:
- Does the tab exist?
- Does filtering by that status work?

#### Create Form Fields
For each field in `manifest.create_form.fields`:
- Is there a form field with this label?
- Is required validation correct?
- If it's a select, are the options correct?

#### Detail View Tabs
For each tab in `manifest.detail_view.tabs`:
- Does the tab exist in the detail view?
- Does it render actual data (not a stub)?

#### API Routes
For each action that requires an API call:
- Does the API route exist?
- Does it use correct parameter types (string UUID, not parseInt)?

### 4. Write gap-report.md

Save to `.claude/procore-manifests/<feature-name>/gap-report.md`:

```markdown
# Gap Report: <feature-name>
**Generated:** <date>
**Manifest:** `.claude/procore-manifests/<feature-name>/manifest.json`

## Summary
- ✅ PRESENT: X items
- ❌ MISSING: Y items
- ⚠️ WRONG: Z items

## List View

| Item | Status | Notes |
|------|--------|-------|
| Column: Item Type | ❌ MISSING | Not in column definitions |
| Column: Revenue ROM | ❌ MISSING | Not in column definitions |
| Column group headers | ❌ MISSING | Flat columns only, no Detail/Revenue/Cost/Budget grouping |
| Auto-row: Insurance | ❌ MISSING | No markup auto-calculation logic exists |
| Auto-row: Fee | ❌ MISSING | No markup auto-calculation logic exists |
| Toolbar: Send Requests for Quote | ❌ MISSING | Button not present |

## Create Form

| Item | Status | Notes |
|------|--------|-------|
| Field: Title | ✅ PRESENT | |
| Field: Type | ✅ PRESENT | |
| Field: Prime Contract for Markup | ❌ MISSING | Field not in form |
| Revenue section | ⚠️ WRONG | Exists but emits slug values that fail API validation |

## Detail View

| Item | Status | Notes |
|------|--------|-------|
| Tab: General | ✅ PRESENT | |
| Tab: Line Items | ⚠️ WRONG | changeEventId cast to integer, all API calls return empty |
| Tab: RFQs | ⚠️ WRONG | UI renders but not wired to API |
| Tab: History | ❌ MISSING | Tab does not exist |

## API Routes

**IMPORTANT: Read actual route files before filling in this section. Do NOT copy this example — statuses must reflect real code.**

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /change-events | [read: frontend/src/app/api/projects/[projectId]/change-events/route.ts] | |
| GET/POST /change-events/:id/line-items | [read: frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/route.ts] | Check for parseInt(id) bug |
| GET/POST /change-events/:id/rfqs | [read: frontend/src/app/api/projects/[projectId]/change-events/rfqs/route.ts] | |
| POST /change-events/:id/approvals | [read: frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/approvals/route.ts] | |

## Priority Order for Fixes

1. **CRITICAL** — UUID cast to integer (breaks ALL data loading)
2. **HIGH** — Missing API routes (rfqs, approvals)
3. **HIGH** — Missing columns (17 columns → current ~7)
4. **HIGH** — Missing auto-calculated markup rows
5. **MEDIUM** — Revenue section payload mismatch
6. **LOW** — Missing History tab
```

### 5. Commit

```bash
git add .claude/procore-manifests/<feature-name>/gap-report.md
git commit -m "docs: add gap report for <feature-name>"
```
```

- [ ] **Step 7.2 — Commit**

```bash
git add .claude/commands/procore-gap-audit.md
git commit -m "feat: add procore-gap-audit command"
```

---

## Task 8: procore-fix Command

**Files:**
- Create: `.claude/commands/procore-fix.md`

Works through the gap report systematically, implements each fix, verifies with agent-browser before moving on.

- [ ] **Step 8.1 — Create the command**

```markdown
---
description: Implement fixes from a procore gap report, verifying each fix in the browser before moving to the next
argument-hint: "<feature-name>"
---

# /procore-fix — Fix Gap Report Items

Reads `.claude/procore-manifests/<feature>/gap-report.md` and works through each
MISSING or WRONG item, implementing fixes and verifying each one works in the browser
before marking it complete.

## Usage

```
/procore-fix change-events
```

## Rules

1. **One fix at a time.** Never implement more than one fix before verifying.
2. **Verify before claiming done.** Use agent-browser to open the feature page and confirm the fix is visible/working.
3. **Update the gap report** after each successful fix (change ❌/⚠️ to ✅ with a note).
4. **Commit after each fix.** Small commits make it easy to revert if something breaks.
5. **If a fix causes a new error**, revert it and note the blocker in the gap report before moving on.

## Execution Loop

### 1. Read the gap report

```bash
cat .claude/procore-manifests/<feature-name>/gap-report.md
```

### 2. Pick the highest-priority MISSING or WRONG item

Follow the Priority Order at the bottom of the gap report.

### 3. Implement the fix

Read the relevant source files before touching them. Never edit a file you haven't read.

Common fix patterns:

**UUID cast to integer bug:**
```typescript
// WRONG:
const id = parseInt(params.changeEventId);
// CORRECT:
const id = params.changeEventId; // keep as string UUID
```

**Missing API route:**
- Create `frontend/src/app/api/projects/[projectId]/<feature>/[recordId]/<sub-resource>/route.ts`
- Follow the pattern from an existing working route (e.g., check commitments or budget routes)

**Missing table column:**
- Find the columns definition file (usually `<Feature>TableColumns.tsx`)
- Add the column following the existing pattern
- Make sure the column key matches the API response field name

**Missing auto-calculated rows:**
- Read how markup percentages are configured in the Prime Contract (Markup tab)
- Auto-rows should be computed server-side when returning line items, or computed client-side when line items change
- Insurance and Fee are percentages applied to line item totals — their rates come from the prime contract's markup settings

### 4. Verify with agent-browser

```bash
agent-browser open "http://localhost:3000/<projectId>/<feature-name>"
agent-browser wait --load networkidle
agent-browser snapshot -i
```

Confirm the fix is visible. For column fixes: check the column header is there. For API fixes: check the data loads. For form fixes: check the field appears.

### 5. Update gap report and commit

Change the item's status from ❌/⚠️ to ✅ with a note. Then:

```bash
git add -p   # stage only changed files, review carefully
git commit -m "fix(<feature>): <specific fix description>"
```

### 6. Repeat until all items are fixed or escalated

If an item cannot be fixed in a reasonable time (e.g., requires a database migration that wasn't planned), note it as BLOCKED with a reason and move to the next item.

### 7. Final verification

Once all items are ✅:

```bash
agent-browser open "http://localhost:3000/<projectId>/<feature-name>"
```

Navigate through every major state (list, create form, detail view with each tab) and take a screenshot of each. Save to `.claude/procore-manifests/<feature-name>/screenshots/verified/`.

Report: "All X gap items resolved. Final screenshots in `.claude/procore-manifests/<feature-name>/screenshots/verified/`"
```

- [ ] **Step 8.2 — Commit**

```bash
git add .claude/commands/procore-fix.md
git commit -m "feat: add procore-fix command"
```

---

## Task 9: procore-complete Orchestrator

**Files:**
- Create: `.claude/commands/procore-complete.md`

- [ ] **Step 9.1 — Create the orchestrator**

```markdown
---
description: Full Procore parity pipeline for a feature — deep-crawl → spec-gen → gap-audit → fix
argument-hint: "<feature-name>"
---

# /procore-complete — Full Feature Parity Pipeline

Runs the complete 4-step pipeline for a feature:

1. `/procore-deep-crawl <feature>` — Crawl Procore, produce manifest + screenshots
2. `/procore-spec-gen <feature>` — Delete old specs, generate clean specs from manifest
3. `/procore-gap-audit <feature>` — Compare manifest to actual code, produce gap report
4. `/procore-fix <feature>` — Implement fixes, verify each one, commit

## Usage

```
/procore-complete change-events
/procore-complete prime-contracts
```

## Execution

Run each step in sequence. **Stop between steps to show the user:**
- After Step 1: Show manifest summary. Ask if anything looks wrong or missing (human can review screenshots).
- After Step 3: Show gap report summary. Ask user to confirm priority order before fixing.
- After Step 4: Show final verification screenshots.

Do not skip any step or combine steps. Each one produces output the next one depends on.

## Pause Points

**After deep-crawl:** "Manifest complete. Here's what was captured: [summary]. Please review `screenshots/list.png` and `screenshots/create-form.png` to confirm nothing was missed. Any corrections to `manifest.json` should be made now before specs are generated."

**After gap-audit:** "Gap report complete. Found X missing items, Y wrong items. Priority order: [list]. Proceed with fixes?"
```

- [ ] **Step 9.2 — Commit**

```bash
git add .claude/commands/procore-complete.md
git commit -m "feat: add procore-complete orchestrator command"
```

---

## Task 10: End-to-End Test on Change Events

This task validates the full pipeline works correctly on the feature the user identified as the most problematic.

- [ ] **Step 10.1 — Run the full pipeline**

```bash
# In Claude Code, run:
/procore-complete change-events
```

- [ ] **Step 10.2 — Verify the manifest captures the known missing items**

Open `.claude/procore-manifests/change-events/manifest.json` and confirm:
- `list_view.column_groups` has 4 groups: Detail, Revenue, Cost, Budget
- `list_view.column_groups[1].columns` includes "Revenue ROM", "Prime PCO", "Latest Price"
- `list_view.column_groups[2].columns` includes "Cost ROM", "Request for Quote", "Non-Committed Cost", "Over/Under"
- `list_view.auto_rows` has at least 2 entries (Insurance, Fee)
- `list_view.toolbar_actions` includes "Send Requests for Quote"

If any are missing: review the screenshot for that state, update manifest.json manually, then proceed.

- [ ] **Step 10.3 — Verify gap report correctly identifies the known bugs**

Open `.claude/procore-manifests/change-events/gap-report.md` and confirm:
- UUID cast to integer is flagged as WRONG
- Missing `/rfqs` and `/approvals` routes are flagged as MISSING
- Auto-calculated markup rows are flagged as MISSING
- Revenue section payload mismatch is flagged as WRONG

- [ ] **Step 10.4 — Run the fix loop and verify in browser**

The fix loop should resolve at minimum:
1. UUID cast bug (highest priority, unblocks everything else)
2. Missing columns in line items table
3. Revenue payload mismatch

After each fix, agent-browser confirms the change is visible.

- [ ] **Step 10.5 — Final commit and report**

```bash
git add .
git commit -m "feat(change-events): achieve Procore parity via manifest pipeline"
```

---

## Notes for Agentic Workers

- **The manifest extractor may need tuning.** Procore uses AG Grid for some tools (not standard `<table>`). If column groups come back empty, check `screenshots/list.png` and update `extractColumnGroups()` in `extract-manifest.js` to handle AG Grid's DOM structure: `[class*="ag-header-group-cell-label"]`.
- **Never trust old spec files.** They are generated from partial screenshots and are known to be wrong. Always read the manifest and the actual code.
- **Read before editing.** For every file you edit, read it first. Never guess at what's in a file.
- **Small commits.** Each fix gets its own commit. Makes debugging easier.
- **Verify in browser.** Agent-browser is not optional. Don't mark anything ✅ without browser evidence.
