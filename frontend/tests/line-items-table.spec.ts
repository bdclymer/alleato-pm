import { test, expect } from '@playwright/test'

test.describe('LineItemsTable Component', () => {
  test('LineItemsTable supports add, edit, delete and calculates totals', async ({ page }) => {
    // Navigate to test page
    await page.goto('http://localhost:3000/test-line-items')
    await page.waitForLoadState('domcontentloaded')

    // Step 1: Render LineItemsTable with empty items
    await expect(page.getByText('LineItemsTable Test Page')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('No line items yet')).toBeVisible()

    // Step 2: Click Add Item - verify new row appears
    await page.getByTestId('add-line-item-button').click()
    await expect(page.getByTestId('line-item-description-0')).toBeVisible()

    // Step 3: Enter description, quantity, unit price
    await page.getByTestId('line-item-description-0').fill('Test Line Item 1')
    await page.getByTestId('line-item-quantity-0').fill('10')
    await page.getByTestId('line-item-unit-price-0').fill('100')

    // Step 4: Verify extended amount calculates correctly (qty x unit price = 10 * 100 = 1000)
    await page.waitForTimeout(500)
    const extendedAmount = await page.getByTestId('line-item-extended-0').inputValue()
    expect(extendedAmount).toContain('1,000')

    // Step 5: Add multiple items - verify subtotal updates
    await page.getByTestId('add-line-item-button').click()
    await page.getByTestId('line-item-description-1').fill('Test Line Item 2')
    await page.getByTestId('line-item-quantity-1').fill('5')
    await page.getByTestId('line-item-unit-price-1').fill('50')
    await page.waitForTimeout(500)

    // Check subtotal (should be 1000 + 250 = 1250)
    await expect(page.locator('text=Subtotal:').locator('..')).toContainText('1,250')
    await expect(page.locator('text=/Total:/i').last()).toContainText('1,250')

    // Step 6: Click delete on a row - verify row removed and total recalculates
    await page.getByTestId('line-item-description-0').hover()
    await page.waitForTimeout(300)

    // Click the first delete button that appears
    const deleteButtons = page.getByRole('button').filter({ has: page.locator('svg').filter({ hasText: '' }) })
    await deleteButtons.first().click({ force: true })
    await page.waitForTimeout(500)

    // Verify only one item remains and total recalculated
    await expect(page.getByTestId('line-item-description-1')).not.toBeVisible()
    await expect(page.locator('text=/Total:/i').last()).toContainText('250')

    // Step 7: In readOnly mode - verify inputs are disabled
    await page.getByRole('button', { name: /Toggle Read Only/i }).click()
    await page.waitForTimeout(500)

    // Verify inputs are not present (replaced with read-only text)
    await expect(page.getByTestId('line-item-description-0')).not.toBeVisible()
    await expect(page.getByTestId('add-line-item-button')).not.toBeVisible()

    // Verify the data is still displayed as text
    await expect(page.getByText('Test Line Item 2')).toBeVisible()
  })
})
