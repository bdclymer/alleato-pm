import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local file in frontend directory
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// Use BASE_URL from .env.local or fallback to localhost
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000, // Increased for form interactions
  expect: {
    timeout: 10000 // Increased for slower elements
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/report.json' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'on', // Always capture screenshots for verification
    video: 'on',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'debug',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'no-auth',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: /sidebar-collapse-verification\.spec\.ts/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
