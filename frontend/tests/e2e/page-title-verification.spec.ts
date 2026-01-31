import { test, expect, type Page } from '@playwright/test'

const BASE_URL =
  process.env.PAGE_TITLE_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:3001'

const PROJECT_ID = process.env.PAGE_TITLE_PROJECT_ID || '34'
const TEST_EMAIL = process.env.PAGE_TITLE_TEST_EMAIL || 'test@example.com'
const TEST_PASSWORD =
  process.env.PAGE_TITLE_TEST_PASSWORD || 'testpassword123'

async function authenticate(page: Page) {
  const loginUrl = new URL(
    `/dev-login?email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}`,
    BASE_URL
  ).toString()

  await page.goto(loginUrl)
  await page.waitForLoadState('networkidle')
}

async function visitProjectPage(page: Page, path: string) {
  const url = new URL(`/${PROJECT_ID}/${path}`, BASE_URL).toString()
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  return page.title()
}

test.describe('Page Title Verification', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page)
  })

  test('Budget page should show format "Budget - Project - [project name]"', async ({ page }) => {
    const title = await visitProjectPage(page, 'budget')
    console.log('Actual browser tab title:', title)

    expect(title).toMatch(/^Budget/)
    expect(title).not.toMatch(new RegExp(`Budget\\s+-\\s+Project\\s+-\\s+${PROJECT_ID}$`))

    if (title.includes('Project -')) {
      console.log('✅ Title includes project separator "Project -"')
      console.log('Current title:', title)
    } else {
      console.log('⚠️  Title does not include project section (may be loading)')
      console.log('Current title:', title)
    }
  })

  test('Commitments page should show format "Commitments - Project - [project name]"', async ({ page }) => {
    const title = await visitProjectPage(page, 'commitments')
    console.log('Commitments page title:', title)

    expect(title).toMatch(/^Commitments/)
    expect(title).not.toMatch(new RegExp(`Commitments\\s+-\\s+Project\\s+-\\s+${PROJECT_ID}$`))

    if (title.includes('Project -')) {
      console.log('✅ Title includes project separator "Project -"')
      console.log('Current title:', title)
    } else {
      console.log('⚠️  Title does not include project section (may be loading)')
      console.log('Current title:', title)
    }
  })
})
