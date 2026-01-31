import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'chat-rag-e2e.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  outputDir: './test-results',
});
