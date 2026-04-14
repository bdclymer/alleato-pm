#!/usr/bin/env node
/**
 * procore-modal-crawl.js
 *
 * For each page in a tool, discovers every clickable cell/button/link and,
 * when clicking it opens a modal/sheet/drawer, captures:
 *   - screenshot (full page + modal-only crop if detectable)
 *   - DOM snapshot of the modal
 *   - structured field list (label, type, options, required, help text)
 *   - action buttons
 *   - title
 *
 * Output:
 *   .claude/procore-manifests/<tool>/modals/<page-id>/<modal-id>.png
 *   .claude/procore-manifests/<tool>/modals/<page-id>/<modal-id>.html
 *   .claude/procore-manifests/<tool>/modals.json        (merged summary)
 *
 * Usage:
 *   node procore-modal-crawl.js budget
 *   node procore-modal-crawl.js budget commitments rfis change-events invoicing
 *   node procore-modal-crawl.js --all
 *
 * Env: PROCORE_USER, PROCORE_PASSWORD required (loaded from ../../.env)
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';
import { MODAL_CONFIGS, ALL_TOOLS } from './lib/modal-configs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');
dotenv.config({ path: join(PROJECT_ROOT, '.env') });

const PROCORE_EMAIL = process.env.PROCORE_USER;
const PROCORE_PASSWORD = process.env.PROCORE_PASSWORD;
if (!PROCORE_EMAIL || !PROCORE_PASSWORD) {
  console.error('❌ Missing PROCORE_USER or PROCORE_PASSWORD in .env');
  process.exit(1);
}

// ─── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
let tools = [];
if (argv.includes('--all')) {
  tools = ALL_TOOLS;
} else if (argv.length === 0) {
  console.error('Usage: node procore-modal-crawl.js <tool> [tool...] | --all');
  console.error('Available tools: ' + ALL_TOOLS.join(', '));
  process.exit(1);
} else {
  tools = argv.filter((a) => !a.startsWith('--'));
  for (const t of tools) {
    if (!MODAL_CONFIGS[t]) {
      console.error(`❌ Unknown tool: ${t}. Available: ${ALL_TOOLS.join(', ')}`);
      process.exit(1);
    }
  }
}

// ─── auth ────────────────────────────────────────────────────────────────────
async function authenticate(page) {
  console.log('🔐 Authenticating with Procore...');
  await page.goto('https://login.procore.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (page.url().includes('login.procore.com') || page.url().includes('/login')) {
    try {
      await page.waitForSelector(
        'input[name="session[email]"], input[type="email"], input[name="email"]',
        { timeout: 10000 }
      );
      await page.fill(
        'input[name="session[email]"], input[type="email"], input[name="email"]',
        PROCORE_EMAIL
      );
      const nextBtn = page.locator(
        'button:has-text("Next"), button[type="submit"]:has-text("Continue")'
      );
      if ((await nextBtn.count()) > 0) {
        await nextBtn.first().click();
        await page.waitForTimeout(2000);
      }
      await page.fill(
        'input[name="session[password]"], input[type="password"], input[name="password"]',
        PROCORE_PASSWORD
      );
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page
        .waitForFunction(() => !window.location.href.includes('login.procore.com'), {
          timeout: 15000,
        })
        .catch(() => {});
    } catch (e) {
      console.warn('⚠️  Login form handling:', e.message);
    }
  }
  console.log(`✅ Auth complete: ${page.url()}`);
}

// ─── modal detection ─────────────────────────────────────────────────────────
const MODAL_SELECTORS = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[data-state="open"][role="dialog"]',
  '.MuiDialog-root:not([aria-hidden="true"])',
  '.MuiDrawer-root:not([aria-hidden="true"])',
  '[class*="Modal__root"]:not([aria-hidden="true"])',
  '[class*="sidepanel" i]:not([aria-hidden="true"])',
  '[class*="sideSheet" i]',
  '[class*="drawer" i][class*="open" i]',
  '[data-qa*="modal"]',
  '[data-qa*="drawer"]',
  '[data-qa*="side-panel"]',
];

async function findOpenModal(page) {
  for (const sel of MODAL_SELECTORS) {
    const handles = await page.$$(sel);
    for (const h of handles) {
      const visible = await h.isVisible().catch(() => false);
      if (!visible) continue;
      const box = await h.boundingBox().catch(() => null);
      if (box && box.width > 100 && box.height > 100) {
        return { handle: h, selector: sel, box };
      }
    }
  }
  return null;
}

async function closeModal(page) {
  // Try Escape first
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  // Then hunt for close buttons
  const closeBtns = [
    'button[aria-label*="close" i]',
    'button[aria-label*="Close" i]',
    'button[data-qa*="close"]',
    'button:has-text("Cancel")',
    '[role="dialog"] button:has-text("×")',
  ];
  for (const sel of closeBtns) {
    const btn = page.locator(sel).first();
    if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(400);
      break;
    }
  }
  // Final fallback — click outside the modal
  await page.mouse.click(5, 5).catch(() => {});
  await page.waitForTimeout(300);
}

// ─── candidate discovery (runs in browser) ──────────────────────────────────
function discoverTriggers() {
  const results = [];
  const seen = new Set();

  function push(el, kind) {
    if (!el || seen.has(el)) return;
    seen.add(el);
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    const label = (el.textContent || '').trim().slice(0, 80);
    const ariaLabel = el.getAttribute('aria-label') || '';
    const tag = el.tagName.toLowerCase();
    const id = el.getAttribute('id') || '';
    const classes = (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 120);
    const role = el.getAttribute('role') || '';
    const qa = el.getAttribute('data-qa') || el.getAttribute('data-testid') || '';
    const colId = el.getAttribute('col-id') || el.closest('[col-id]')?.getAttribute('col-id') || '';
    const rowIndex = el.closest('[row-index]')?.getAttribute('row-index') || '';
    results.push({
      kind,
      label,
      ariaLabel,
      tag,
      id,
      classes,
      role,
      qa,
      colId,
      rowIndex,
      x: Math.round(rect.x + rect.width / 2),
      y: Math.round(rect.y + rect.height / 2),
    });
  }

  // 1) All visible buttons (excluding nav and generic disabled)
  document.querySelectorAll('button').forEach((b) => {
    if (b.disabled) return;
    const r = b.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    if ((b.textContent || '').trim().length === 0 && !b.getAttribute('aria-label')) return;
    push(b, 'button');
  });

  // 2) AG Grid cells that look clickable: underline, cursor:pointer, or have a child link
  document.querySelectorAll('.ag-cell').forEach((cell) => {
    const cs = getComputedStyle(cell);
    const text = (cell.textContent || '').trim();
    if (!text) return;
    const hasLink = cell.querySelector('a, [role="link"], [class*="link" i]');
    const underline = cs.textDecorationLine === 'underline' || !!cell.querySelector('u, [style*="underline"]');
    const pointer = cs.cursor === 'pointer';
    if (hasLink || underline || pointer) {
      push(cell, 'ag-cell-clickable');
    }
  });

  // 3) Anchor tags in AG rows
  document.querySelectorAll('.ag-row a[href], tr a[href]').forEach((a) => push(a, 'row-link'));

  // 4) Cells whose text looks like money ($...) — these often open edit sheets in Procore
  document.querySelectorAll('.ag-cell, td').forEach((cell) => {
    const text = (cell.textContent || '').trim();
    if (/^\$[\d,]+(\.\d+)?$/.test(text) || /^\(\$[\d,]+(\.\d+)?\)$/.test(text)) {
      push(cell, 'money-cell');
    }
  });

  // 5) Row action menus (kebab / ellipsis)
  document
    .querySelectorAll(
      'button[aria-label*="action" i], button[aria-label*="menu" i], button[aria-label*="more" i], [data-qa*="kebab"]'
    )
    .forEach((b) => push(b, 'row-action-menu'));

  // 6) Header tabs / toolbar dropdowns (data-qa or class based)
  document
    .querySelectorAll(
      '[data-qa*="dropdown"], [class*="Dropdown"][role="button"], [aria-haspopup="menu"]'
    )
    .forEach((el) => push(el, 'dropdown'));

  return results;
}

// ─── modal extraction (runs in browser, scoped to the modal element) ───────
function extractModalDataFromEl(root) {
  function textOf(el) {
    if (!el) return '';
    return (el.textContent || '').trim().replace(/\s+/g, ' ');
  }
  const title =
    textOf(root.querySelector('[role="heading"], h1, h2, h3, [class*="title" i], [class*="Title" i]')) ||
    textOf(root.querySelector('header')) ||
    '';

  // fields
  const fields = [];
  const pushField = (obj) => fields.push(obj);
  root
    .querySelectorAll('label, [class*="Label"], [class*="label"]')
    .forEach((lbl) => {
      const text = textOf(lbl);
      if (!text || text.length > 120) return;
      // Try to find associated input
      const forId = lbl.getAttribute('for');
      let input = null;
      if (forId) input = root.querySelector(`#${CSS.escape(forId)}`);
      if (!input) input = lbl.querySelector('input, textarea, select');
      if (!input) {
        // Find next sibling input within parent
        const parent = lbl.closest('div, section, fieldset') || lbl.parentElement;
        if (parent) input = parent.querySelector('input, textarea, select');
      }
      const type = input?.tagName.toLowerCase() === 'select'
        ? 'select'
        : input?.tagName.toLowerCase() === 'textarea'
        ? 'textarea'
        : input?.type || 'unknown';
      const required = !!(input?.required || lbl.querySelector('.required, [class*="required" i]'));
      const value = input?.value || input?.textContent?.trim() || '';
      const options = [];
      if (input?.tagName.toLowerCase() === 'select') {
        input.querySelectorAll('option').forEach((o) =>
          options.push({ value: o.value, label: o.textContent.trim() })
        );
      }
      pushField({ label: text, type, required, value, options });
    });

  // also capture read-only display rows (e.g. "Line Item: Metals")
  const readOnlyRows = [];
  root
    .querySelectorAll('[class*="Row"], [class*="row"], dl > *, [class*="Field" i]')
    .forEach((el) => {
      const text = textOf(el);
      if (text.length < 2 || text.length > 250) return;
      // skip if it contains an input (handled above)
      if (el.querySelector('input, textarea, select')) return;
      readOnlyRows.push(text);
    });

  // action buttons (bottom of modal)
  const actions = [];
  root.querySelectorAll('button').forEach((b) => {
    if (b.disabled) return;
    const label = textOf(b);
    const aria = b.getAttribute('aria-label') || '';
    if (!label && !aria) return;
    actions.push({
      label: label || aria,
      variant: b.className.includes('primary')
        ? 'primary'
        : b.className.includes('destructive') || b.className.includes('danger')
        ? 'destructive'
        : 'secondary',
    });
  });

  // tabs inside modal
  const tabs = [];
  root.querySelectorAll('[role="tab"]').forEach((t) => {
    tabs.push({
      label: textOf(t),
      active: t.getAttribute('aria-selected') === 'true',
    });
  });

  return { title, fields, readOnlyRows: readOnlyRows.slice(0, 20), actions, tabs };
}

// ─── main capture loop ──────────────────────────────────────────────────────
async function captureModalForTrigger(page, trigger, outDir, idx) {
  const modalId = `${idx.toString().padStart(3, '0')}-${sanitize(
    trigger.label || trigger.ariaLabel || trigger.kind
  )}`.slice(0, 80);

  try {
    // Click trigger by coordinates (most reliable across shadow-DOM and AG Grid)
    await page.mouse.click(trigger.x, trigger.y);
    // Wait for modal to appear
    await page.waitForTimeout(800);
    const modal = await findOpenModal(page);
    if (!modal) {
      return { modalId, opened: false, trigger, note: 'no modal opened' };
    }

    // Extract data from the modal element
    const data = await modal.handle.evaluate(extractModalDataFromEl);

    // Save DOM
    const html = await modal.handle.evaluate((el) => el.outerHTML);
    writeFileSync(join(outDir, `${modalId}.html`), html);

    // Screenshot — full page (context) + modal-only clip
    await page.screenshot({
      path: join(outDir, `${modalId}-full.png`),
      fullPage: false,
    });
    try {
      await modal.handle.screenshot({ path: join(outDir, `${modalId}.png`) });
    } catch {}

    await closeModal(page);

    return {
      modalId,
      opened: true,
      trigger,
      detectedSelector: modal.selector,
      title: data.title,
      fields: data.fields,
      readOnlyRows: data.readOnlyRows,
      actions: data.actions,
      tabs: data.tabs,
      screenshot: `${modalId}.png`,
      fullScreenshot: `${modalId}-full.png`,
      dom: `${modalId}.html`,
    };
  } catch (err) {
    await closeModal(page).catch(() => {});
    return { modalId, opened: false, trigger, note: `error: ${err.message}` };
  }
}

function sanitize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'unnamed';
}

async function crawlTool(context, tool) {
  const config = MODAL_CONFIGS[tool];
  const toolOutDir = join(PROJECT_ROOT, '.claude/procore-manifests', tool);
  const modalsRootDir = join(toolOutDir, 'modals');
  mkdirSync(modalsRootDir, { recursive: true });

  console.log(`\n\n═══ ${tool.toUpperCase()} ═══`);
  const manifest = {
    tool,
    capturedAt: new Date().toISOString(),
    pages: [],
  };

  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const pageCfg of config.pages) {
    console.log(`\n→ Page: ${pageCfg.id} — ${pageCfg.url}`);
    const pageDir = join(modalsRootDir, pageCfg.id);
    mkdirSync(pageDir, { recursive: true });

    await page.goto(pageCfg.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (page.url().includes('login.procore.com')) {
      await authenticate(page);
      await page.goto(pageCfg.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    }
    // Wait for AG grid / main content
    await page
      .waitForSelector('.ag-root, table, form, [role="main"], [class*="content" i]', { timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(3000);

    // Screenshot the page once so we have context
    await page.screenshot({ path: join(pageDir, '_page.png'), fullPage: true });

    // Discover candidate triggers on this page
    const triggers = await page.evaluate(discoverTriggers);
    console.log(`  discovered ${triggers.length} candidate triggers`);

    // Dedupe by x,y rounded and label
    const dedup = new Map();
    for (const t of triggers) {
      const key = `${Math.round(t.x / 6)}_${Math.round(t.y / 6)}_${t.label.slice(0, 40)}`;
      if (!dedup.has(key)) dedup.set(key, t);
    }
    const unique = Array.from(dedup.values());

    // Filter: skip obvious noise (nav, empty, 1-char labels unless money/kebab)
    const filtered = unique.filter((t) => {
      if (t.kind === 'button') {
        // skip icon-only buttons with no aria-label that aren't in the main content area
        if (!t.label && !t.ariaLabel) return false;
        // skip nav elements
        if (/^(sign in|sign out|log out|help|home|profile|settings)$/i.test(t.label)) return false;
      }
      return true;
    });

    // Cap per page to keep this fast (budget will be the heaviest)
    const cap = pageCfg.triggerCap || 60;
    const toTry = filtered.slice(0, cap);
    console.log(`  will attempt ${toTry.length} of ${filtered.length} filtered`);

    // Save the discovery list for audit
    writeFileSync(
      join(pageDir, '_discovered-triggers.json'),
      JSON.stringify({ total: triggers.length, unique: unique.length, filtered: filtered.length, triggers: toTry }, null, 2)
    );

    const modals = [];
    let idx = 0;
    for (const trigger of toTry) {
      idx++;
      process.stdout.write(`  [${idx}/${toTry.length}] ${trigger.kind} "${(trigger.label || trigger.ariaLabel || '').slice(0, 40)}" ...`);
      const result = await captureModalForTrigger(page, trigger, pageDir, idx);
      if (result.opened) {
        process.stdout.write(` ✓ "${result.title || '(no title)'}" (${result.fields.length} fields, ${result.actions.length} actions)\n`);
      } else {
        process.stdout.write(` —\n`);
      }
      modals.push(result);

      // periodic re-navigation in case the page got stuck
      if (idx % 20 === 0) {
        await page.goto(pageCfg.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }
    }

    const openedModals = modals.filter((m) => m.opened);
    console.log(`  → ${openedModals.length} modals captured on ${pageCfg.id}`);
    manifest.pages.push({
      id: pageCfg.id,
      url: pageCfg.url,
      pageScreenshot: `modals/${pageCfg.id}/_page.png`,
      attemptedTriggers: toTry.length,
      modals: modals,
    });
  }

  const manifestPath = join(toolOutDir, 'modals.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✅ ${tool}: manifest → ${manifestPath}`);
  await page.close();
  return manifest;
}

// ─── main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🚀 Procore Modal Crawl — tools: ${tools.join(', ')}`);

  const CHROME_FOR_TESTING =
    '/Users/meganharrison/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  const browser = await chromium.launch({ headless: true }).catch(() =>
    chromium.launch({
      headless: true,
      executablePath: existsSync(CHROME_FOR_TESTING) ? CHROME_FOR_TESTING : undefined,
    })
  );

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  // auth once
  const authPage = await context.newPage();
  await authenticate(authPage);
  await authPage.close();

  const summaries = [];
  for (const tool of tools) {
    try {
      const m = await crawlTool(context, tool);
      const total = m.pages.reduce((n, p) => n + p.modals.filter((x) => x.opened).length, 0);
      summaries.push({ tool, pages: m.pages.length, modalsCaptured: total });
    } catch (err) {
      console.error(`❌ ${tool}:`, err.message);
      summaries.push({ tool, error: err.message });
    }
  }

  await browser.close();

  console.log('\n\n═══════ SUMMARY ═══════');
  summaries.forEach((s) => {
    if (s.error) console.log(`❌ ${s.tool}: ${s.error}`);
    else console.log(`✅ ${s.tool}: ${s.modalsCaptured} modals across ${s.pages} pages`);
  });
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
