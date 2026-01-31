import { test, expect } from '@playwright/test'

/**
 * Quick Mobile Responsiveness Check
 * Fast test to verify key pages work on mobile
 */

test.use({ baseURL: 'http://localhost:3000' })

const MOBILE = { width: 375, height: 667 }
const DESKTOP = { width: 1920, height: 1080 }

test.describe('Quick Mobile Check', () => {
  test.setTimeout(120000) // 2 minutes per test
  test('Profile page - mobile vs desktop', async ({ page }) => {
    // Login
    await page.goto('/dev-login?email=test@example.com&password=testpassword123', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })
    await page.waitForURL('/', { timeout: 30000 })

    // Test mobile
    await page.setViewportSize(MOBILE)
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const mobileOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(mobileOverflow, 'Mobile: No horizontal overflow').toBe(false)

    await page.screenshot({
      path: 'tests/screenshots/profile-mobile.png',
      fullPage: true
    })

    // Test desktop
    await page.setViewportSize(DESKTOP)
    await page.waitForTimeout(1000)

    const desktopOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(desktopOverflow, 'Desktop: No horizontal overflow').toBe(false)

    await page.screenshot({
      path: 'tests/screenshots/profile-desktop.png'
    })

    console.log('✅ Profile page responsive on both mobile and desktop')
  })

  test('Project Home - mobile vs desktop', async ({ page }) => {
    await page.goto('/dev-login?email=test@example.com&password=testpassword123', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })
    await page.waitForURL('/', { timeout: 30000 })

    // Mobile
    await page.setViewportSize(MOBILE)
    await page.goto('/60/home', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const mobileOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(mobileOverflow, 'Mobile: No horizontal overflow').toBe(false)

    await page.screenshot({
      path: 'tests/screenshots/project-home-mobile.png',
      fullPage: true
    })

    // Desktop
    await page.setViewportSize(DESKTOP)
    await page.waitForTimeout(1000)

    const desktopOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(desktopOverflow, 'Desktop: No horizontal overflow').toBe(false)

    await page.screenshot({
      path: 'tests/screenshots/project-home-desktop.png'
    })

    console.log('✅ Project Home responsive on both mobile and desktop')
  })

  test('Budget page - mobile vs desktop', async ({ page }) => {
    await page.goto('/dev-login?email=test@example.com&password=testpassword123', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })
    await page.waitForURL('/', { timeout: 30000 })

    // Mobile
    await page.setViewportSize(MOBILE)
    await page.goto('/60/budget', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const mobileOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(mobileOverflow, 'Mobile: No horizontal overflow').toBe(false)

    await page.screenshot({
      path: 'tests/screenshots/budget-mobile.png',
      fullPage: true
    })

    // Desktop
    await page.setViewportSize(DESKTOP)
    await page.waitForTimeout(1000)

    const desktopOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(desktopOverflow, 'Desktop: No horizontal overflow').toBe(false)

    await page.screenshot({
      path: 'tests/screenshots/budget-desktop.png'
    })

    console.log('✅ Budget page responsive on both mobile and desktop')
  })
})
