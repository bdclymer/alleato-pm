#!/usr/bin/env node
/**
 * Debug: click a known money cell on the Budget page, then dump every new
 * top-level element that appeared in the DOM. This tells us the actual
 * modal/sheet selector Procore uses.
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');
dotenv.config({ path: join(PROJECT_ROOT, '.env') });

const PROCORE_EMAIL = process.env.PROCORE_USER;
const PROCORE_PASSWORD = process.env.PROCORE_PASSWORD;

async function authenticate(page) {
  await page.goto('https://login.procore.com', { waitUntil: 'domcontentloaded' });
  if (page.url().includes('login.procore.com')) {
    await page.waitForSelector('input[type="email"], input[name="session[email]"]', { timeout: 10000 });
    await page.fill('input[type="email"], input[name="session[email]"]', PROCORE_EMAIL);
    const next = page.locator('button:has-text("Next"), button[type="submit"]:has-text("Continue")');
    if ((await next.count()) > 0) { await next.first().click(); await page.waitForTimeout(1500); }
    await page.fill('input[type="password"]', PROCORE_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await authenticate(page);

  const url = 'https://us02.procore.com/562949954728542/project/budgeting';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.ag-root', { timeout: 15000 });
  await page.waitForTimeout(3000);

  // Snapshot the body before any click
  const before = await page.evaluate(() => {
    const els = Array.from(document.body.children).map((e) => ({
      tag: e.tagName, id: e.id, cls: typeof e.className === 'string' ? e.className.slice(0, 100) : '',
    }));
    return els;
  });
  console.log('Before click — top-level body children:', before.length);
  before.slice(0, 20).forEach(e => console.log(' -', e.tag, e.id || '(no id)', e.cls.slice(0, 60)));

  // Find a money cell and click it
  const target = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('.ag-cell'));
    for (const c of cells) {
      const txt = (c.textContent || '').trim();
      if (/^\$[\d,]+(\.\d+)?$/.test(txt) && parseFloat(txt.replace(/[$,]/g, '')) > 100) {
        const r = c.getBoundingClientRect();
        return { text: txt, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
      }
    }
    return null;
  });
  console.log('\nTarget money cell:', target);
  if (!target) {
    await browser.close();
    process.exit(0);
  }

  await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(1500);

  // What changed?
  const after = await page.evaluate((beforeJSON) => {
    const beforeSet = new Set(JSON.parse(beforeJSON).map((e) => e.tag + '|' + e.id + '|' + e.cls));
    const els = Array.from(document.body.children).map((e) => ({
      tag: e.tagName,
      id: e.id,
      cls: typeof e.className === 'string' ? e.className : '',
    }));
    const newOnes = els.filter((e) => !beforeSet.has(e.tag + '|' + e.id + '|' + e.cls));
    return { all: els.length, newOnes };
  }, JSON.stringify(before));

  console.log('\nAfter click — top-level body children:', after.all);
  console.log('NEW elements:');
  after.newOnes.forEach(e => console.log(' +', e.tag, e.id || '(no id)', e.cls.slice(0, 120)));

  // Also check for any elements with role="dialog" or with "modal/sheet/drawer/panel" in class
  const overlays = await page.evaluate(() => {
    const matches = [];
    document.querySelectorAll('*').forEach((el) => {
      const role = el.getAttribute('role');
      const cls = typeof el.className === 'string' ? el.className : '';
      if (role === 'dialog' || role === 'alertdialog' || /sheet|drawer|sidepanel|modal|sidebar/i.test(cls)) {
        const r = el.getBoundingClientRect();
        if (r.width > 100 && r.height > 100) {
          matches.push({
            tag: el.tagName,
            role,
            id: el.id,
            cls: cls.slice(0, 200),
            w: Math.round(r.width),
            h: Math.round(r.height),
            x: Math.round(r.x),
          });
        }
      }
    });
    return matches;
  });
  console.log('\nOverlay-like elements currently visible:');
  overlays.slice(0, 20).forEach(o => console.log(' ★', o.tag, `${o.w}x${o.h}@x=${o.x}`, `role=${o.role || '-'}`, o.cls.slice(0, 100)));

  // Screenshot
  mkdirSync(join(PROJECT_ROOT, '.claude/procore-manifests/budget'), { recursive: true });
  await page.screenshot({ path: join(PROJECT_ROOT, '.claude/procore-manifests/budget/_debug-after-click.png'), fullPage: false });

  await browser.close();
})();
