/**
 * Directory Performance and Load Tests
 * Tests performance with large datasets and various load scenarios
 */

import { test, expect } from '@playwright/test';
import * as helpers from '../../helpers/directory-helpers';

const PROJECT_ID = 'INI-2026-01-09-001';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 2000, // 2 seconds
  search: 500, // 500ms
  filter: 1000, // 1 second
  createUser: 2000, // 2 seconds
  bulkOperation: 5000, // 5 seconds
  export: 10000, // 10 seconds
};

test.describe('Directory - Performance & Load Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up performance monitoring
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = {
        marks: {},
        measures: {},
      };

      // Override performance.mark to capture metrics
      const originalMark = performance.mark.bind(performance);
      performance.mark = function(name: string) {
        window.performanceMetrics.marks[name] = Date.now();
        return originalMark(name);
      };

      // Override performance.measure to capture metrics
      const originalMeasure = performance.measure.bind(performance);
      performance.measure = function(name: string, startMark?: string, endMark?: string) {
        const measure = originalMeasure(name, startMark, endMark);
        window.performanceMetrics.measures[name] = measure;
        return measure;
      };
    });

    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test.describe('Page Load Performance', () => {
    test('should load directory page within threshold', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`/${PROJECT_ID}/directory/users`);
      await helpers.waitForTable(page);

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
      console.log(`Page load time: ${loadTime}ms`);

      // Check Core Web Vitals
      const metrics = await page.evaluate(() => {
        return {
          FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
          LCP: performance.getEntriesByType('largest-contentful-paint').pop()?.startTime,
          CLS: performance.getEntriesByType('layout-shift').reduce((sum, entry: any) => sum + entry.value, 0),
        };
      });

      // Verify Core Web Vitals
      if (metrics.FCP) expect(metrics.FCP).toBeLessThan(1800); // Good FCP < 1.8s
      if (metrics.LCP) expect(metrics.LCP).toBeLessThan(2500); // Good LCP < 2.5s
      if (metrics.CLS) expect(metrics.CLS).toBeLessThan(0.1); // Good CLS < 0.1
    });

    test('should handle navigation between tabs efficiently', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      const tabs = ['contacts', 'companies', 'groups', 'users'];
      const navigationTimes: number[] = [];

      for (const tab of tabs) {
        const startTime = Date.now();
        await page.click(`a:has-text("${tab}"), button:has-text("${tab}")`);
        await helpers.waitForTable(page);
        const navTime = Date.now() - startTime;

        navigationTimes.push(navTime);
        expect(navTime).toBeLessThan(1000); // Each navigation < 1 second
      }

      const avgNavTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      console.log(`Average navigation time: ${avgNavTime}ms`);
    });
  });

  test.describe('Search Performance', () => {
    test('should search quickly with debouncing', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      const searchInput = page.locator('input[placeholder*="Search"]');

      // Type search query character by character
      const searchTerm = 'test user';
      let totalSearchTime = 0;

      for (const char of searchTerm) {
        await searchInput.press(char);
      }

      // Wait for debounce
      await page.waitForTimeout(300);

      // Measure search execution time
      const startTime = Date.now();
      await helpers.waitForTable(page);
      const searchTime = Date.now() - startTime;

      expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.search);
      console.log(`Search execution time: ${searchTime}ms`);
    });

    test('should handle complex search queries efficiently', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      const complexQueries = [
        'john.doe@example.com',
        'Project Manager',
        'Acme Corporation',
        'Active Admin',
      ];

      for (const query of complexQueries) {
        const startTime = Date.now();
        await helpers.searchInDirectory(page, query);
        const searchTime = Date.now() - startTime;

        expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.search * 2);
        console.log(`Complex search "${query}": ${searchTime}ms`);
      }
    });
  });

  test.describe('Filter Performance', () => {
    test('should filter data efficiently', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Apply multiple filters
      const filters = [
        { type: 'Company', value: 'Test Company' },
        { type: 'Status', value: 'Active' },
        { type: 'Permission', value: 'Admin' },
      ];

      for (const filter of filters) {
        const startTime = Date.now();
        await helpers.filterDirectory(page, filter.type, filter.value);
        const filterTime = Date.now() - startTime;

        expect(filterTime).toBeLessThan(PERFORMANCE_THRESHOLDS.filter);
        console.log(`Filter ${filter.type}: ${filterTime}ms`);
      }
    });

    test('should handle combined filters and search', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Apply filter
      await helpers.filterDirectory(page, 'Company', 'Test Company');

      // Then search within filtered results
      const startTime = Date.now();
      await helpers.searchInDirectory(page, 'manager');
      const combinedTime = Date.now() - startTime;

      expect(combinedTime).toBeLessThan(PERFORMANCE_THRESHOLDS.filter);
      console.log(`Combined filter + search: ${combinedTime}ms`);
    });
  });

  test.describe('Large Dataset Performance', () => {
    test('should handle pagination with large datasets', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Check for pagination controls
      const pagination = page.locator('.pagination, [aria-label*="Pagination"]');
      await expect(pagination).toBeVisible();

      // Navigate through pages
      const nextButton = page.locator('button:has-text("Next"), [aria-label="Next page"]');
      if (await nextButton.isEnabled()) {
        const startTime = Date.now();
        await nextButton.click();
        await helpers.waitForTable(page);
        const paginationTime = Date.now() - startTime;

        expect(paginationTime).toBeLessThan(1000);
        console.log(`Pagination time: ${paginationTime}ms`);
      }
    });

    test('should implement virtual scrolling for large lists', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Check for virtual scrolling implementation
      const tableContainer = page.locator('.table-container, [data-testid="directory-table"]');
      const hasVirtualScroll = await tableContainer.evaluate((el) => {
        return el.scrollHeight > el.clientHeight * 2; // Indicates virtual scrolling
      });

      if (hasVirtualScroll) {
        // Test scroll performance
        const startTime = Date.now();
        await tableContainer.evaluate((el) => {
          el.scrollTop = el.scrollHeight / 2;
        });
        await page.waitForTimeout(100); // Wait for render
        const scrollTime = Date.now() - startTime;

        expect(scrollTime).toBeLessThan(200);
        console.log(`Virtual scroll time: ${scrollTime}ms`);
      }
    });

    test('should load more items on scroll efficiently', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      const tableContainer = page.locator('.table-container, table').first();

      // Get initial row count
      const initialRows = await page.locator('tbody tr').count();

      // Scroll to bottom
      const startTime = Date.now();
      await tableContainer.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });

      // Wait for more items to load
      await page.waitForTimeout(500);
      const loadMoreTime = Date.now() - startTime;

      const newRows = await page.locator('tbody tr').count();

      if (newRows > initialRows) {
        expect(loadMoreTime).toBeLessThan(1000);
        console.log(`Load more time: ${loadMoreTime}ms, loaded ${newRows - initialRows} new rows`);
      }
    });
  });

  test.describe('Bulk Operations Performance', () => {
    test('should select all items quickly', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.waitForTable(page);

      const selectAllCheckbox = page.locator('thead input[type="checkbox"]').first();
      if (await selectAllCheckbox.isVisible()) {
        const startTime = Date.now();
        await selectAllCheckbox.check();
        await page.waitForTimeout(100); // Wait for UI update
        const selectAllTime = Date.now() - startTime;

        expect(selectAllTime).toBeLessThan(500);

        // Verify all checkboxes are selected
        const selectedCount = await page.locator('tbody input[type="checkbox"]:checked').count();
        expect(selectedCount).toBeGreaterThan(0);
        console.log(`Selected ${selectedCount} items in ${selectAllTime}ms`);
      }
    });

    test('should perform bulk operations within threshold', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Create test users for bulk operation
      const testUsers = [];
      for (let i = 0; i < 3; i++) {
        const userData = helpers.generateTestData().user;
        testUsers.push(userData);

        await helpers.openAddPersonDialog(page);
        await helpers.fillPersonForm(page, userData);
        await helpers.saveForm(page);
      }

      // Select all test users
      await helpers.selectMultipleRows(page, testUsers.map(u => u.email));

      // Perform bulk deactivation
      const startTime = Date.now();
      await helpers.performBulkAction(page, 'Deactivate');
      await page.waitForTimeout(1000); // Wait for operation to complete
      const bulkOpTime = Date.now() - startTime;

      expect(bulkOpTime).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkOperation);
      console.log(`Bulk deactivation of ${testUsers.length} users: ${bulkOpTime}ms`);
    });
  });

  test.describe('Export Performance', () => {
    test('should export data within threshold', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      await helpers.waitForTable(page);

      const exportButton = page.locator('button:has-text("Export")');
      if (await exportButton.isVisible()) {
        // Set up download promise
        const downloadPromise = page.waitForEvent('download', { timeout: PERFORMANCE_THRESHOLDS.export });

        const startTime = Date.now();
        await exportButton.click();

        // Select CSV format
        const csvOption = page.locator('text="CSV"');
        if (await csvOption.isVisible()) {
          await csvOption.click();
        }

        // Wait for download
        const download = await downloadPromise;
        const exportTime = Date.now() - startTime;

        expect(exportTime).toBeLessThan(PERFORMANCE_THRESHOLDS.export);
        console.log(`Export time: ${exportTime}ms`);

        // Verify file size is reasonable
        const path = await download.path();
        if (path) {
          const fs = require('fs');
          const stats = fs.statSync(path);
          console.log(`Export file size: ${(stats.size / 1024).toFixed(2)}KB`);
        }
      }
    });

    test('should handle large export efficiently', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Select all for export
      const selectAllCheckbox = page.locator('thead input[type="checkbox"]').first();
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
      }

      const exportButton = page.locator('button:has-text("Export")');
      if (await exportButton.isVisible()) {
        // Monitor memory usage during export
        const initialMemory = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize;
          }
          return 0;
        });

        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
        await exportButton.click();

        // Select format
        const xlsxOption = page.locator('text="Excel"');
        if (await xlsxOption.isVisible()) {
          await xlsxOption.click();
        }

        const download = await downloadPromise;

        const finalMemory = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize;
          }
          return 0;
        });

        const memoryIncrease = finalMemory - initialMemory;
        console.log(`Memory increase during export: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

        // Memory increase should be reasonable
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      }
    });
  });

  test.describe('Memory Performance', () => {
    test('should not have memory leaks during navigation', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      const memorySnapshots: number[] = [];

      // Navigate between tabs multiple times
      for (let i = 0; i < 5; i++) {
        const tabs = ['contacts', 'companies', 'groups', 'users'];

        for (const tab of tabs) {
          await page.click(`a:has-text("${tab}")`);
          await helpers.waitForTable(page);

          // Capture memory usage
          const memory = await page.evaluate(() => {
            if ('memory' in performance) {
              return (performance as any).memory.usedJSHeapSize;
            }
            return 0;
          });

          memorySnapshots.push(memory);
        }
      }

      // Check for memory leak pattern
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = lastSnapshot - firstSnapshot;

      console.log(`Memory growth over navigation: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

      // Memory growth should be minimal
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });

    test('should clean up after closing dialogs', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Open and close dialog multiple times
      for (let i = 0; i < 10; i++) {
        await helpers.openAddPersonDialog(page);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc();
        }
      });

      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      const memoryDiff = finalMemory - initialMemory;
      console.log(`Memory after dialog operations: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);

      // Memory should return close to initial state
      expect(memoryDiff).toBeLessThan(10 * 1024 * 1024); // Less than 10MB difference
    });
  });

  test.describe('Network Performance', () => {
    test('should minimize API calls during interaction', async ({ page }) => {
      // Track network requests
      const apiCalls: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          apiCalls.push(request.url());
        }
      });

      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Clear tracked calls from initial load
      apiCalls.length = 0;

      // Perform search
      await helpers.searchInDirectory(page, 'test');

      // Should debounce and make minimal API calls
      await page.waitForTimeout(1000);
      const searchApiCalls = apiCalls.filter(url => url.includes('search') || url.includes('people'));

      expect(searchApiCalls.length).toBeLessThanOrEqual(2); // Should batch/debounce requests
      console.log(`API calls for search: ${searchApiCalls.length}`);
    });

    test('should cache data appropriately', async ({ page }) => {
      const apiCalls: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          apiCalls.push(request.url());
        }
      });

      // Navigate to users
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
      const initialCallCount = apiCalls.length;

      // Navigate away and back
      await page.click('a:has-text("contacts")');
      await helpers.waitForTable(page);
      await page.click('a:has-text("users")');
      await helpers.waitForTable(page);

      // Should use cached data for returning to users
      const returnCallCount = apiCalls.filter(url => url.includes('users')).length;

      // Fewer calls on return (due to caching)
      expect(returnCallCount).toBeLessThan(initialCallCount);
      console.log(`Initial load: ${initialCallCount} calls, Return: ${returnCallCount} calls`);
    });
  });

  test.describe('Rendering Performance', () => {
    test('should render large tables efficiently', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Measure render performance
      const renderMetrics = await page.evaluate(() => {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.log(`${entry.name}: ${entry.duration}ms`);
          }
        });
        observer.observe({ entryTypes: ['measure'] });

        performance.mark('render-start');
        // Trigger re-render by changing something
        document.body.style.display = 'none';
        document.body.style.display = '';
        performance.mark('render-end');
        performance.measure('render-time', 'render-start', 'render-end');

        return performance.getEntriesByName('render-time')[0]?.duration;
      });

      if (renderMetrics) {
        expect(renderMetrics).toBeLessThan(100); // Render should be fast
        console.log(`Table render time: ${renderMetrics}ms`);
      }
    });

    test('should handle window resize efficiently', async ({ page }) => {
      await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

      // Test responsive performance
      const viewportSizes = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 768, height: 1024 },
        { width: 375, height: 667 },
      ];

      for (const size of viewportSizes) {
        const startTime = Date.now();
        await page.setViewportSize(size);
        await page.waitForTimeout(100); // Wait for layout
        const resizeTime = Date.now() - startTime;

        expect(resizeTime).toBeLessThan(500);
        console.log(`Resize to ${size.width}x${size.height}: ${resizeTime}ms`);
      }
    });
  });
});

// Configure test timeout for performance tests
test.use({
  timeout: 60000, // 60 seconds for performance tests
});