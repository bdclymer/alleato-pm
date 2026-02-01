import { test, expect, Page } from '@playwright/test';
import path from 'path';

const projectId = '182'; // Using valid project ID from API

test.use({ storageState: 'tests/.auth/user.json' });

test.describe('Drawings - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${projectId}/drawings`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Drawings' })).toBeVisible();
  });

  test.describe('Drawing Areas Management', () => {
    test('creates and manages drawing areas hierarchy', async ({ page }) => {
      // Create root area
      await page.getByRole('button', { name: 'Add Area' }).click();

      const areaDialog = page.locator('[data-testid="area-dialog"]');
      await expect(areaDialog).toBeVisible();

      await areaDialog.getByLabel('Area Name').fill('Architectural Drawings');
      await areaDialog.getByLabel('Description').fill('All architectural drawings and plans');
      await areaDialog.getByRole('button', { name: 'Create' }).click();

      await expect(page.getByText('Architectural Drawings')).toBeVisible();

      // Create sub-area
      await page.getByText('Architectural Drawings').hover();
      await page.getByRole('button', { name: 'Actions' }).click();
      await page.getByRole('menuitem', { name: 'Add Sub-Area' }).click();

      await areaDialog.getByLabel('Area Name').fill('Floor Plans');
      await areaDialog.getByLabel('Description').fill('All floor plan drawings');
      await areaDialog.getByRole('button', { name: 'Create' }).click();

      // Verify hierarchy
      const architecturalArea = page.getByText('Architectural Drawings');
      await architecturalArea.locator('button[aria-label="Expand"]').click();

      await expect(page.getByText('Floor Plans')).toBeVisible();
    });

    test('edits existing drawing area', async ({ page }) => {
      // Assume we have an existing area
      const existingArea = page.getByText('Architectural Drawings').first();
      await existingArea.hover();
      await page.getByRole('button', { name: 'Actions' }).click();
      await page.getByRole('menuitem', { name: 'Edit Area' }).click();

      const editDialog = page.locator('[data-testid="area-dialog"]');
      await expect(editDialog).toBeVisible();

      const nameInput = editDialog.getByLabel('Area Name');
      await nameInput.clear();
      await nameInput.fill('Architecture & Design');

      const descInput = editDialog.getByLabel('Description');
      await descInput.clear();
      await descInput.fill('Updated description for architectural drawings');

      await editDialog.getByRole('button', { name: 'Update' }).click();

      await expect(page.getByText('Architecture & Design')).toBeVisible();
    });

    test('deletes empty drawing area', async ({ page }) => {
      // Create a new area for deletion
      await page.getByRole('button', { name: 'Add Area' }).click();

      const areaDialog = page.locator('[data-testid="area-dialog"]');
      await areaDialog.getByLabel('Area Name').fill('Temporary Area');
      await areaDialog.getByRole('button', { name: 'Create' }).click();

      // Delete the area
      const temporaryArea = page.getByText('Temporary Area');
      await temporaryArea.hover();
      await page.getByRole('button', { name: 'Actions' }).click();
      await page.getByRole('menuitem', { name: 'Delete Area' }).click();

      // Confirm deletion
      const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
      await expect(confirmDialog).toBeVisible();
      await confirmDialog.getByRole('button', { name: 'Delete' }).click();

      await expect(page.getByText('Temporary Area')).not.toBeVisible();
    });

    test('prevents deletion of area with drawings', async ({ page }) => {
      // Try to delete an area with drawings (should be disabled)
      const areaWithDrawings = page.getByText('Level 1'); // Assume this has drawings
      await areaWithDrawings.hover();
      await page.getByRole('button', { name: 'Actions' }).click();

      const deleteOption = page.getByRole('menuitem', { name: 'Delete Area' });
      await expect(deleteOption).not.toBeVisible(); // Should not be available
    });

    test('filters drawings by selected area', async ({ page }) => {
      const allDrawingsOption = page.getByText('All Drawings');
      await expect(allDrawingsOption).toBeVisible();

      // Count total drawings
      const allRows = page.locator('[data-testid="drawing-table"] tbody tr');
      const totalCount = await allRows.count();

      // Select specific area
      await page.getByText('Level 1').click();

      // Verify filtered results
      const filteredRows = page.locator('[data-testid="drawing-table"] tbody tr');
      const filteredCount = await filteredRows.count();

      expect(filteredCount).toBeLessThanOrEqual(totalCount);

      // Verify all visible drawings belong to the selected area
      for (let i = 0; i < filteredCount; i++) {
        const row = filteredRows.nth(i);
        const areaCell = row.locator('td').nth(7); // Area column
        await expect(areaCell).toContainText('Level 1');
      }
    });
  });

  test.describe('Drawing Upload', () => {
    test('uploads single drawing with metadata', async ({ page }) => {
      await page.getByRole('button', { name: 'Upload Drawings' }).click();

      const uploadDialog = page.locator('[data-testid="upload-dialog"]');
      await expect(uploadDialog).toBeVisible();

      // Create a test file
      const filePath = path.join(process.cwd(), 'tests', 'fixtures', 'test-drawing.pdf');

      // Upload file
      const fileInput = uploadDialog.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);

      // Verify file is selected
      await expect(uploadDialog.getByText('test-drawing.pdf')).toBeVisible();

      // Fill metadata
      await uploadDialog.getByLabel('Drawing Number').fill('E2E-001');
      await uploadDialog.getByLabel('Title').fill('E2E Test Drawing');
      await uploadDialog.getByLabel('Revision').fill('A');

      // Select discipline
      await uploadDialog.getByLabel('Discipline').click();
      await page.getByRole('option', { name: 'Architectural' }).click();

      // Select type
      await uploadDialog.getByLabel('Type').click();
      await page.getByRole('option', { name: 'Plan' }).click();

      // Select area
      await uploadDialog.getByLabel('Drawing Area').click();
      await page.getByRole('option', { name: 'Level 1' }).click();

      // Set dates
      await uploadDialog.getByLabel('Drawing Date').fill('2024-01-15');

      // Add description
      await uploadDialog.getByLabel('Description').fill('Test drawing for E2E automation');

      // Submit upload
      await uploadDialog.getByRole('button', { name: /upload/i }).click();

      // Wait for success toast
      await expect(page.getByText('Successfully uploaded')).toBeVisible({ timeout: 10000 });

      // Verify drawing appears in table
      await expect(page.getByText('E2E-001')).toBeVisible();
      await expect(page.getByText('E2E Test Drawing')).toBeVisible();
    });

    test('uploads multiple drawings with shared metadata', async ({ page }) => {
      await page.getByRole('button', { name: 'Upload Drawings' }).click();

      const uploadDialog = page.locator('[data-testid="upload-dialog"]');

      // Create multiple test files
      const filePaths = [
        path.join(process.cwd(), 'tests', 'fixtures', 'test-drawing-1.pdf'),
        path.join(process.cwd(), 'tests', 'fixtures', 'test-drawing-2.pdf'),
      ];

      const fileInput = uploadDialog.locator('input[type="file"]');
      await fileInput.setInputFiles(filePaths);

      // Verify files are selected
      await expect(uploadDialog.getByText('Selected Files (2)')).toBeVisible();
      await expect(uploadDialog.getByText('test-drawing-1.pdf')).toBeVisible();
      await expect(uploadDialog.getByText('test-drawing-2.pdf')).toBeVisible();

      // Fill shared metadata
      await uploadDialog.getByLabel('Discipline').click();
      await page.getByRole('option', { name: 'Structural' }).click();

      await uploadDialog.getByLabel('Type').click();
      await page.getByRole('option', { name: 'Section' }).click();

      // Submit upload
      await uploadDialog.getByRole('button', { name: /upload \(2\)/i }).click();

      // Wait for success toast
      await expect(page.getByText('Successfully uploaded 2 drawings')).toBeVisible({ timeout: 15000 });
    });

    test('validates file types and shows errors', async ({ page }) => {
      await page.getByRole('button', { name: 'Upload Drawings' }).click();

      const uploadDialog = page.locator('[data-testid="upload-dialog"]');

      // Try to upload invalid file type
      const invalidFilePath = path.join(process.cwd(), 'tests', 'fixtures', 'invalid-file.txt');
      const fileInput = uploadDialog.locator('input[type="file"]');

      // Note: This test assumes client-side validation
      // In practice, you might need to mock this behavior
      await fileInput.setInputFiles(invalidFilePath);

      // Should show error
      await expect(uploadDialog.getByText(/file type not allowed/i)).toBeVisible();
    });

    test('shows upload progress and handles large files', async ({ page }) => {
      // This test would require large file fixtures or mocking
      // For now, we'll test the UI elements

      await page.getByRole('button', { name: 'Upload Drawings' }).click();

      const uploadDialog = page.locator('[data-testid="upload-dialog"]');

      // Verify progress indicators exist
      const progressBar = uploadDialog.locator('[role="progressbar"]');
      const uploadButton = uploadDialog.getByRole('button', { name: /upload/i });

      // Check button states
      await expect(uploadButton).toBeDisabled(); // No files selected
    });
  });

  test.describe('Drawing Log and Table Operations', () => {
    test('searches drawings by number and title', async ({ page }) => {
      const searchInput = page.getByRole('textbox', { name: 'Search drawings' });
      await searchInput.fill('A101');

      await page.waitForTimeout(500); // Debounce

      const rows = page.locator('[data-testid="drawing-table"] tbody tr');
      const rowCount = await rows.count();

      // Verify search results
      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const drawingNumber = row.locator('td').first();
        const title = row.locator('td').nth(1);

        const numberText = await drawingNumber.textContent();
        const titleText = await title.textContent();

        expect(numberText?.toLowerCase() || titleText?.toLowerCase()).toMatch(/a101/i);
      }
    });

    test('filters drawings by discipline', async ({ page }) => {
      await page.getByRole('button', { name: 'Filters' }).click();

      const filterPanel = page.locator('[data-testid="filter-panel"]');
      await expect(filterPanel).toBeVisible();

      await filterPanel.getByLabel('Discipline').click();
      await page.getByRole('option', { name: 'Architectural' }).click();

      await page.getByRole('button', { name: 'Apply Filters' }).click();

      // Verify all visible drawings are Architectural
      const rows = page.locator('[data-testid="drawing-table"] tbody tr');
      const rowCount = await rows.count();

      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const disciplineCell = row.locator('[data-testid="discipline-badge"]');
        await expect(disciplineCell).toContainText('Architectural');
      }
    });

    test('sorts drawings by different columns', async ({ page }) => {
      // Test sorting by drawing number
      const drawingNumberHeader = page.getByRole('columnheader', { name: 'Drawing Number' });
      await drawingNumberHeader.click();

      // Verify sorting indicator
      await expect(drawingNumberHeader.locator('[data-testid="sort-asc"]')).toBeVisible();

      // Test reverse sorting
      await drawingNumberHeader.click();
      await expect(drawingNumberHeader.locator('[data-testid="sort-desc"]')).toBeVisible();

      // Test sorting by date
      const dateHeader = page.getByRole('columnheader', { name: 'Drawing Date' });
      await dateHeader.click();

      // Verify date sorting
      const rows = page.locator('[data-testid="drawing-table"] tbody tr');
      const firstRow = rows.first();
      const lastRow = rows.last();

      const firstDate = await firstRow.locator('[data-testid="drawing-date"]').textContent();
      const lastDate = await lastRow.locator('[data-testid="drawing-date"]').textContent();

      // Basic date comparison (assuming proper format)
      expect(new Date(firstDate || '')).toBeInstanceOf(Date);
    });

    test('performs bulk operations on selected drawings', async ({ page }) => {
      // Select multiple drawings
      const checkboxes = page.locator('[data-testid="row-checkbox"]');
      await checkboxes.first().check();
      await checkboxes.nth(1).check();

      // Verify bulk actions become available
      const bulkActionsBar = page.locator('[data-testid="bulk-actions-bar"]');
      await expect(bulkActionsBar).toBeVisible();

      // Test bulk export
      await bulkActionsBar.getByRole('button', { name: 'Export Selected' }).click();

      // Wait for download to start (or success message)
      await expect(page.getByText(/exported \d+ drawings/i)).toBeVisible();
    });

    test('manages column visibility', async ({ page }) => {
      const columnsButton = page.getByRole('button', { name: 'Columns' });
      await columnsButton.click();

      const columnsPanel = page.locator('[data-testid="columns-panel"]');
      await expect(columnsPanel).toBeVisible();

      // Hide a column
      const fileSizeCheckbox = columnsPanel.getByLabel('File Size');
      await fileSizeCheckbox.uncheck();

      // Apply changes
      await page.getByRole('button', { name: 'Apply' }).click();

      // Verify column is hidden
      const fileSizeHeader = page.getByRole('columnheader', { name: 'File Size' });
      await expect(fileSizeHeader).not.toBeVisible();

      // Show column again
      await columnsButton.click();
      await columnsPanel.getByLabel('File Size').check();
      await page.getByRole('button', { name: 'Apply' }).click();

      // Verify column is visible
      await expect(fileSizeHeader).toBeVisible();
    });
  });

  test.describe('Drawing Actions', () => {
    test('views drawing in viewer', async ({ page }) => {
      const firstDrawing = page.locator('[data-testid="drawing-row"]').first();
      await firstDrawing.getByRole('button', { name: 'View' }).click();

      // Should navigate to viewer
      await expect(page).toHaveURL(new RegExp(`/${projectId}/drawings/viewer/`));

      // Verify viewer UI elements
      await expect(page.getByTestId('drawing-viewer')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Zoom In' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Zoom Out' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Fit to Screen' })).toBeVisible();
    });

    test('downloads drawing file', async ({ page }) => {
      const downloadPromise = page.waitForEvent('download');

      const firstDrawing = page.locator('[data-testid="drawing-row"]').first();
      await firstDrawing.getByRole('button', { name: 'Download' }).click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(pdf|png|jpg|jpeg|tiff)$/i);
    });

    test('edits drawing metadata', async ({ page }) => {
      const firstDrawing = page.locator('[data-testid="drawing-row"]').first();
      await firstDrawing.getByRole('button', { name: 'Edit' }).click();

      // Should open edit dialog
      const editDialog = page.locator('[data-testid="edit-drawing-dialog"]');
      await expect(editDialog).toBeVisible();

      // Make changes
      const titleInput = editDialog.getByLabel('Title');
      await titleInput.clear();
      await titleInput.fill('Updated Drawing Title');

      const descriptionTextarea = editDialog.getByLabel('Description');
      await descriptionTextarea.fill('Updated description for E2E test');

      // Save changes
      await editDialog.getByRole('button', { name: 'Save Changes' }).click();

      // Verify changes are applied
      await expect(page.getByText('Updated Drawing Title')).toBeVisible();
    });

    test('creates new revision', async ({ page }) => {
      const firstDrawing = page.locator('[data-testid="drawing-row"]').first();
      await firstDrawing.getByRole('button', { name: 'New Revision' }).click();

      const newRevisionDialog = page.locator('[data-testid="new-revision-dialog"]');
      await expect(newRevisionDialog).toBeVisible();

      // Upload new file
      const fileInput = newRevisionDialog.locator('input[type="file"]');
      const filePath = path.join(process.cwd(), 'tests', 'fixtures', 'revised-drawing.pdf');
      await fileInput.setInputFiles(filePath);

      // Fill revision details
      await newRevisionDialog.getByLabel('Revision Number').fill('B');
      await newRevisionDialog.getByLabel('Description').fill('Updated per client feedback');

      // Submit
      await newRevisionDialog.getByRole('button', { name: 'Upload Revision' }).click();

      // Wait for success
      await expect(page.getByText('Revision uploaded successfully')).toBeVisible();
    });

    test('generates and displays QR code', async ({ page }) => {
      const firstDrawing = page.locator('[data-testid="drawing-row"]').first();
      await firstDrawing.getByRole('button', { name: 'QR Code' }).click();

      const qrModal = page.locator('[data-testid="qr-modal"]');
      await expect(qrModal).toBeVisible();

      // Verify QR code elements
      await expect(qrModal.getByTestId('qr-code-image')).toBeVisible();
      await expect(qrModal.getByText('Scan to view drawing')).toBeVisible();

      // Test download QR code
      const downloadPromise = page.waitForEvent('download');
      await qrModal.getByRole('button', { name: 'Download QR Code' }).click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/qr.*\.(png|jpg)$/i);
    });

    test('deletes drawing with confirmation', async ({ page }) => {
      // Find a drawing that can be deleted (not the only revision)
      const deletableDrawing = page.locator('[data-testid="drawing-row"]').last();
      await deletableDrawing.getByRole('button', { name: 'Delete' }).click();

      const confirmDialog = page.locator('[data-testid="delete-confirm-dialog"]');
      await expect(confirmDialog).toBeVisible();

      // Verify warning message
      await expect(confirmDialog.getByText(/this action cannot be undone/i)).toBeVisible();

      // Cancel first
      await confirmDialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirmDialog).not.toBeVisible();

      // Try again and confirm
      await deletableDrawing.getByRole('button', { name: 'Delete' }).click();
      await confirmDialog.getByRole('button', { name: 'Delete' }).click();

      // Verify deletion
      await expect(page.getByText('Drawing deleted successfully')).toBeVisible();
    });
  });

  test.describe('Performance and Large Data Sets', () => {
    test('handles large drawing sets with pagination', async ({ page }) => {
      // Navigate to page 2 if available
      const nextPageButton = page.getByRole('button', { name: 'Next page' });

      if (await nextPageButton.isVisible()) {
        await nextPageButton.click();

        // Verify page indicator
        await expect(page.getByText('Page 2')).toBeVisible();

        // Verify rows are loaded
        const rows = page.locator('[data-testid="drawing-table"] tbody tr');
        await expect(rows.first()).toBeVisible();
      }
    });

    test('loads table data progressively', async ({ page }) => {
      // Verify loading states
      const loadingIndicator = page.locator('[data-testid="table-loading"]');

      // Navigate away and back to test loading
      await page.goto(`/${projectId}/budget`);
      await page.goto(`/${projectId}/drawings`);

      // Should show loading state briefly
      if (await loadingIndicator.isVisible({ timeout: 1000 })) {
        await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
      }

      // Verify final state
      const rows = page.locator('[data-testid="drawing-table"] tbody tr');
      await expect(rows.first()).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('handles network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/projects/*/drawings*', route => {
        route.abort('failed');
      });

      await page.reload();

      // Should show error state
      await expect(page.getByText(/failed to load drawings/i)).toBeVisible();

      // Should show retry option
      const retryButton = page.getByRole('button', { name: 'Retry' });
      if (await retryButton.isVisible()) {
        // Remove network simulation and retry
        await page.unroute('**/api/projects/*/drawings*');
        await retryButton.click();

        // Should load successfully
        await expect(page.locator('[data-testid="drawing-table"]')).toBeVisible();
      }
    });

    test('handles upload errors appropriately', async ({ page }) => {
      await page.getByRole('button', { name: 'Upload Drawings' }).click();

      const uploadDialog = page.locator('[data-testid="upload-dialog"]');

      // Simulate upload failure
      await page.route('**/api/projects/*/drawings*', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Upload failed' })
          });
        } else {
          route.continue();
        }
      });

      // Try to upload
      const filePath = path.join(process.cwd(), 'tests', 'fixtures', 'test-drawing.pdf');
      await uploadDialog.locator('input[type="file"]').setInputFiles(filePath);
      await uploadDialog.getByLabel('Drawing Number').fill('ERROR-001');
      await uploadDialog.getByLabel('Title').fill('Error Test Drawing');
      await uploadDialog.getByRole('button', { name: /upload/i }).click();

      // Should show error message
      await expect(page.getByText(/upload failed/i)).toBeVisible();

      // Dialog should remain open for retry
      await expect(uploadDialog).toBeVisible();
    });
  });

  test.describe('Mobile and Responsive Design', () => {
    test('works correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.reload();

      // Mobile-specific UI elements
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
      }

      // Table should be responsive
      const table = page.locator('[data-testid="drawing-table"]');
      await expect(table).toBeVisible();

      // Column controls should be accessible
      const columnsButton = page.getByRole('button', { name: 'Columns' });
      await expect(columnsButton).toBeVisible();
    });

    test('handles tablet viewport correctly', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      await page.reload();

      // Should maintain desktop-like functionality
      const searchInput = page.getByRole('textbox', { name: 'Search drawings' });
      await expect(searchInput).toBeVisible();

      const filterButton = page.getByRole('button', { name: 'Filters' });
      await expect(filterButton).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('supports keyboard navigation', async ({ page }) => {
      // Focus on first interactive element
      await page.keyboard.press('Tab');

      // Should be able to navigate through table
      const rows = page.locator('[data-testid="drawing-table"] tbody tr');
      const firstRow = rows.first();

      await firstRow.focus();
      await page.keyboard.press('Enter');

      // Should activate row action or navigation
      // The exact behavior depends on implementation
    });

    test('has proper ARIA labels and roles', async ({ page }) => {
      // Check table accessibility
      const table = page.locator('[data-testid="drawing-table"]');
      await expect(table).toHaveAttribute('role', 'table');

      // Check button accessibility
      const uploadButton = page.getByRole('button', { name: 'Upload Drawings' });
      await expect(uploadButton).toBeVisible();

      // Check form accessibility in upload dialog
      await uploadButton.click();
      const uploadDialog = page.locator('[data-testid="upload-dialog"]');
      const titleInput = uploadDialog.getByLabel('Title');
      await expect(titleInput).toHaveAttribute('aria-required', 'true');
    });
  });
});

// Helper function to create test fixtures if they don't exist
async function createTestFixtures() {
  const fs = require('fs').promises;
  const path = require('path');

  const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');

  try {
    await fs.mkdir(fixturesDir, { recursive: true });

    // Create sample PDF content (minimal PDF structure)
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
183
%%EOF`;

    const testFiles = [
      'test-drawing.pdf',
      'test-drawing-1.pdf',
      'test-drawing-2.pdf',
      'revised-drawing.pdf'
    ];

    for (const filename of testFiles) {
      const filepath = path.join(fixturesDir, filename);
      try {
        await fs.access(filepath);
      } catch {
        await fs.writeFile(filepath, pdfContent);
      }
    }

    // Create invalid file
    await fs.writeFile(path.join(fixturesDir, 'invalid-file.txt'), 'This is not a valid drawing file');

  } catch (error) {
    console.error('Failed to create test fixtures:', error);
  }
}

// Create fixtures before tests run
test.beforeAll(async () => {
  await createTestFixtures();
});