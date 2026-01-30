import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, '../../design-review-screenshots');

test.describe('Homepage Design Review', () => {
  test.beforeAll(() => {
    // Create screenshots directory
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
  });

  test.use({
    storageState: 'tests/.auth/user.json'
  });

  test('Phase 0: Setup and Initial State', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Capture initial desktop view
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-homepage-desktop-1440.png'),
      fullPage: true
    });

    console.log('✓ Homepage loaded and captured');
  });

  test('Phase 1: Interaction Testing', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Capture all interactive elements
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons`);

    const links = await page.locator('a').all();
    console.log(`Found ${links.length} links`);

    // Test hover states on primary buttons
    const primaryButtons = await page.locator('button, a[role="button"]').all();
    if (primaryButtons.length > 0) {
      await primaryButtons[0].hover();
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '02-button-hover-state.png')
      });
    }

    // Capture navigation/sidebar
    const nav = page.locator('nav').first();
    if (await nav.isVisible()) {
      await nav.screenshot({
        path: path.join(SCREENSHOTS_DIR, '03-navigation.png')
      });
    }
  });

  test('Phase 2: Responsive Testing', async ({ page, browser }) => {
    // Desktop (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-desktop-1440x900.png'),
      fullPage: true
    });

    // Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-tablet-768x1024.png'),
      fullPage: true
    });

    // Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06-mobile-375x667.png'),
      fullPage: true
    });

    // Check for horizontal scrolling on mobile
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`Mobile scroll check: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);

    if (scrollWidth > clientWidth) {
      console.log('⚠️ WARNING: Horizontal scrolling detected on mobile');
    }
  });

  test('Phase 3: Accessibility - Keyboard Navigation', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Test Tab key navigation
    console.log('Testing keyboard navigation...');

    // Press Tab multiple times and track focus
    const focusableElements = [];
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          id: el?.id,
          class: el?.className,
          text: el?.textContent?.slice(0, 50),
          hasVisibleOutline: window.getComputedStyle(el!).outline !== 'none'
        };
      });

      focusableElements.push(focusedElement);

      // Capture focus state
      if (i === 5) {
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, '07-keyboard-focus-state.png')
        });
      }
    }

    console.log('Focusable elements:', JSON.stringify(focusableElements, null, 2));
  });

  test('Phase 4: Accessibility - Semantic HTML and ARIA', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check semantic structure
    const semanticCheck = await page.evaluate(() => {
      return {
        hasMain: !!document.querySelector('main'),
        hasNav: !!document.querySelector('nav'),
        hasHeader: !!document.querySelector('header'),
        hasFooter: !!document.querySelector('footer'),
        h1Count: document.querySelectorAll('h1').length,
        h2Count: document.querySelectorAll('h2').length,
        landmarkCount: document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]').length,
        imagesWithoutAlt: Array.from(document.querySelectorAll('img')).filter(img => !img.alt).length,
        buttonsWithoutLabel: Array.from(document.querySelectorAll('button')).filter(btn =>
          !btn.textContent?.trim() && !btn.getAttribute('aria-label')
        ).length
      };
    });

    console.log('Semantic HTML Check:', JSON.stringify(semanticCheck, null, 2));
  });

  test('Phase 5: Accessibility - Color Contrast', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Sample text elements and check contrast
    const contrastCheck = await page.evaluate(() => {
      const getContrast = (fg: string, bg: string) => {
        const getLuminance = (color: string) => {
          const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
          const [r, g, b] = rgb.map(val => {
            const s = val / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const l1 = getLuminance(fg);
        const l2 = getLuminance(bg);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      };

      const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, button, a, span, label'));
      const samples = textElements.slice(0, 10).map(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const bgColor = styles.backgroundColor;
        const fontSize = styles.fontSize;

        return {
          text: el.textContent?.slice(0, 30),
          color,
          bgColor,
          fontSize,
          contrast: getContrast(color, bgColor)
        };
      });

      return samples;
    });

    console.log('Color Contrast Samples:', JSON.stringify(contrastCheck, null, 2));
  });

  test('Phase 6: Typography and Spacing', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const typographyCheck = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const paragraphs = Array.from(document.querySelectorAll('p'));

      return {
        headings: headings.map(h => ({
          tag: h.tagName,
          fontSize: window.getComputedStyle(h).fontSize,
          fontWeight: window.getComputedStyle(h).fontWeight,
          lineHeight: window.getComputedStyle(h).lineHeight,
          marginBottom: window.getComputedStyle(h).marginBottom,
          text: h.textContent?.slice(0, 50)
        })),
        paragraphs: paragraphs.slice(0, 5).map(p => ({
          fontSize: window.getComputedStyle(p).fontSize,
          lineHeight: window.getComputedStyle(p).lineHeight,
          marginBottom: window.getComputedStyle(p).marginBottom,
          text: p.textContent?.slice(0, 50)
        }))
      };
    });

    console.log('Typography Analysis:', JSON.stringify(typographyCheck, null, 2));
  });

  test('Phase 7: Console Errors', async ({ page }) => {
    const consoleMessages: any[] = [];
    const pageErrors: any[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text()
        });
      }
    });

    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for any async errors

    console.log('Console Messages:', JSON.stringify(consoleMessages, null, 2));
    console.log('Page Errors:', JSON.stringify(pageErrors, null, 2));
  });

  test('Phase 8: DOM Snapshot', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Get full HTML structure
    const html = await page.content();
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'homepage-dom.html'),
      html
    );

    // Get computed styles snapshot
    const styleSnapshot = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      return {
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        lineHeight: styles.lineHeight
      };
    });

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'body-styles.json'),
      JSON.stringify(styleSnapshot, null, 2)
    );

    console.log('DOM snapshot saved');
  });
});
