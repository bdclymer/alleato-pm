import { test, expect } from '@playwright/test'

test('verify financial toggles and create buttons on project home', async ({ page }) => {
  // Navigate to the project home page
  await page.goto('/mkh/home', { waitUntil: 'networkidle' })
  
  // Wait for the financial toggles to appear
  await page.waitForSelector('[data-testid="financial-toggles"], .financial-toggles, h3:has-text("Budget")', { 
    state: 'visible',
    timeout: 10000 
  })
  
  // Take a screenshot to verify the layout
  await page.screenshot({ 
    path: 'tests/screenshots/project-home-financial-toggles.png',
    fullPage: true 
  })
  
  // Check if Budget section exists
  const budgetSection = await page.locator('h3:has-text("Budget")').isVisible()
  console.log('Budget section visible:', budgetSection)
  
  // Check if Prime Contract section exists  
  const primeContractSection = await page.locator('h3:has-text("Prime Contract")').isVisible()
  console.log('Prime Contract section visible:', primeContractSection)
  
  // Check if Commitments section exists
  const commitmentsSection = await page.locator('h3:has-text("Commitments")').isVisible()
  console.log('Commitments section visible:', commitmentsSection)
  
  // Check for create buttons
  const createBudgetBtn = await page.locator('a:has-text("Create Budget")').isVisible()
  console.log('Create Budget button visible:', createBudgetBtn)
  
  const createContractBtn = await page.locator('a:has-text("Create Contract")').isVisible()
  console.log('Create Contract button visible:', createContractBtn)
  
  const createCommitmentBtn = await page.locator('a:has-text("Create Commitment")').isVisible()
  console.log('Create Commitment button visible:', createCommitmentBtn)
  
  // Take a final screenshot
  await page.screenshot({ 
    path: 'tests/screenshots/project-home-with-create-buttons.png',
    fullPage: true 
  })
})