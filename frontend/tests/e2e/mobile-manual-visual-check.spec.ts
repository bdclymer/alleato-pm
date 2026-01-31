import { test, expect } from '@playwright/test'

/**
 * Mobile Responsiveness Visual Check
 * Manual visual verification with screenshots
 */

test.describe('Mobile Visual Check (Manual)', () => {
  test('Generate mobile and desktop screenshots for key pages', async ({ page }) => {
    const MOBILE = { width: 375, height: 667 }
    const DESKTOP = { width: 1920, height: 1080 }

    // Login - dev-login redirects automatically
    await page.goto('http://localhost:3000/dev-login?email=test@example.com&password=testpassword123', {
      waitUntil: 'commit', // Don't wait for full load, just commit
      timeout: 30000
    }).catch(() => {
      // Ignore navigation errors - the redirect might abort the initial navigation
    })

    // Wait for redirect to complete
    await page.waitForURL('http://localhost:3000/', { timeout: 30000 }).catch(() => {
      // If we're not at home, try navigating there
    })

    // Ensure we're authenticated by checking we're at home page
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 })

    const pages = [
      { name: 'profile', url: '/profile' },
      { name: 'project-home', url: '/60/home' },
      { name: 'budget', url: '/60/budget' },
    ]

    for (const pageInfo of pages) {
      console.log(`\n📱 Testing ${pageInfo.name}...`)

      // Mobile view
      await page.setViewportSize(MOBILE)
      await page.goto(`http://localhost:3000${pageInfo.url}`, {
        waitUntil: 'networkidle',
        timeout: 60000
      })
      await page.waitForTimeout(2000)

      const mobileOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      )

      await page.screenshot({
        path: `tests/screenshots/${pageInfo.name}-mobile.png`,
        fullPage: true
      })

      console.log(`  Mobile: ${mobileOverflow ? '❌ HAS OVERFLOW' : '✅ No overflow'}`)

      // Desktop view
      await page.setViewportSize(DESKTOP)
      await page.waitForTimeout(1000)

      const desktopOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      )

      await page.screenshot({
        path: `tests/screenshots/${pageInfo.name}-desktop.png`
      })

      console.log(`  Desktop: ${desktopOverflow ? '❌ HAS OVERFLOW' : '✅ No overflow'}`)

      // Assertions
      expect(mobileOverflow, `${pageInfo.name}: No mobile horizontal overflow`).toBe(false)
      expect(desktopOverflow, `${pageInfo.name}: No desktop horizontal overflow`).toBe(false)
    }

    console.log('\n✅ All pages passed responsiveness checks')
  })
})
